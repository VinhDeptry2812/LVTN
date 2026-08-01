import api from './api';
import { type ProductFrontend } from './product.service';

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string;
  cover_image: string;
  is_active: boolean;
  products?: ProductFrontend[];
}

export const getActiveCollections = async (): Promise<Collection[]> => {
  const response = await api.get('/collections');
  return response.data;
};

export const getCollectionBySlug = async (slug: string): Promise<Collection> => {
  const response = await api.get(`/collections/${slug}`);
  return response.data;
};
