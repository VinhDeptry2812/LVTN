/**
 * Tối ưu URL ảnh Cloudinary bằng cách chèn transformation parameters.
 * - q_auto: Cloudinary tự chọn quality tối ưu
 * - f_auto: Tự chọn format (WebP/AVIF nếu browser hỗ trợ)
 * - w_[width]: Resize theo chiều rộng yêu cầu
 * - dpr_auto: Tự nhân DPR cho Retina display
 * 
 * Nếu URL không phải Cloudinary, trả về nguyên gốc.
 */
export function optimizeCloudinaryUrl(
  url: string | undefined | null,
  options: {
    width?: number;       // Chiều rộng mong muốn (px)
    quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | number;
    format?: 'auto' | 'webp' | 'avif';
    dpr?: 'auto' | number;
  } = {}
): string {
  if (!url) return '';
  
  // Chỉ xử lý URL Cloudinary
  if (!url.includes('res.cloudinary.com')) return url;

  const {
    width,
    quality = 'auto',
    format = 'auto',
    dpr = 'auto',
  } = options;

  // Xây dựng chuỗi transformation
  const transforms: string[] = [];
  
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);
  
  if (width) {
    transforms.push(`w_${width}`);
    transforms.push('c_limit'); // Không phóng to nếu ảnh nhỏ hơn
  }
  
  if (dpr) {
    transforms.push(`dpr_${dpr}`);
  }

  const transformStr = transforms.join(',');

  // Chèn transformation vào URL sau /upload/
  // Cloudinary URL format: .../upload/v123456/folder/image.jpg
  // -> .../upload/q_auto,f_auto,w_800/v123456/folder/image.jpg
  const parts = url.split('/upload/');
  if (parts.length < 2) return url;

  // Kiểm tra xem đã có transformation chưa (tránh chèn trùng)
  const afterUpload = parts[1];
  // Nếu phần sau /upload/ bắt đầu bằng version (v + số) hoặc folder name thì chưa có transform
  // Nếu đã có transform (q_, w_, f_, c_...) thì thay thế
  const hasExistingTransform = /^[a-z]_/.test(afterUpload);
  
  if (hasExistingTransform) {
    // Đã có transform -> thay thế phần transform cũ
    const versionMatch = afterUpload.match(/(v\d+\/.+)/);
    if (versionMatch) {
      return `${parts[0]}/upload/${transformStr}/${versionMatch[1]}`;
    }
    // Fallback: thêm transform mới trước
    return `${parts[0]}/upload/${transformStr}/${afterUpload}`;
  }

  return `${parts[0]}/upload/${transformStr}/${afterUpload}`;
}

/**
 * Shortcut cho ảnh sản phẩm trong grid (card nhỏ)
 * Tối ưu cho hiển thị ~400-500px width
 */
export function productCardImage(url: string | undefined | null): string {
  return optimizeCloudinaryUrl(url, { width: 600, quality: 'auto:good' });
}

/**
 * Shortcut cho ảnh sản phẩm ở trang detail (hiển thị lớn)
 * Tối ưu cho hiển thị ~800-1000px width
 */
export function productDetailImage(url: string | undefined | null): string {
  return optimizeCloudinaryUrl(url, { width: 1200, quality: 'auto:best' });
}

/**
 * Shortcut cho ảnh hero/banner (full-width)
 * Tối ưu cho hiển thị toàn màn hình
 */
export function heroBannerImage(url: string | undefined | null): string {
  return optimizeCloudinaryUrl(url, { width: 1920, quality: 'auto:best' });
}

/**
 * Shortcut cho ảnh danh mục/collection card
 * Tối ưu cho hiển thị ~300-400px width
 */
export function categoryCardImage(url: string | undefined | null): string {
  return optimizeCloudinaryUrl(url, { width: 500, quality: 'auto:good' });
}
