import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessageChunk, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
// import { ChatAnthropic } from '@langchain/anthropic';
import type { RunnableConfig } from '@langchain/core/runnables';
import { env } from '@lib/config.js';
import { ragSearchTool } from './tools/ragSearch.js';
import { getCheckpointer } from './checkpointer.js';

// ---- DeepSeek ----
const model = new ChatDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY,
  model: env.DEEPSEEK_MODEL,
  configuration: { baseURL: env.DEEPSEEK_BASE_URL },
  streaming: true,
  modelKwargs: {
    thinking: { type: 'disabled' },
  },
});
// model.streamV2

// ---- Anthropic (via DeepSeek) ----
// const model = new ChatAnthropic({
//   apiKey: env.ANTHROPIC_API_KEY,
//   model: env.ANTHROPIC_MODEL,
//   anthropicApiUrl: env.ANTHROPIC_BASE_URL,
//   streaming: true,
//   thinking: { type: 'enabled', budget_tokens: 4000 },
// });

const SYSTEM_PROMPT = `你是一个 SaaS 模块查询助手。你可以使用 rag_search 工具搜索内部知识库中的文档。
请根据用户的问题提供准确、简洁的回答。
重点问题，如果你要调用工具，请直接调用，不要输出任何无关的文本。
如果有参考文档，请优先基于文档内容回答，并注明信息来源。
如果没有参考文档，请说不知道。`;

const modelWithTools = model.bindTools([ragSearchTool] as any);
const toolNode = new ToolNode([ragSearchTool] as any);

function withLogging(_name: string, fn: any): any {
  return async (state: any, config?: any) => {
    const result = await fn(state, config);
    return result;
  };
}

async function agentNode(
  state: typeof MessagesAnnotation.State,
  config?: RunnableConfig,
): Promise<Partial<typeof MessagesAnnotation.State>> {
  const response = await modelWithTools.invoke(
    [new SystemMessage(SYSTEM_PROMPT), ...state.messages],
    config,
  );
  return { messages: [response] };
}

function shouldContinue(state: typeof MessagesAnnotation.State): 'tools' | typeof END {
  const lastMsg = state.messages[state.messages.length - 1];
  if (lastMsg instanceof AIMessageChunk && lastMsg.tool_calls?.length) {
    return 'tools';
  }
  return END;
}

async function getGraph(): Promise<any> {
  const checkpointer = await getCheckpointer();
  return new StateGraph(MessagesAnnotation)
    .addNode('agent', withLogging('agent', agentNode))
    .addNode(
      'tools',
      withLogging('tools', (state: any, config?: any) => toolNode.invoke(state, config)),
    )
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')
    .compile({ checkpointer: checkpointer });
}

export type AgentState = typeof MessagesAnnotation.State;

// Lazy-compiled graph for LangGraph CLI
let _graph: any = null;
export async function graph(): Promise<any> {
  if (!_graph) _graph = await getGraph();
  return _graph;
}

export async function runAgentStream(threadId: string, userMessage: string) {
  const g = await getGraph();
  return g.stream(
    { messages: [new HumanMessage(userMessage)] },
    { configurable: { thread_id: threadId }, streamMode: 'messages' as const },
  );
}

export async function getMessages(threadId: string): Promise<AgentState['messages']> {
  const checkpointer = await getCheckpointer();
  const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId } });
  return (tuple?.checkpoint.channel_values as AgentState | undefined)?.messages ?? [];
}
