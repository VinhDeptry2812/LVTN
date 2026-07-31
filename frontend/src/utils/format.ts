/**
 * Định dạng số tiền thành chuỗi tiền tệ VNĐ (Ví dụ: 100000 -> 100.000 ₫)
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

/**
 * Định dạng chuỗi ngày tháng thành định dạng Việt Nam (DD/MM/YYYY HH:mm)
 */
export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
