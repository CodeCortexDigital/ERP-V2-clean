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

export const sendAiMessage = async (messages: ChatMessage[]): Promise<AiChatResponse> => {
  const res = await api.post<AiChatResponse>(API_ENDPOINTS.AI_CHAT, { messages });
  return res.data;
};
