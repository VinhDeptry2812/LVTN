import api from './api';

export interface OrderItemPayload {
  product_id: number;
  variant_id?: number;
  quantity: number;
  price: number;
}

export interface CreateOrderPayload {
  shipping_address: string;
  phone: string;
  notes?: string;
  payment_method: 'cod' | 'vnpay' | 'momo';
  items: OrderItemPayload[];
}

export const createGuestOrder = async (payload: CreateOrderPayload) => {
  const response = await api.post('/orders/guest', payload);
  return response.data;
};

export const createOrder = async (payload: CreateOrderPayload) => {
  const response = await api.post('/orders', payload);
  return response.data;
};

