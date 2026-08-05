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

// Hàm xử lý làm sạch giá trị của một thuộc tính (loại bỏ mã màu Hex phía sau ký tự '|' nếu có)
export const formatAttributeValue = (val?: string | number | null): string => {
  if (val === undefined || val === null) return '';
  const strVal = String(val);
  return strVal.includes('|') ? strVal.split('|')[0].trim() : strVal.trim();
};

// Hàm chuyển đổi đối tượng thuộc tính thành chuỗi hiển thị gọn gàng (VD: Màu sắc: Đen, Kích thước: L)
export const formatAttributes = (attributes?: Record<string, any> | null): string => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.entries(attributes)
    .map(([k, v]) => `${k}: ${formatAttributeValue(v)}`)
    .join(', ');
};

