export interface User {
  id: string;
  username: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  messages?: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}
