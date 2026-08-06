/**
 * Định dạng số tiền sang dạng tiền tệ VNĐ (VD: 1.500.000 ₫)
 * @param {number | string | undefined | null} value Giá trị số cần định dạng
 * @returns {string} Chuỗi hiển thị tiền tệ định dạng Việt Nam
 */
export const formatPrice = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return '0 ₫';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

/**
 * Định dạng chuỗi ngày tháng sang dạng vi-VN (VD: 25/07/2026)
 * @param {string | Date | null} dateStr Chuỗi ngày tháng hoặc đối tượng Date
 * @returns {string} Chuỗi ngày tháng theo định dạng Việt Nam (DD/MM/YYYY)
 */
export const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  } catch {
    return '-';
  }
};

/**
 * Xử lý làm sạch giá trị của thuộc tính sản phẩm
 * Loại bỏ mã màu Hex hoặc dữ liệu kỹ thuật phía sau ký tự pipe ('|') nếu có
 * @param {string | number | null} val Giá trị thuộc tính thô (Ví dụ: "Đen|#000000")
 * @returns {string} Tên nhãn hiển thị trực quan (Ví dụ: "Đen")
 */
export const formatAttributeValue = (val?: string | number | null): string => {
  if (val === undefined || val === null) return '';
  const strVal = String(val);
  return strVal.includes('|') ? strVal.split('|')[0].trim() : strVal.trim();
};

/**
 * Chuyển đổi đối tượng các thuộc tính sản phẩm thành chuỗi mô tả thân thiện
 * @param {Record<string, any> | null} attributes Đối tượng chứa các thuộc tính (VD: { "Màu sắc": "Đen|#000", "Kích thước": "XL" })
 * @returns {string} Chuỗi ghép các thuộc tính cách nhau bằng dấu phẩy (VD: "Màu sắc: Đen, Kích thước: XL")
 */
export const formatAttributes = (attributes?: Record<string, any> | null): string => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.entries(attributes)
    .map(([k, v]) => `${k}: ${formatAttributeValue(v)}`)
    .join(', ');
};


