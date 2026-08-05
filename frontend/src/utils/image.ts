/**
 * Nén kích thước và chất lượng ảnh client-side trước khi upload
 */
export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1800;
        const MAX_HEIGHT = 1800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

/**
 * Lấy URL ảnh hiển thị của sản phẩm từ item đơn hàng, phiếu bảo hành hoặc sản phẩm
 */
export const getProductImage = (
  item: any,
  fallback = 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60'
): string => {
  if (item?.variant?.image_url) return item.variant.image_url;

  if (item?.product?.images && item.product.images.length > 0) {
    const primaryImg = item.product.images.find((img: any) => img.is_primary);
    if (primaryImg) return primaryImg.image_url;
    return item.product.images[0].image_url;
  }

  if (item?.product?.thumbnail) return item.product.thumbnail;
  if (item?.product?.image) return item.product.image;
  if (typeof item?.image === 'string') return item.image;

  return fallback;
};
