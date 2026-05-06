import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import type { RunnableConfig } from '@langchain/core/runnables';
import { env } from '../config.js';
import { ragSearchTool } from './tools/ragSearch.js';

const model = new ChatDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY,
  model: env.DEEPSEEK_MODEL,
  configuration: { baseURL: env.DEEPSEEK_BASE_URL },
  streaming: true,
});

const SYSTEM_PROMPT = `你是一个 SaaS 模块查询助手。你可以使用 rag_search 工具搜索内部知识库中的文档。
请根据用户的问题提供准确、简洁的回答。
如果有参考文档，请优先基于文档内容回答，并注明信息来源。
如果没有参考文档，请基于你的知识诚实回答。`;

const modelWithTools = model.bindTools([ragSearchTool]);
const toolNode = new ToolNode([ragSearchTool]);

async function agentNode(
  state: typeof MessagesAnnotation.State,
  config?: RunnableConfig,
): Promise<Partial<typeof MessagesAnnotation.State>> {
  const onToken = config?.configurable?.onToken as ((t: string) => void) | undefined;

  const response = await modelWithTools.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages,
  ]);

  // Only stream final answers (not intermediate tool-calling responses)
  const content = typeof response.content === 'string' ? response.content : '';
  if (onToken && content && !response.tool_calls?.length) {
    onToken(content);
  }

  return { messages: [response] };
}

function shouldContinue(state: typeof MessagesAnnotation.State): 'tools' | typeof END {
  const lastMsg = state.messages[state.messages.length - 1];
  if (lastMsg instanceof AIMessage && lastMsg.tool_calls?.length) {
    return 'tools';
  }
  return END;
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode('agent', agentNode)
  .addNode('tools', toolNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue)
  .addEdge('tools', 'agent');

const agentGraph = workflow.compile();

export type AgentState = typeof MessagesAnnotation.State;

export async function runAgent(state: AgentState): Promise<AgentState> {
  return agentGraph.invoke(state);
}

export async function runAgentStream(
  state: AgentState,
  callbacks: { onToken: (token: string) => void },
): Promise<AgentState> {
  return agentGraph.invoke(state, {
    configurable: { onToken: callbacks.onToken },
  });
}
