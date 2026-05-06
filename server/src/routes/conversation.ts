import { Router } from 'express';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { runAgentStream } from '../agent/graph.js';
import * as conv from '../services/conversation.js';
import { generateTitle } from '../services/llm.js';

export const conversationRouter: Router = Router();

// POST /api/conversations — 新建会话
conversationRouter.post('/', async (req, res) => {
  const conversation = await conv.createConversation(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    req.userId!,
  );
  res.json(conversation);
});

// GET /api/conversations — 会话列表
conversationRouter.get('/', async (req, res) => {
  const list = await conv.getConversations(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    req.userId!,
  );
  res.json(list);
});

// GET /api/conversations/:id — 会话详情（含历史消息）
conversationRouter.get('/:id', async (req, res) => {
  const conversation = await conv.getConversation(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  res.json(conversation);
});

// PATCH /api/conversations/:id/title — 生成标题（LLM 总结）
conversationRouter.patch('/:id/title', async (req, res) => {
  try {
    const { content } = req.body as { content?: string };
    if (!content?.trim()) {
      res.status(400).json({ error: '消息内容不能为空' });
      return;
    }
    const title = await generateTitle(content);
    const updated = await conv.updateConversationTitle(req.params.id, title);
    res.json(updated);
  } catch {
    res.status(500).json({ error: '生成标题失败' });
  }
});

// POST /api/conversations/:id/messages — 发送消息，SSE 流式返回
conversationRouter.post('/:id/messages', async (req, res) => {
  const { content } = req.body as { content?: string };
  if (!content?.trim()) {
    res.status(400).json({ error: '消息内容不能为空' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  function send(type: string, payload: Record<string, unknown>) {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  }

  const sendError = (message: string) => {
    send('error', { message });
    res.end();
  };

  try {
    // 存储用户消息
    await conv.createMessage(req.params.id, 'user', content);

    // 获取历史消息作为上下文（去掉刚插入的用户消息）
    const conversation = await conv.getConversation(req.params.id);
    const history =
      conversation?.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })) ?? [];

    const pastHistory = history.slice(0, -1);

    // Build LangChain messages from history
    const lcMessages = pastHistory.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
    );
    const userMsg = new HumanMessage(content);

    const result = await runAgentStream(
      { messages: [...lcMessages, userMsg] },
      {
        onToken: (token) => {
          send('token', { content: token });
        },
      },
    );

    // Extract final answer from last AI message
    const lastMsg = result.messages.at(-1);
    const answer = typeof lastMsg?.content === 'string' ? lastMsg.content : '';

    // 存储助手回复
    const saved = await conv.createMessage(req.params.id, 'assistant', answer);

    send('done', { messageId: saved.id });
  } catch {
    sendError('生成回答失败，请稍后重试');
  } finally {
    res.end();
  }
});
