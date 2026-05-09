import { ChatDeepSeek } from '@langchain/deepseek';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { env } from '@lib/config.js';

const model = new ChatDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY,
  model: env.DEEPSEEK_MODEL,
  configuration: { baseURL: env.DEEPSEEK_BASE_URL },
  streaming: true,
  modelKwargs: {
    thinking: { type: 'disabled' },
  },
});

const SYSTEM_PROMPT = `你是一个 SaaS 模块查询助手。请根据用户的问题提供准确、简洁的回答。
如果有参考文档，请优先基于文档内容回答，并注明信息来源。
如果没有参考文档，请基于你的知识诚实回答。`;

export async function* streamAnswer(
  messages: { role: string; content: string }[],
  context?: string[],
): AsyncGenerator<string> {
  const systemMsg = context?.length
    ? `${SYSTEM_PROMPT}\n\n参考文档：\n${context.map((c, i) => `[${String(i + 1)}] ${c}`).join('\n')}`
    : SYSTEM_PROMPT;

  const payload = [
    new SystemMessage(systemMsg),
    ...messages.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
    ),
  ];

  const stream = await model.stream(payload);

  for await (const chunk of stream) {
    const content = typeof chunk.content === 'string' ? chunk.content : '';
    if (content) yield content;
  }
}

const TITLE_SYSTEM_PROMPT =
  '你是一个标题生成助手。请根据用户的第一条消息，生成一个简洁的对话标题（不超过15个字）。只返回标题文本，不要添加任何额外内容。';

export async function generateTitle(firstMessage: string): Promise<string> {
  const payload = [new SystemMessage(TITLE_SYSTEM_PROMPT), new HumanMessage(firstMessage)];

  const res = await model.invoke(payload);

  const title = typeof res.content === 'string' ? res.content.trim() : firstMessage.slice(0, 15);
  return title || firstMessage.slice(0, 15);
}
