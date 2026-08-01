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
  created_at: string;
  updated_at: string;
}

export interface CreateBannerPayload {
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  button_text?: string;
  button_link?: string;
  position?: number;
  is_active?: boolean;
}

export interface UpdateBannerPayload extends Partial<CreateBannerPayload> {}

export const bannerService = {
  // Lấy tất cả banner cho Admin
  getBannersAdmin: async (): Promise<Banner[]> => {
    const response = await api.get('/banners/admin');
    return response.data;
  },

  // Tạo mới banner
  createBanner: async (data: CreateBannerPayload): Promise<Banner> => {
    const response = await api.post('/banners', data);
    return response.data;
  },

  // Cập nhật banner
  updateBanner: async (id: number, data: UpdateBannerPayload): Promise<Banner> => {
    const response = await api.patch(`/banners/${id}`, data);
    return response.data;
  },

  // Bật/tắt nhanh trạng thái hiển thị
  toggleBannerActive: async (id: number): Promise<Banner> => {
    const response = await api.patch(`/banners/${id}/toggle-active`);
    return response.data;
  },

  // Xóa banner
  deleteBanner: async (id: number): Promise<void> => {
    await api.delete(`/banners/${id}`);
  },
};
