  import api from './api';

export interface Review {
  id: number;
  rating: number;
  comment: string;
  images?: string[];
  is_anonymous?: boolean;
  edit_count?: number;
  created_at: string;
  user: {
    name: string;
  };
  product?: {
    id: number;
    name: string;
  };
}

export interface ProductReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  filteredTotal?: number;
  currentPage?: number;
  totalPages?: number;
  limit?: number;
  allImages?: string[];
  starCounts?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CanReviewResponse {
  canReview: boolean;
  reason?: string;
  review?: Review;
}

export const fetchProductReviews = async (
  productId: string | number,
  params?: {
    page?: number;
    limit?: number;
    rating?: number | string;
    sort?: string;
  }
): Promise<ProductReviewsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.rating) queryParams.append('rating', params.rating.toString());
  if (params?.sort) queryParams.append('sort', params.sort);

  const queryString = queryParams.toString();
  const url = `/reviews/product/${productId}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

export const checkCanReview = async (productId: string | number): Promise<CanReviewResponse> => {
  try {
    const response = await api.get(`/reviews/can-review/${productId}`);
    return response.data;
  } catch (error) {
    return { canReview: false, reason: 'Chưa đăng nhập hoặc không đủ điều kiện' };
  }
};

export const createReview = async (
  productId: string | number,
  rating: number,
  comment: string,
  images?: string[],
  isAnonymous?: boolean
): Promise<any> => {
  const response = await api.post('/reviews', {
    productId: Number(productId),
    rating,
    comment,
    images,
    isAnonymous,
  });
  return response.data;
};

export const updateReview = async (
  reviewId: number,
  rating: number,
  comment: string,
  images?: string[],
  isAnonymous?: boolean
): Promise<any> => {
  const response = await api.patch(`/reviews/${reviewId}`, {
    rating,
    comment,
    images,
    isAnonymous,
  });
  return response.data;
};

export const getMyReviews = async (): Promise<any[]> => {
  const response = await api.get('/reviews/my-reviews');
  return response.data;
};

export const fetchFeaturedReviews = async (): Promise<any[]> => {
  try {
    const response = await api.get('/reviews/featured');
    return response.data;
  } catch (error) {
    return [];
  }
};
