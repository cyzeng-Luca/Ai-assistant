import { Router } from 'express';
import { AIMessage, AIMessageChunk, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { getMessages, runAgentStream } from '@agent/graph.js';
import { getCheckpointer } from '@agent/checkpointer.js';
import * as conv from '@services/conversation.js';
import { generateTitle } from '@services/llm.js';
import { v4 as uuid } from 'uuid';
import { llmLimiter } from '@middleware/rateLimit.js';
import { conversationGuard } from '@middleware/conversationGuard.js';
import { logger } from '@lib/logger.js';

function extractChunkText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (b): b is { type: 'text'; text: string } | { type: 'text_delta'; text: string } =>
          b.type === 'text' || b.type === 'text_delta',
      )
      .map((b) => b.text)
      .join('');
  }
  return '';
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }
  return '';
}

/** Convert LangChain checkpoint messages to frontend-safe format */
function formatMessages(
  lcMessages: any[],
): { id: string; role: 'user' | 'assistant'; content: string }[] {
  const filter = lcMessages.filter((m) => {
    if (m instanceof ToolMessage) return false;
    if (
      (m instanceof AIMessage || m instanceof AIMessageChunk) &&
      (m.tool_calls?.length || (m as any).tool_call_chunks?.length)
    )
      return false;
    return m instanceof HumanMessage || m instanceof AIMessage || m instanceof AIMessageChunk;
  });
  const result = filter.map(
    (m) =>
      ({
        id: m.id ?? uuid(),
        role: m instanceof HumanMessage ? 'user' : 'assistant',
        content: extractText(m.content),
      }) satisfies { id: string; role: 'user' | 'assistant'; content: string },
  );
  return result;
}

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

// GET /api/conversations/:id — 会话详情（含历史消息，从 checkpoint 读取）
conversationRouter.get('/:id', conversationGuard, async (req, res) => {
  const conversation = await conv.getConversationMeta(req.params.id as string);

  const messages = await getMessages(req.params.id as string);
  res.json({
    id: (conversation as { id: string }).id,
    title: (conversation as { title: string | null }).title,
    messages: formatMessages(messages),
  });
});

// DELETE /api/conversations/:id — 删除会话
conversationRouter.delete('/:id', conversationGuard, async (req, res) => {
  await conv.deleteConversation(req.params.id as string);
  const cp = await getCheckpointer();
  await cp.deleteThread(req.params.id as string);
  res.json({ success: true });
});

// PATCH /api/conversations/:id/title — 生成标题（LLM 总结）
conversationRouter.patch('/:id/title', conversationGuard, async (req, res) => {
  try {
    const { content } = req.body as { content?: string };
    if (!content?.trim()) {
      res.status(400).json({ error: '消息内容不能为空' });
      return;
    }
    const title = await generateTitle(content);
    const updated = await conv.updateConversationTitle(req.params.id as string, title);
    res.json(updated);
  } catch {
    res.status(500).json({ error: '生成标题失败' });
  }
});

// POST /api/conversations/:id/messages — 发送消息，SSE 流式返回
// checkpoint 自动管理消息历史，无需手动存取
conversationRouter.post('/:id/messages', llmLimiter, conversationGuard, async (req, res) => {
  const body = req.body as { content?: string };
  const content = (body.content ?? '').trim();
  if (!content) {
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

  const threadId = req.params.id as string;
  logger.info({ threadId }, 'Calling LLM');

  const controller = new AbortController();
  req.on('close', () => {
    logger.info({ threadId }, 'Client disconnected, aborting LLM stream');
    controller.abort();
  });

  try {
    const stream = await runAgentStream(threadId, content, controller.signal);
    let fullResponse = '';

    for await (const [chunk] of stream) {
      if (chunk instanceof ToolMessage) continue;
      if ('tool_call_chunks' in chunk && (chunk.tool_call_chunks as unknown[]).length) continue;
      const text = extractChunkText(chunk.content);
      if (text) {
        fullResponse += text;
        send('token', { content: text });
      }
    }

    send('done', { content: fullResponse });
  } catch (error) {
    if (controller.signal.aborted) {
      logger.info({ threadId }, 'LLM stream aborted (client disconnected)');
    } else {
      logger.error({ err: error, threadId }, 'LLM call failed');
    }
  } finally {
    res.end();
  }
});
