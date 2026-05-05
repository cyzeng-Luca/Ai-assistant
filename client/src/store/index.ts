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

  messages: Message[];
  messagesLoading: boolean;
  loadMessages: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, conversations: [] }),

      conversations: [],
      fetchConversations: async () => {
        const conversations = await api.getConversations();
        set({ conversations });
      },

      messages: [],
      messagesLoading: false,
      loadMessages: async (conversationId) => {
        set({ messagesLoading: true });
        try {
          const conv = await api.getConversation(conversationId);
          set({ messages: conv.messages ?? [], messagesLoading: false });
        } catch {
          set({ messagesLoading: false });
        }
      },
      addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
