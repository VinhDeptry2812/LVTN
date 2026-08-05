import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatPrice } from '../utils/format';
import { useAuthStore } from './useAuthStore';
import { cartService, convertBackendCartToFrontend,type BackendCartItemDto } from '../services/cart.service';

const formatAttributes = (attributes: Record<string, any> | undefined) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .join('|');
};

export interface CartItem {
  id: string; // Composite ID: productId-variantId
  dbItemId?: number; // Primary key from DB cart_items
  productId: string;
  variantId?: number | string | null;
  name: string;
  material?: string;
  price: string;
  rawPrice: number;
  basePrice?: number;
  baseOldPrice?: number;
  rawOldPrice?: number;
  image: string;
  quantity: number;
  availableVariants?: any[];
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  updateVariant: (oldId: string, newVariantId: number | string | null) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  syncCartOnLogin: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
  orderNote: string;
  setOrderNote: (note: string) => void;
  lastAdded?: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderNote: '',
      lastAdded: undefined,
      setOrderNote: (note) => set({ orderNote: note }),

      fetchCart: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        try {
          const backendCart = await cartService.getCart();
          const items = convertBackendCartToFrontend(backendCart);
          set({ items });
        } catch (error) {
          console.error('Lỗi khi tải giỏ hàng từ server:', error);
        }
      },

      syncCartOnLogin: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const currentLocalItems = get().items;
        const syncPayload: BackendCartItemDto[] = currentLocalItems
          .map((i) => ({
            product_id: Number(i.productId),
            product_variant_id: i.variantId ? Number(i.variantId) : null,
            quantity: i.quantity,
          }))
          .filter((i) => !isNaN(i.product_id) && i.product_id > 0);

        try {
          const backendCart = await cartService.syncCart(syncPayload);
          const items = convertBackendCartToFrontend(backendCart);
          set({ items });
        } catch (error) {
          console.error('Lỗi khi đồng bộ giỏ hàng lên server:', error);
        }
      },

      addItem: async (item) => {
        const state = get();
        const existingItem = state.items.find((i) => i.id === item.id);
        const variant = item.availableVariants?.find((v: any) => v.id === item.variantId);
        const maxStock = variant ? (variant.stock || 0) : 9999;

        let newItems: CartItem[];
        if (existingItem) {
          const newQty = existingItem.quantity + item.quantity;
          newItems = state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: Math.min(newQty, maxStock) } : i,
          );
        } else {
          newItems = [...state.items, { ...item, quantity: Math.min(item.quantity, maxStock) }];
        }
        set({ items: newItems, lastAdded: Date.now() });

        const token = useAuthStore.getState().token;
        if (token) {
          try {
            const dto: BackendCartItemDto = {
              product_id: Number(item.productId),
              product_variant_id: item.variantId ? Number(item.variantId) : null,
              quantity: item.quantity,
            };
            const backendCart = await cartService.addToCart(dto);
            set({ items: convertBackendCartToFrontend(backendCart) });
          } catch (error) {
            console.error('Lỗi khi thêm vào giỏ hàng DB:', error);
          }
        }
      },

      removeItem: async (id) => {
        const state = get();
        const targetItem = state.items.find((i) => i.id === id);
        set({ items: state.items.filter((i) => i.id !== id) });

        const token = useAuthStore.getState().token;
        if (token && targetItem?.dbItemId) {
          try {
            const backendCart = await cartService.removeCartItem(targetItem.dbItemId);
            set({ items: convertBackendCartToFrontend(backendCart) });
          } catch (error) {
            console.error('Lỗi khi xóa món khỏi DB:', error);
          }
        }
      },

      updateQuantity: async (id, quantity) => {
        const state = get();
        const targetItem = state.items.find((i) => i.id === id);
        if (!targetItem) return;

        const variant = targetItem.availableVariants?.find((v: any) => v.id === targetItem.variantId);
        const maxStock = variant ? (variant.stock || 0) : 9999;
        const validQty = Math.max(1, Math.min(quantity, maxStock));

        set({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: validQty } : i)),
        });

        const token = useAuthStore.getState().token;
        if (token && targetItem.dbItemId) {
          try {
            const backendCart = await cartService.updateCartItem(targetItem.dbItemId, validQty);
            set({ items: convertBackendCartToFrontend(backendCart) });
          } catch (error) {
            console.error('Lỗi khi cập nhật số lượng trên DB:', error);
          }
        }
      },

      updateVariant: async (oldId, newVariantId) => {
        const state = get();
        const itemToUpdate = state.items.find((i) => i.id === oldId);
        if (!itemToUpdate) return;

        const newId = `${itemToUpdate.productId}-${newVariantId || 'base'}`;
        const variant = itemToUpdate.availableVariants?.find((v: any) => v.id === newVariantId);

        const basePrice = itemToUpdate.basePrice || itemToUpdate.rawPrice;
        const newRawPrice = basePrice + (variant?.price_adjustment ? Number(variant.price_adjustment) : 0);

        const baseOldPrice = itemToUpdate.baseOldPrice || itemToUpdate.rawOldPrice || basePrice;
        const newRawOldPrice = baseOldPrice + (variant?.price_adjustment ? Number(variant.price_adjustment) : 0);

        let newMaterial = itemToUpdate.material;
        if (variant?.attributes && Object.keys(variant.attributes).length > 0) {
          newMaterial = formatAttributes(variant.attributes);
        } else if (!variant) {
          newMaterial = 'Mặc định';
        }

        const updatedItem: CartItem = {
          ...itemToUpdate,
          id: newId,
          variantId: newVariantId,
          rawPrice: newRawPrice,
          rawOldPrice: newRawOldPrice,
          price: formatPrice(newRawPrice),
          material: newMaterial,
          image: variant?.image_url || itemToUpdate.image,
        };

        const existingTarget = state.items.find((i) => i.id === newId && i.id !== oldId);
        let newItems: CartItem[];
        if (existingTarget) {
          newItems = state.items
            .map((i) => (i.id === newId ? { ...i, quantity: i.quantity + updatedItem.quantity } : i))
            .filter((i) => i.id !== oldId);
        } else {
          newItems = state.items.map((i) => (i.id === oldId ? updatedItem : i));
        }
        set({ items: newItems });

        const token = useAuthStore.getState().token;
        if (token) {
          try {
            // Remove old item from DB if present, add new variant
            if (itemToUpdate.dbItemId) {
              await cartService.removeCartItem(itemToUpdate.dbItemId);
            }
            const dto: BackendCartItemDto = {
              product_id: Number(itemToUpdate.productId),
              product_variant_id: newVariantId ? Number(newVariantId) : null,
              quantity: updatedItem.quantity,
            };
            const backendCart = await cartService.addToCart(dto);
            set({ items: convertBackendCartToFrontend(backendCart) });
          } catch (error) {
            console.error('Lỗi khi đổi biến thể trên DB:', error);
          }
        }
      },

      clearCart: async () => {
        set({ items: [], orderNote: '' });
        const token = useAuthStore.getState().token;
        if (token) {
          try {
            await cartService.clearCart();
          } catch (error) {
            console.error('Lỗi khi xóa sạch giỏ hàng DB:', error);
          }
        }
      },

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.rawPrice * item.quantity, 0);
      },
      getCartCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'nordic-hearth-cart-v3',
      partialize: (state) => {
        const { lastAdded, ...rest } = state;
        return rest;
      },
    },
  ),
);
