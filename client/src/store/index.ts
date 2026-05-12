import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Conversation, Message } from '@/types';
import * as api from '@services/api';

interface AppStore {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;

  conversations: Conversation[];
  fetchConversations: () => Promise<void>;

  messagesMap: Record<string, Message[]>;
  messagesLoading: Record<string, boolean>;
  loadMessages: (conversationId: string) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, conversations: [], messagesMap: {}, messagesLoading: {} }),

      conversations: [],
      fetchConversations: async () => {
        const conversations = await api.getConversations();
        set({ conversations });
      },

      messagesMap: {},
      messagesLoading: {},
      loadMessages: async (conversationId) => {
        set((s) => ({ messagesLoading: { ...s.messagesLoading, [conversationId]: true } }));
        try {
          const conv = await api.getConversation(conversationId);
          set((s) => ({
            messagesMap: { ...s.messagesMap, [conversationId]: conv.messages ?? [] },
            messagesLoading: { ...s.messagesLoading, [conversationId]: false },
          }));
        } catch {
          set((s) => ({
            messagesLoading: { ...s.messagesLoading, [conversationId]: false },
          }));
        }
      },
      addMessage: (conversationId, message) =>
        set((s) => ({
          messagesMap: {
            ...s.messagesMap,
            [conversationId]: [...(s.messagesMap[conversationId] ?? []), message],
          },
        })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
