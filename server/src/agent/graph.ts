import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { retrieveContext } from './rag.js';
import { streamAnswer } from '../services/llm.js';

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  history: Annotation<{ role: string; content: string }[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  needRag: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
  sources: Annotation<string[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  answer: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});

type AgentState = typeof StateAnnotation.State;

const SAAS_KEYWORDS = [
  '模块',
  '服务',
  '接口',
  'API',
  '功能',
  '系统',
  '平台',
  'module',
  'service',
  'api',
  'function',
  'system',
  'platform',
  '数据',
  '配置',
  '部署',
  '集成',
  '认证',
  '权限',
];

export function shouldUseRag(question: string): boolean {
  const q = question.toLowerCase();
  return SAAS_KEYWORDS.some((kw) => q.includes(kw.toLowerCase()));
}

function decideNode(state: AgentState): Partial<AgentState> {
  return { needRag: shouldUseRag(state.question) };
}

async function retrieveNode(state: AgentState): Promise<Partial<AgentState>> {
  const sources = await retrieveContext(state.question);
  return { sources };
}

async function generateNode(
  state: AgentState,
  config?: RunnableConfig,
): Promise<Partial<AgentState>> {
  const messages: { role: string; content: string }[] = [
    ...state.history,
    { role: 'user', content: state.question },
  ];

  const onToken = config?.configurable?.onToken as ((token: string) => void) | undefined;

  let answer = '';
  for await (const token of streamAnswer(messages, state.sources)) {
    answer += token;
    onToken?.(token);
  }

  return { answer };
}

const workflow = new StateGraph(StateAnnotation)
  .addNode('decide', decideNode)
  .addNode('retrieve', retrieveNode)
  .addNode('generate', generateNode)
  .addEdge(START, 'decide')
  .addConditionalEdges('decide', (state: AgentState) => (state.needRag ? 'retrieve' : 'generate'))
  .addEdge('retrieve', 'generate')
  .addEdge('generate', END);

const agentGraph = workflow.compile();

export type AgentInput = typeof StateAnnotation.State;
export type AgentOutput = typeof StateAnnotation.State;

/** 范式 1：非 SSE — 直接返回完整结果 */
export async function runAgent(state: AgentInput): Promise<AgentOutput> {
  return agentGraph.invoke(state);
}

/** 范式 2：SSE — 传入 onToken 回调，token 实时推送 */
export async function runAgentStream(
  state: AgentInput,
  callbacks: { onToken: (token: string) => void },
): Promise<AgentOutput> {
  return agentGraph.invoke(state, {
    configurable: { onToken: callbacks.onToken },
  });
}
