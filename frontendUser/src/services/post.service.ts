import api from './api';

export interface Post {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnail?: string;
  category: string;
  status: string;
  is_featured: boolean;
  views: number;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PostQueryPublic {
  search?: string;
  category?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface PostPaginatedResponse {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getPublicPosts = async (params?: PostQueryPublic): Promise<PostPaginatedResponse> => {
  const response = await api.get('/posts/public', { params });
  return response.data;
};

export const getPostBySlug = async (slug: string): Promise<Post> => {
  const response = await api.get(`/posts/public/slug/${slug}`);
  return response.data;
};

export const getPostCategories = async (): Promise<string[]> => {
  const response = await api.get('/posts/categories');
  return response.data;
};
