/**
 * Lấy URL ảnh hiển thị của sản phẩm từ item đơn hàng hoặc sản phẩm
 */
export const getProductImage = (
  item: any,
  fallback = 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60'
): string => {
  if (item?.variant?.image_url) return item.variant.image_url;

  if (item?.product?.images && item.product.images.length > 0) {
    const primaryImg = item.product.images.find((img: any) => img.is_primary);
    if (primaryImg) return primaryImg.image_url || primaryImg.url;
    return item.product.images[0].image_url || item.product.images[0].url;
  }

  if (item?.product?.thumbnail) return item.product.thumbnail;
  if (item?.product?.image) return item.product.image;
  if (typeof item?.image === 'string') return item.image;

  return fallback;
};
