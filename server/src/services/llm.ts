import { ChatDeepSeek } from '@langchain/deepseek';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { env } from '@lib/config.js';

const model = new ChatDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY,
  model: env.DEEPSEEK_MODEL,
  configuration: { baseURL: env.DEEPSEEK_BASE_URL },
  modelKwargs: {
    thinking: { type: 'disabled' },
  },
});

const TITLE_SYSTEM_PROMPT =
  '你是一个标题生成助手。请根据用户的第一条消息，生成一个简洁的对话标题（不超过15个字）。只返回标题文本，不要添加任何额外内容。';

export async function generateTitle(firstMessage: string): Promise<string> {
  const payload = [new SystemMessage(TITLE_SYSTEM_PROMPT), new HumanMessage(firstMessage)];

  const res = await model.invoke(payload);

  const title = typeof res.content === 'string' ? res.content.trim() : firstMessage.slice(0, 15);
  return title || firstMessage.slice(0, 15);
}
