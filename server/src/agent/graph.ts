import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import type { RunnableConfig } from '@langchain/core/runnables';
import { env } from '../config.js';
import { ragSearchTool } from './tools/ragSearch.js';
import { getCheckpointer } from './checkpointer.js';

const model = new ChatDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY,
  model: env.DEEPSEEK_MODEL,
  configuration: { baseURL: env.DEEPSEEK_BASE_URL },
  streaming: true,
});

const SYSTEM_PROMPT = `你是一个 SaaS 模块查询助手。你可以使用 rag_search 工具搜索内部知识库中的文档。
请根据用户的问题提供准确、简洁的回答。
如果有参考文档，请优先基于文档内容回答，并注明信息来源。
如果没有参考文档，请说不知道。`;

const modelWithTools = model.bindTools([ragSearchTool]);
const toolNode = new ToolNode([ragSearchTool]);

function withLogging(name: string, fn: any): any {
  return async (state: any, config?: any) => {
    const result = await fn(state, config);
    return result;
  };
}

async function agentNode(
  state: typeof MessagesAnnotation.State,
  config?: RunnableConfig,
): Promise<Partial<typeof MessagesAnnotation.State>> {
  const onToken = config?.configurable?.onToken as ((t: string) => void) | undefined;

  let response: AIMessageChunk = new AIMessageChunk({ content: '' });
  const stream = await modelWithTools.stream([new SystemMessage(SYSTEM_PROMPT), ...state.messages]);

  for await (const chunk of stream) {
    response = response.concat(chunk);
    // 工具调用时 chunk.content 为空，自然不会推流中间状态
    if (onToken && typeof chunk.content === 'string' && chunk.content) {
      onToken(chunk.content);
    }
  }

  return { messages: [response] };
}

function shouldContinue(state: typeof MessagesAnnotation.State): 'tools' | typeof END {
  const lastMsg = state.messages[state.messages.length - 1];
  if (
    (lastMsg instanceof AIMessage || lastMsg instanceof AIMessageChunk) &&
    lastMsg.tool_calls?.length
  ) {
    return 'tools';
  }
  return END;
}

async function getGraph() {
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
    .compile({ checkpointer: checkpointer as any });
}

export type AgentState = typeof MessagesAnnotation.State;

// Lazy-compiled graph for LangGraph CLI
let _graph: Awaited<ReturnType<typeof getGraph>> | null = null;
export async function graph() {
  if (!_graph) _graph = await getGraph();
  return _graph;
}

export async function runAgentStream(
  threadId: string,
  userMessage: string,
  callbacks: { onToken: (token: string) => void },
): Promise<AgentState> {
  const graph = await getGraph();
  return graph.invoke(
    { messages: [new HumanMessage(userMessage)] },
    { configurable: { thread_id: threadId, onToken: callbacks.onToken } },
  );
}

export async function getMessages(threadId: string): Promise<AgentState['messages']> {
  const checkpointer = await getCheckpointer();
  const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId } });
  return (tuple?.checkpoint.channel_values as AgentState | undefined)?.messages ?? [];
}
