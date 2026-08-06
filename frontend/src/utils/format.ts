/**
 * Định dạng số tiền thành chuỗi tiền tệ VNĐ (Ví dụ: 100000 -> 100.000 ₫)
 * @param {number} price Số tiền cần chuyển đổi
 * @returns {string} Chuỗi hiển thị tiền tệ Việt Nam
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

/**
 * Định dạng chuỗi ngày tháng thành định dạng Việt Nam (DD/MM/YYYY HH:mm)
 * @param {string} dateStr Chuỗi thời gian ISO hoặc chuẩn mốc giờ
 * @returns {string} Chuỗi hiển thị ngày tháng giờ phút theo định dạng Việt Nam
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
 * Chuyển đổi đối tượng các thuộc tính sản phẩm thành chuỗi mô tả thân thiện cho Admin
 * @param {Record<string, any> | null} attributes Đối tượng chứa các thuộc tính (VD: { "Màu sắc": "Đen|#000", "Kích thước": "XL" })
 * @returns {string} Chuỗi ghép các thuộc tính cách nhau bằng dấu phẩy (VD: "Màu sắc: Đen, Kích thước: XL")
 */
export const formatAttributes = (attributes?: Record<string, any> | null): string => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.entries(attributes)
    .map(([k, v]) => `${k}: ${formatAttributeValue(v)}`)
    .join(', ');
};


