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
  payment_method: 'cod' | 'vnpay' | 'momo' | 'payos';
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

export const repayOrder = async (orderId: number) => {
  const response = await api.post(`/orders/my-orders/${orderId}/repay`);
  return response.data;
};

export const completeOrder = async (orderId: number) => {
  const response = await api.post(`/orders/my-orders/${orderId}/complete`);
  return response.data;
};

export interface RequestReturnPayload {
  reason: string;
  description?: string;
  images?: string[];
  items: number[] | { itemId: number; quantity: number }[];
  action_type: 'refund' | 'exchange';
}

export const requestReturnOrder = async (orderId: number, payload: RequestReturnPayload) => {
  const response = await api.post(`/orders/my-orders/${orderId}/return`, payload);
  return response.data;
};

