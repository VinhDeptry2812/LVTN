import api from './api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  children?: Category[];
}

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get('/categories');
  return response.data;
};
