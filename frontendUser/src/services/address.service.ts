import api from './api';

export interface AddressData {
  id: number;
  name: string;
  phone: string;
  address: string;
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  ward_code?: string;
  ward_name?: string;
  detail?: string;
  is_default: boolean;
}

export interface CreateAddressPayload {
  name: string;
  phone: string;
  address: string;
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  ward_code?: string;
  ward_name?: string;
  detail?: string;
  is_default?: boolean;
}

export const getAddresses = async (): Promise<AddressData[]> => {
  const response = await api.get('/addresses');
  return response.data;
};

export const createAddress = async (payload: CreateAddressPayload): Promise<{ message: string; address: AddressData }> => {
  const response = await api.post('/addresses', payload);
  return response.data;
};

export const updateAddress = async (id: number, payload: Partial<CreateAddressPayload>): Promise<{ message: string; address: AddressData }> => {
  const response = await api.patch(`/addresses/${id}`, payload);
  return response.data;
};

export const deleteAddress = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/addresses/${id}`);
  return response.data;
};

export const setDefaultAddress = async (id: number): Promise<{ message: string; address: AddressData }> => {
  const response = await api.patch(`/addresses/${id}/default`);
  return response.data;
};
