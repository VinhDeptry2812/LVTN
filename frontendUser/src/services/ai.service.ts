import api from './api';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface SuggestedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  image?: string | null;
  categoryName?: string | null;
}

export interface ChatResponse {
  reply: string;
  suggestedProducts?: SuggestedProduct[];
}

export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  productId?: number,
): Promise<ChatResponse> => {
  const response = await api.post<ChatResponse>('/ai/chat', {
    message,
    history,
    productId,
  });
  return response.data;
};
