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

