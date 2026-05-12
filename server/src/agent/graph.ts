import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import type { RunnableConfig } from '@langchain/core/runnables';
import { env } from '@lib/config.js';
import { getCheckpointer } from './checkpointer.js';
import { getVisibleTools, isCategoryNode } from './tools/index.js';

// ---- Model ----
const model = new ChatDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY,
  model: env.DEEPSEEK_MODEL,
  configuration: { baseURL: env.DEEPSEEK_BASE_URL },
  streaming: true,
  modelKwargs: { thinking: { type: 'disabled' } },
});

// ---- State ----
const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  activatedPaths: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
});

// ---- System Prompt ----
const SYSTEM_PROMPT = `你是一个智能助手，可以通过工具获取数据来回答用户问题。

## 核心行为准则（必须遵守）

### 关于工具调用的绝对规则
- ⚠️ **如果需要调用工具，你的响应必须是一个纯工具调用，不包含任何文字内容**
- ⚠️ **禁止在工具调用前后添加任何解释性文字**（如"好的"、"让我来..."、"根据查询结果..."）
- ⚠️ **不要输出任何自然语言，直到你有足够的数据回答用户**

### 正确示例：
用户：北京今天天气怎么样？
助手：（直接调用 get_weather 工具，不输出任何文字）

用户：你好
助手：你好！有什么我可以帮助你的？

### 错误示例：
❌ 用户：北京天气
❌ 助手：好的，让我查询北京天气 → 然后调用工具
❌ 助手：我来帮您查询 → 调用工具

## 工作流程
1. **判断是否需要工具**：如果能直接回答，输出文字；否则进入步骤2
2. **纯工具调用**：直接调用工具，不输出任何文字
3. **基于数据回答**：获取工具返回结果后，再输出文字回答

## 工具层级说明
- 工具按层级组织，从根工具开始逐步深入
- 可以一次调用多个工具（包括跨子类的工具）

记住：**调用工具时 = 不输出文字；输出文字时 = 不调用工具。两者互斥。**`;

// ---- Logging ----
function withLogging(_name: string, fn: any): any {
  return async (state: any, config?: any) => {
    const result = await fn(state, config);
    return result;
  };
}

// ---- Nodes ----

async function agentNode(
  state: typeof AgentStateAnnotation.State,
  config?: RunnableConfig,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const visibleTools = getVisibleTools(state.activatedPaths);
  const modelWithTools = model.bindTools(visibleTools);
  const response = await modelWithTools.invoke(
    [new SystemMessage(SYSTEM_PROMPT), ...state.messages],
    config,
  );
  return { messages: [response] };
}

async function executeToolsNode(
  state: typeof AgentStateAnnotation.State,
  config?: RunnableConfig,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const visibleTools = getVisibleTools(state.activatedPaths);
  const toolNode = new ToolNode(visibleTools);
  const result = await toolNode.invoke(state, config);

  // 激活被调用的分类工具，解锁其子工具
  const lastMsg = state.messages[state.messages.length - 1];
  const toolCalls: { name: string }[] = lastMsg?.tool_calls ?? [];
  const newPaths = [...state.activatedPaths];
  for (const tc of toolCalls) {
    if (isCategoryNode(tc.name) && !newPaths.includes(tc.name)) {
      newPaths.push(tc.name);
    }
  }

  return { ...result, activatedPaths: newPaths };
}

// ---- Routing ----

function shouldContinue(state: typeof AgentStateAnnotation.State): 'tools' | typeof END {
  const lastMsg = state.messages[state.messages.length - 1];
  if ('tool_calls' in lastMsg && lastMsg.tool_calls?.length) {
    return 'tools';
  }
  return END;
}

// ---- Graph ----

async function getGraph(): Promise<any> {
  const checkpointer = await getCheckpointer();
  return new StateGraph(AgentStateAnnotation)
    .addNode('agent', withLogging('agent', agentNode))
    .addNode('tools', withLogging('tools', executeToolsNode))
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')
    .compile({ checkpointer: checkpointer });
}

export type AgentState = typeof AgentStateAnnotation.State;

let _graph: any = null;
export async function graph(): Promise<any> {
  if (!_graph) _graph = await getGraph();
  return _graph;
}

export async function runAgentStream(threadId: string, userMessage: string, signal?: AbortSignal) {
  const g = await getGraph();
  return g.stream(
    { messages: [new HumanMessage(userMessage)] },
    { configurable: { thread_id: threadId }, streamMode: 'messages' as const, signal },
  );
}

export async function getMessages(threadId: string): Promise<AgentState['messages']> {
  const checkpointer = await getCheckpointer();
  const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId } });
  return (
    (tuple?.checkpoint.channel_values as typeof AgentStateAnnotation.State | undefined)?.messages ??
    []
  );
}
