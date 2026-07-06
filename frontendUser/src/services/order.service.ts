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
  voucher_code?: string;
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

export const getMyOrders = async () => {
  const response = await api.get('/orders/my-orders');
  return response.data;
};

export const cancelOrder = async (orderId: number) => {
  const response = await api.post(`/orders/my-orders/${orderId}/cancel`);
  return response.data;
};

