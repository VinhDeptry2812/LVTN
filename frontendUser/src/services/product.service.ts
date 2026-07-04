import api from './api';

export interface ProductFrontend {
  id: string;
  name: string;
  desc: string;
  price: string;
  rawPrice: number;
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
  blueprintUrl?: string;
}

export const formatPrice = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(value)
    .replace('₫', '₫');
};

export const fetchProducts = async (): Promise<ProductFrontend[]> => {
  const response = await api.get('/products');
  const backendProducts = response.data;

  return backendProducts.map((p: any) => {
    // Determine main image
    let mainImage = '';
    let hoverImage: string | undefined;
    let gallery: string[] = [];
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

    return {
      id: p.id.toString(),
      name: p.name,
      desc: p.description || '',
      rawPrice: Number(p.base_price),
      price: formatPrice(Number(p.base_price)),
      image: mainImage || 'https://via.placeholder.com/400x500?text=No+Image',
      hoverImage,
      gallery: gallery.length > 0 ? gallery : undefined,
      category: p.category ? p.category.slug : 'other',
      rating: 4.5, // placeholder rating
      specs: specs,
      isNew: false, // Could be determined by created_at if needed
      variants: p.variants || [],
      blueprintUrl: p.detail?.blueprint_url,
    };
  });
};

export const fetchProductById = async (id: string): Promise<ProductFrontend> => {
  const response = await api.get(`/products/${id}`);
  const p = response.data;

  // Determine main image
  let mainImage = '';
  let hoverImage: string | undefined;
  let gallery: { url: string; variant_id?: number }[] = [];
  if (p.images && p.images.length > 0) {
    const sortedImages = [...p.images].sort((a: any, b: any) => a.id - b.id);
    const primaryImg = sortedImages.find((img: any) => img.is_primary);
    const hoverImgObj = sortedImages.find((img: any) => img.is_hover);
    mainImage = primaryImg ? primaryImg.image_url : sortedImages[0].image_url;
    gallery = sortedImages.map((img: any) => ({ url: img.image_url, variant_id: img.variant_id }));
    hoverImage = hoverImgObj ? hoverImgObj.image_url : undefined;
  }

  // Material spec
  const specs = p.detail?.specifications || {};

  return {
    id: p.id.toString(),
    name: p.name,
    desc: p.description || '',
    rawPrice: Number(p.base_price),
    price: formatPrice(Number(p.base_price)),
    image: mainImage || 'https://via.placeholder.com/400x500?text=No+Image',
    hoverImage,
    gallery: gallery.length > 0 ? gallery : undefined,
    category: p.category ? p.category.slug : 'other',
    rating: 4.5,
    specs: specs,
    variants: p.variants || [],
    blueprintUrl: p.detail?.blueprint_url,
  };
};
