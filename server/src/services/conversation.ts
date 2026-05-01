import { db } from "../lib/prisma.js";

export async function createConversation(userId: string, title?: string) {
  return db.conversation.create({
    data: { userId, title },
    select: { id: true, title: true, createdAt: true },
  });
}

export async function getConversations(userId: string) {
  return db.conversation.findMany({
    where: { userId },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getConversation(conversationId: string) {
  return db.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>,
) {
  return db.message.create({
    data: { conversationId, role, content, metadata: metadata ?? undefined },
  });
}
