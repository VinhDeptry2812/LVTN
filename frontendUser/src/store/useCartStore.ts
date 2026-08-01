import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatPrice } from '../utils/format';
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
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateVariant: (oldId: string, newVariantId: number | string | null) => void;
  clearCart: () => void;
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
      addItem: (item) => set((state) => {
        const existingItem = state.items.find((i) => i.id === item.id);
        const variant = item.availableVariants?.find((v: any) => v.id === item.variantId);
        const maxStock = variant ? (variant.stock || 0) : 9999;

        if (existingItem) {
          const newQty = existingItem.quantity + item.quantity;
          return {
            items: state.items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: Math.min(newQty, maxStock) }
                : i
            ),
            lastAdded: Date.now()
          };
        }
        return { 
          items: [...state.items, { ...item, quantity: Math.min(item.quantity, maxStock) }],
          lastAdded: Date.now()
        };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((i) => {
          if (i.id === id) {
            const variant = i.availableVariants?.find((v: any) => v.id === i.variantId);
            const maxStock = variant ? (variant.stock || 0) : 9999;
            return { ...i, quantity: Math.max(1, Math.min(quantity, maxStock)) };
          }
          return i;
        }),
      })),
      updateVariant: (oldId, newVariantId) => set((state) => {
        const itemToUpdate = state.items.find(i => i.id === oldId);
        if (!itemToUpdate) return state;

        const newId = `${itemToUpdate.productId}-${newVariantId || 'base'}`;
        
        // Find variant info
        const variant = itemToUpdate.availableVariants?.find((v: any) => v.id === newVariantId);
        
        // Compute new prices
        const basePrice = itemToUpdate.basePrice || itemToUpdate.rawPrice;
        const newRawPrice = basePrice + (variant?.price_adjustment ? Number(variant.price_adjustment) : 0);
        
        const baseOldPrice = itemToUpdate.baseOldPrice || itemToUpdate.rawOldPrice || basePrice;
        const newRawOldPrice = baseOldPrice + (variant?.price_adjustment ? Number(variant.price_adjustment) : 0);
        
        let newMaterial = itemToUpdate.material;
        if (variant?.attributes && Object.keys(variant.attributes).length > 0) {
           newMaterial = formatAttributes(variant.attributes);
        } else if (!variant) {
           newMaterial = 'Mặc định'; // Default or keep existing
        }

        const updatedItem = {
          ...itemToUpdate,
          id: newId,
          variantId: newVariantId,
          rawPrice: newRawPrice,
          rawOldPrice: newRawOldPrice,
          price: formatPrice(newRawPrice),
          material: newMaterial,
          image: variant?.image_url || itemToUpdate.image // Ideally base product image, but keeping simple for now
        };

        // Check if newId already exists in cart (merge them)
        const existingTarget = state.items.find(i => i.id === newId && i.id !== oldId);
        
        if (existingTarget) {
          // Merge quantities and remove old item
          return {
            items: state.items.map(i => 
              i.id === newId 
                ? { ...i, quantity: i.quantity + updatedItem.quantity } 
                : i
            ).filter(i => i.id !== oldId)
          };
        } else {
          // Just update the item
          return {
            items: state.items.map(i => i.id === oldId ? updatedItem : i)
          };
        }
      }),
      clearCart: () => set({ items: [], orderNote: '' }),
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + (item.rawPrice * item.quantity), 0);
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
    }
  )
);
