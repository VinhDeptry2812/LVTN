import api from './api';

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export const PostStatus = {
  DRAFT: 'DRAFT' as PostStatus,
  PUBLISHED: 'PUBLISHED' as PostStatus,
  ARCHIVED: 'ARCHIVED' as PostStatus,
};

export interface Post {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnail?: string;
  category: string;
  status: PostStatus;
  is_featured: boolean;
  views: number;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePostPayload {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  thumbnail?: string;
  category?: string;
  status?: PostStatus;
  is_featured?: boolean;
  author_name?: string;
}

export interface UpdatePostPayload extends Partial<CreatePostPayload> {}

export interface PostQueryAdmin {
  search?: string;
  category?: string;
  status?: PostStatus;
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

export const postService = {
  getPostsAdmin: async (params?: PostQueryAdmin): Promise<PostPaginatedResponse> => {
    const response = await api.get('/posts/admin', { params });
    return response.data;
  },

  getPostById: async (id: number): Promise<Post> => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  createPost: async (data: CreatePostPayload): Promise<Post> => {
    const response = await api.post('/posts', data);
    return response.data;
  },

  updatePost: async (id: number, data: UpdatePostPayload): Promise<Post> => {
    const response = await api.patch(`/posts/${id}`, data);
    return response.data;
  },

  toggleFeatured: async (id: number): Promise<Post> => {
    const response = await api.patch(`/posts/${id}/toggle-featured`);
    return response.data;
  },

  deletePost: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },
};
