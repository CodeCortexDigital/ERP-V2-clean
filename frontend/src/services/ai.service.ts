import api, { API_BASE_URL } from './api';
import { API_ENDPOINTS } from './apiEndpoints';

// The caller's role and school are derived server-side from the auth token.

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  offline?: boolean;
  feedback?: 1 | -1 | null;
}

export interface AiChatResponse {
  reply: string;
  offline: boolean;
  conversation_id: string;
  message_id: string;
}

export interface AiConversation {
  id: string;
  title: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export type AiStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'tool_start'; name: string; label: string }
  | { type: 'tool_end'; name: string; ok: boolean }
  | ({ type: 'done' } & AiChatResponse)
  | { type: 'error'; message: string };

export class AiRequestError extends Error {
  /** `explained`: the server sent a user-facing reason (limits, permissions…). */
  constructor(message: string, public status: number, public explained = false) {
    super(message);
  }
}

export const sendAiMessage = async (message: string, conversationId?: string): Promise<AiChatResponse> => {
  const res = await api.post<AiChatResponse>(API_ENDPOINTS.AI_CHAT, {
    message,
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });
  return res.data;
};

/** Stream an answer over Server-Sent Events, calling `onEvent` for each event. */
export async function streamAiMessage(
  message: string,
  conversationId: string | undefined,
  onEvent: (event: AiStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('access_token');
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  const res = await fetch(`${base}ai/chat/stream/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ message, ...(conversationId ? { conversation_id: conversationId } : {}) }),
    signal,
  });
  if (!res.ok || !res.body) {
    let detail = 'The assistant is unavailable right now.';
    let explained = false;
    try {
      const body = await res.json();
      if (body?.error && res.status < 500) {
        detail = body.error;
        explained = true;
      }
    } catch { /* not JSON */ }
    throw new AiRequestError(detail, res.status, explained);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = chunk.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('\n');
      if (data) onEvent(JSON.parse(data) as AiStreamEvent);
    }
  }
}

export const listConversations = async (): Promise<AiConversation[]> =>
  (await api.get<AiConversation[]>('/ai/conversations/')).data;

export const getConversation = async (id: string): Promise<AiConversation> =>
  (await api.get<AiConversation>(`/ai/conversations/${id}/`)).data;

export const deleteConversation = async (id: string): Promise<void> => {
  await api.delete(`/ai/conversations/${id}/`);
};

export const sendFeedback = async (messageId: string, rating: 1 | -1 | null): Promise<void> => {
  await api.post(`/ai/messages/${messageId}/feedback/`, { rating });
};
