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
  discount?: string;
  oldPrice?: string;
  category: string;
  rating: number;
  specs?: Record<string, string>;
  variants?: any[];
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
    rating: 4.5,
    specs: specs,
    isNew: false,
    variants: p.variants || [],
  };
};

export const fetchProducts = async (): Promise<ProductFrontend[]> => {
  const response = await api.get('/products');
  return response.data.map(mapBackendProductToFrontend);
};

export const fetchProductById = async (id: string): Promise<ProductFrontend> => {
  const response = await api.get(`/products/${id}`);
  return mapBackendProductToFrontend(response.data);
};
