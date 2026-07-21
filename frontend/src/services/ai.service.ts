import api from './api';
import { API_ENDPOINTS } from './apiEndpoints';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiChatResponse {
  reply: string;
  offline?: boolean;
}

export const sendAiMessage = async (messages: ChatMessage[], role?: string): Promise<AiChatResponse> => {
  const body: Record<string, any> = { messages };
  if (role && role !== 'admin') body.role = role;
  const res = await api.post<AiChatResponse>(API_ENDPOINTS.AI_CHAT, body);
  return res.data;
};
