import api from './api';
import type { CartItem } from '../store/useCartStore';
import { formatPrice } from '../utils/format';
import { getProductImage } from '../utils/image';

export interface BackendCartItemDto {
  product_id: number;
  product_variant_id?: number | null;
  quantity: number;
}

const getSpecValue = (specs: any, keyName: string): string | undefined => {
  if (!specs) return undefined;
  if (Array.isArray(specs)) {
    const found = specs.find((s: any) => s && (s.key === keyName || s.key?.toLowerCase() === keyName.toLowerCase()));
    return found?.value;
  }
  return specs[keyName];
};

export const convertBackendCartToFrontend = (backendCart: any): CartItem[] => {
  if (!backendCart || !Array.isArray(backendCart.items)) return [];

  return backendCart.items.map((item: any) => {
    const product = item.product || {};
    const variant = item.variant || null;
    const variantId = variant?.id || null;
    const productId = String(product.id || '');
    const compositeId = `${productId}-${variantId || 'base'}`;

    // 1. Đọc chính xác giá từ entity Product của Backend (discount_price & base_price)
    const activePrice = Number(product.discount_price || product.base_price || product.price || 0);
    const baseOldPrice = product.discount_price ? Number(product.base_price || product.old_price || 0) : activePrice;

    const basePrice = activePrice;
    const adjustment = variant?.price_adjustment ? Number(variant.price_adjustment) : 0;
    const rawPrice = basePrice + adjustment;
    const rawOldPrice = baseOldPrice + adjustment;

    // 2. Lấy hình ảnh thông qua getProductImage tiện ích chuẩn
    const image = getProductImage(item, '/placeholder.jpg');

    // 3. Trích xuất chất liệu từ thuộc tính biến thể hoặc thông số kỹ thuật (detail.specifications)
    let material = 'Mặc định';
    if (variant?.attributes && Object.keys(variant.attributes).length > 0) {
      material = Object.values(variant.attributes)
        .map((val: any) => String(val).split('|')[0].trim())
        .join(' | ');
    } else if (product.detail?.specifications) {
      const specMat = getSpecValue(product.detail.specifications, 'Chất liệu') || getSpecValue(product.detail.specifications, 'material');
      if (specMat) material = specMat;
    }

    return {
      id: compositeId,
      dbItemId: item.id,
      productId: productId,
      variantId: variantId,
      name: product.name || 'Sản phẩm',
      material: material,
      price: formatPrice(rawPrice),
      rawPrice: rawPrice,
      basePrice: basePrice,
      baseOldPrice: baseOldPrice,
      rawOldPrice: rawOldPrice,
      image: image,
      quantity: item.quantity,
      availableVariants: product.variants || [],
    };
  });
};

export const cartService = {
  async getCart() {
    const response = await api.get('/cart');
    return response.data;
  },

  async syncCart(items: BackendCartItemDto[]) {
    const response = await api.post('/cart/sync', { items });
    return response.data;
  },

  async addToCart(dto: BackendCartItemDto) {
    const response = await api.post('/cart/items', dto);
    return response.data;
  },

  async updateCartItem(itemId: number, quantity: number) {
    const response = await api.patch(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  async removeCartItem(itemId: number) {
    const response = await api.delete(`/cart/items/${itemId}`);
    return response.data;
  },

  async clearCart() {
    const response = await api.delete('/cart');
    return response.data;
  },
};
