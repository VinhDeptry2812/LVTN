import api from './api';

export interface ProductFrontend {
  id: string;
  sku?: string;
  name: string;
  desc: string;
  price: string;
  rawPrice: number;
  rawBasePrice?: number;
  image: string;
  gallery?: { url: string; variant_id?: number }[];
  hoverImage?: string;
  badge?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  is_active?: boolean;
  soldCount?: number;
  discount?: string;
  oldPrice?: string;
  category: string;
  rating: number;
  specs?: Record<string, string>;
  variants?: any[];
  createdAt?: string;
  inventoryUpdatedAt?: string;
  lastStockAddedAt?: string;
}

export const formatPrice = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(value)
    .replace('₫', '₫');
};

export const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export const matchProduct = (product: ProductFrontend, query: string): boolean => {
  if (!query.trim()) return false;
  const normalizedQuery = removeAccents(query.toLowerCase().trim());
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  
  if (tokens.length === 0) return false;
  
  // Combine all searchable text fields of the product
  const searchableText = [
    product.name,
    product.sku || '',
    product.desc,
    product.category.replace(/-/g, ' ')
  ].join(' ').toLowerCase();
  
  const normalizedSearchableText = removeAccents(searchableText);
  
  // Every query token must be present in the product's searchable text
  return tokens.every(token => normalizedSearchableText.includes(token));
};

export const mapBackendProductToFrontend = (p: any): ProductFrontend => {
  // Determine main image
  let mainImage = '';
  let hoverImage: string | undefined;
  let gallery: { url: string; variant_id?: number }[] = [];
  if (p.images && p.images.length > 0) {
    const sortedImages = [...p.images].sort((a: any, b: any) => a.id - b.id);
    const primaryImg = sortedImages.find((img: any) => img.is_primary);
    const hoverImg = sortedImages.find((img: any) => img.is_hover);
    mainImage = primaryImg ? primaryImg.image_url : sortedImages[0].image_url;
    gallery = sortedImages.map((img: any) => ({ url: img.image_url, variant_id: img.variant_id }));
    hoverImage = hoverImg ? hoverImg.image_url : undefined;
  }

  // Material spec
  const specs = p.detail?.specifications || {};
  const basePrice = Number(p.base_price || 0);
  const discountPrice = p.discount_price ? Number(p.discount_price) : null;
  const hasDiscount = discountPrice !== null && discountPrice > 0 && discountPrice < basePrice;

  // Determine if product is "new" (imported to inventory in last 3 days)
  let isNew = false;
  const stockDateStr = p.lastStockAddedAt || p.created_at;
  if (stockDateStr) {
    const stockDate = new Date(stockDateStr);
    const now = new Date();
    const diffDays = (now.getTime() - stockDate.getTime()) / (1000 * 60 * 60 * 24);
    isNew = diffDays <= 14;
  }

  // Featured = has discount or special badge
  const isFeatured = hasDiscount || !!p.badge;

  return {
    id: p.id.toString(),
    sku: p.sku || '',
    name: p.name,
    desc: p.description || '',
    rawPrice: hasDiscount ? discountPrice : basePrice,
    rawBasePrice: basePrice,
    price: formatPrice(hasDiscount ? discountPrice : basePrice),
    oldPrice: hasDiscount ? formatPrice(basePrice) : undefined,
    discount: hasDiscount ? `-${Math.round((1 - discountPrice / basePrice) * 100)}%` : undefined,
    image: mainImage || 'https://via.placeholder.com/400x500?text=No+Image',
    hoverImage,
    gallery: gallery.length > 0 ? gallery : undefined,
    category: p.category ? p.category.slug : 'other',
    rating: p.averageRating !== undefined ? Number(p.averageRating) : 0,
    specs: specs,
    isNew,
    isFeatured,
    is_active: p.is_active !== undefined ? p.is_active : true,
    soldCount: p.soldCount || p.sold_count || 0,
    variants: p.variants || [],
    createdAt: p.created_at || undefined,
    inventoryUpdatedAt: p.inventoryUpdatedAt || undefined,
    lastStockAddedAt: p.lastStockAddedAt || undefined,
  };
};

export interface FetchProductsResponse {
  data: ProductFrontend[];
  total: number;
  page: number;
  totalPages: number;
}

export const fetchProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  onlySale?: boolean;
  sortBy?: string;
}): Promise<ProductFrontend[]> => {
  const response = await api.get('/products', { params });
  if (response.data && Array.isArray(response.data.data)) {
    return response.data.data.map(mapBackendProductToFrontend);
  }
  return (Array.isArray(response.data) ? response.data : []).map(mapBackendProductToFrontend);
};

export const fetchProductsPaginated = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  onlySale?: boolean;
  sortBy?: string;
}): Promise<FetchProductsResponse> => {
  const response = await api.get('/products', { params });
  if (response.data && Array.isArray(response.data.data)) {
    return {
      data: response.data.data.map(mapBackendProductToFrontend),
      total: response.data.total,
      page: response.data.page,
      totalPages: response.data.totalPages,
    };
  }
  const rawList = Array.isArray(response.data) ? response.data : [];
  const mapped = rawList.map(mapBackendProductToFrontend);
  return {
    data: mapped,
    total: mapped.length,
    page: 1,
    totalPages: 1,
  };
};

export const fetchProductById = async (id: string): Promise<ProductFrontend> => {
  const response = await api.get(`/products/${id}`);
  return mapBackendProductToFrontend(response.data);
};

export const fetchRelatedProducts = async (id: string): Promise<ProductFrontend[]> => {
  const response = await api.get(`/products/${id}/related`);
  return response.data.map(mapBackendProductToFrontend);
};

export const fetchFrequentlyBoughtTogether = async (id: string): Promise<ProductFrontend[]> => {
  const response = await api.get(`/products/${id}/frequently-bought-together`);
  return response.data.map(mapBackendProductToFrontend);
};

export const fetchBestSellers = async (limit?: number): Promise<ProductFrontend[]> => {
  const response = await api.get('/products/best-sellers', { params: { limit } });
  return response.data.map(mapBackendProductToFrontend);
};
