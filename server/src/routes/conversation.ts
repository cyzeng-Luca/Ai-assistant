import { Router } from "express";
import { agentGraph } from "../agent/graph.js";
import * as conv from "../services/conversation.js";

export const conversationRouter = Router();

const MOCK_USER_ID = "default-user";

// POST /api/conversations — 新建会话
conversationRouter.post("/", async (_req, res) => {
  const conversation = await conv.createConversation(MOCK_USER_ID);
  res.json(conversation);
});

// GET /api/conversations — 会话列表
conversationRouter.get("/", async (_req, res) => {
  const list = await conv.getConversations(MOCK_USER_ID);
  res.json(list);
});

// GET /api/conversations/:id — 会话详情（含历史消息）
conversationRouter.get("/:id", async (req, res) => {
  const conversation = await conv.getConversation(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: "会话不存在" });
    return;
  }
  res.json(conversation);
});

// POST /api/conversations/:id/messages — 发送消息，SSE 流式返回
conversationRouter.post("/:id/messages", async (req, res) => {
  const { content } = req.body as { content?: string };
  if (!content?.trim()) {
    res.status(400).json({ error: "消息内容不能为空" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  function send(type: string, payload: Record<string, unknown>) {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  }

  const sendError = (message: string) => {
    send("error", { message });
    res.end();
  };

  try {
    // 存储用户消息
    await conv.createMessage(req.params.id, "user", content);

    // 获取历史消息作为上下文
    const conversation = await conv.getConversation(req.params.id);
    const history =
      conversation?.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })) ?? [];

    // 运行 Agent
    const result = await agentGraph.invoke({
      question: content,
      history: history.slice(0, -1), // 去掉刚插入的用户消息
      needRag: false,
      sources: [],
      answer: "",
    });

    // RAG 触发通知
    if (result.needRag && result.sources.length > 0) {
      send("rag_triggered", { sources: result.sources });
    }

    // 逐字发送 answer
    for (const char of result.answer) {
      send("token", { content: char });
    }

    // 存储助手回复
    const saved = await conv.createMessage(req.params.id, "assistant", result.answer, {
      needRag: result.needRag,
    });

    send("done", { messageId: saved.id });
  } catch (err) {
    sendError("生成回答失败，请稍后重试");
  } finally {
    res.end();
  }
});
