/**
 * Định dạng số tiền sang chuẩn VNĐ (VD: 1.500.000 ₫)
 */
export const formatPrice = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return '0 ₫';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

/**
 * Định dạng chuỗi ngày tháng sang vi-VN (VD: 25/07/2026)
 */
export const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  } catch {
    return '-';
  }
};
