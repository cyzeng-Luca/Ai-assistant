import { db } from '@lib/prisma.js';

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
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getConversationMeta(conversationId: string) {
  return db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, title: true, createdAt: true, userId: true },
  });
}

export async function deleteConversation(conversationId: string) {
  return db.conversation.delete({ where: { id: conversationId } });
}

export async function updateConversationTitle(conversationId: string, title: string) {
  return db.conversation.update({
    where: { id: conversationId },
    data: { title },
    select: { id: true, title: true },
  });
}
