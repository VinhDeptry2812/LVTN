import api from './api';

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  button_text: string;
  button_link: string;
  position: number;
  is_active: boolean;
}

export const getActiveBanners = async (): Promise<Banner[]> => {
  const response = await api.get('/banners');
  return response.data;
};
