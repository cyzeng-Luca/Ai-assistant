import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppStore } from './index';

const mockGetConversations = vi.fn();
const mockGetConversation = vi.fn();

vi.mock('@services/api', () => ({
  getConversations: async () => mockGetConversations(),
  getConversation: async (id: string) => mockGetConversation(id),
}));

const initialState = {
  user: null,
  conversations: [],
  messagesMap: {},
  messagesLoading: {},
};

beforeEach(() => {
  useAppStore.setState(initialState);
  vi.clearAllMocks();
});

describe('auth actions', () => {
  it('setUser updates user', () => {
    useAppStore.getState().setUser({ id: '1', username: 'zeng' });
    expect(useAppStore.getState().user).toEqual({ id: '1', username: 'zeng' });
  });

  it('logout clears user and conversations', () => {
    useAppStore.setState({
      user: { id: '1', username: 'zeng' },
      conversations: [{ id: '1', title: 't' }],
      messagesMap: { '1': [{ id: 'm1', role: 'user', content: 'hi' }] },
      messagesLoading: { '1': true },
    });
    useAppStore.getState().logout();
    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().conversations).toEqual([]);
    expect(useAppStore.getState().messagesMap).toEqual({});
    expect(useAppStore.getState().messagesLoading).toEqual({});
  });
});

describe('fetchConversations', () => {
  it('loads conversations into state', async () => {
    const list = [{ id: '1', title: 'hello' }];
    mockGetConversations.mockResolvedValue(list);

    await useAppStore.getState().fetchConversations();

    expect(useAppStore.getState().conversations).toEqual(list);
  });
});

describe('loadMessages', () => {
  it('sets loading and loads messages', async () => {
    const msgs = [{ id: 'm1', role: 'user' as const, content: 'hi' }];
    mockGetConversation.mockResolvedValue({ id: '1', title: 't', messages: msgs });

    const promise = useAppStore.getState().loadMessages('1');
    expect(useAppStore.getState().messagesLoading['1']).toBe(true);

    await promise;
    expect(useAppStore.getState().messagesMap['1']).toEqual(msgs);
    expect(useAppStore.getState().messagesLoading['1']).toBe(false);
  });

  it('clears loading on error', async () => {
    mockGetConversation.mockRejectedValue(new Error('boom'));

    await useAppStore.getState().loadMessages('1');
    expect(useAppStore.getState().messagesLoading['1']).toBe(false);
    expect(useAppStore.getState().messagesMap['1']).toBeUndefined();
  });
});

describe('addMessage', () => {
  it('appends message to the right conversation', () => {
    useAppStore.getState().addMessage('1', { id: 'm1', role: 'user', content: 'hi' });
    useAppStore.getState().addMessage('1', { id: 'm2', role: 'assistant', content: 'hello' });
    useAppStore.getState().addMessage('2', { id: 'm3', role: 'user', content: 'other' });

    expect(useAppStore.getState().messagesMap['1']).toHaveLength(2);
    expect(useAppStore.getState().messagesMap['1'][0].id).toBe('m1');
    expect(useAppStore.getState().messagesMap['2']).toHaveLength(1);
  });
});
