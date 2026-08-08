import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/useCartStore';
import {
  getMyOrders,
  cancelOrder,
  repayOrder,
  completeOrder,
  requestReturnOrder,
} from '@/services/order.service';
import { checkCanReview, createReview, updateReview, getMyReviews, type Review } from '@/services/review.service';
import api from '@/services/api';
import { getProductImage } from '@/utils/image';
import { formatPrice } from '@/utils/format';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useDragScroll } from '@/hooks/useDragScroll';

export const formatAttributes = (attributes: any) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .filter((val: string) => !val.startsWith('#'))
    .join(' | ');
};

export const parseReturnItemsHelper = (raw: any): { itemId: number; quantity: number | null }[] => {
  if (!raw) return [];
  let items = raw;
  while (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      if (parsed === items) break;
      items = parsed;
    } catch {
      break;
    }
  }
  if (!items) return [];
  if (typeof items === 'number' || typeof items === 'string') {
    const num = Number(items);
    return isNaN(num) || num <= 0 ? [] : [{ itemId: num, quantity: null }];
  }
  if (typeof items === 'object' && !Array.isArray(items)) {
    if (Array.isArray(items.items)) {
      return parseReturnItemsHelper(items.items);
    }
    const possibleId = items.itemId ?? items.id ?? items.productId ?? items.product_id;
    if (possibleId !== undefined && possibleId !== null) {
      const num = Number(possibleId);
      if (!isNaN(num) && num > 0) {
        return [{ itemId: num, quantity: items.quantity ? Number(items.quantity) : null }];
      }
    }
    return Object.entries(items)
      .map(([k, v]) => ({
        itemId: Number(k),
        quantity: typeof v === 'number' ? v : (v as any)?.quantity ? Number((v as any).quantity) : null,
      }))
      .filter((i) => !isNaN(i.itemId) && i.itemId > 0);
  }
  if (Array.isArray(items)) {
    return items
      .map((ri: any) => {
        if (typeof ri === 'number' || typeof ri === 'string') {
          const num = Number(ri);
          return { itemId: isNaN(num) ? 0 : num, quantity: null };
        }
        if (typeof ri === 'object' && ri !== null) {
          const id = ri.itemId ?? ri.id ?? ri.productId ?? ri.product_id;
          const num = Number(id);
          return {
            itemId: isNaN(num) ? 0 : num,
            quantity: ri.quantity ? Number(ri.quantity) : null,
          };
        }
        return { itemId: 0, quantity: null };
      })
      .filter((i) => i.itemId > 0);
  }
  return [];
};

export function useOrderHistory(user: any) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const tabDrag = useDragScroll();

  // States for Review Modal
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [selectedProductToReview, setSelectedProductToReview] = useState<any | null>(null);
  const [reviewableStatus, setReviewableStatus] = useState<
    Record<number, { loading: boolean; canReview: boolean; reason?: string }>
  >({});
  const [modalRating, setModalRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [modalComment, setModalComment] = useState<string>('');
  const [modalIsAnonymous, setModalIsAnonymous] = useState<boolean>(false);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewProductImage, setReviewProductImage] = useState<string>('');
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalImageFiles, setModalImageFiles] = useState<File[]>([]);
  const [modalImagePreviews, setModalImagePreviews] = useState<string[]>([]);

  // States for Return Request Modal
  const [returnOrder, setReturnOrder] = useState<any | null>(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState<number[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [returnReason, setReturnReason] = useState<string>(
    'Sản phẩm bị nứt, vỡ, trầy xước bề mặt gỗ'
  );
  const [returnActionType, setReturnActionType] = useState<'exchange' | 'refund'>('refund');
  const [returnDescription, setReturnDescription] = useState<string>('');
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [returnImageFiles, setReturnImageFiles] = useState<File[]>([]);
  const [returnImagePreviews, setReturnImagePreviews] = useState<string[]>([]);
  const [submittingReturn, setSubmittingReturn] = useState<boolean>(false);

  // States for Return Success Modal
  const [showReturnSuccess, setShowReturnSuccess] = useState(false);
  const [submittedReturnInfo, setSubmittedReturnInfo] = useState<any>(null);

  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);
  const [userReviewsMap, setUserReviewsMap] = useState<Record<string, Review>>({});
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // States for Cancel Order Modal
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(null);
  const [cancelReasonOption, setCancelReasonOption] = useState<string>('Đổi ý không muốn mua nữa');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Confirm Modal state
  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const getExistingReview = (orderId: number | undefined, productId: number) => {
    if (orderId) {
      if (userReviewsMap[`${orderId}-${productId}`]) {
        return userReviewsMap[`${orderId}-${productId}`];
      }
      const legacyReview = userReviewsMap[`product-${productId}`];
      if (legacyReview && (!legacyReview.order || !legacyReview.order.id)) {
        return legacyReview;
      }
      return null;
    }
    return userReviewsMap[`product-${productId}`] || null;
  };

  const fetchOrders = async () => {
    if (!user) return;
    setIsLoadingOrders(true);
    try {
      const [ordersData, reviewsData] = await Promise.all([
        getMyOrders(),
        getMyReviews().catch(() => []),
      ]);
      const rawOrders = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
      const mappedOrders = rawOrders.map((order: any) => ({
        ...order,
        return_reason: order.return_request?.reason,
        return_description: order.return_request?.description,
        return_images: order.return_request?.images,
        return_items: order.return_request?.items,
        return_action_type: order.return_request?.action_type,
        return_rejected_reason: order.return_request?.rejected_reason,
        return_requested_at: order.return_request?.requested_at,
        return_handled_at: order.return_request?.handled_at,
      }));
      setOrders(mappedOrders);
      const reviewsMap: Record<string, Review> = {};
      const productIds: number[] = [];
      (reviewsData || []).forEach((rev: any) => {
        if (rev.product?.id) {
          if (rev.order?.id) {
            reviewsMap[`${rev.order.id}-${rev.product.id}`] = rev;
          } else {
            if (!reviewsMap[`product-${rev.product.id}`]) {
              reviewsMap[`product-${rev.product.id}`] = rev;
            }
          }
          productIds.push(rev.product.id);
        }
      });
      setUserReviewsMap(reviewsMap);
      setReviewedProductIds(productIds);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Không thể tải lịch sử đơn hàng.');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const handleCancelOrder = (orderId: number) => {
    setCancelModalOrderId(orderId);
    setCancelReasonOption('Đổi ý không muốn mua nữa');
    setCustomCancelReason('');
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancelModalOrderId) return;
    const finalReason = cancelReasonOption === 'Lý do khác' ? customCancelReason.trim() : cancelReasonOption;
    if (cancelReasonOption === 'Lý do khác' && !finalReason) {
      toast.error('Vui lòng nhập chi tiết lý do hủy đơn.');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const updatedOrder = await cancelOrder(cancelModalOrderId, finalReason);
      toast.success('Đã hủy đơn hàng thành công.');
      setSelectedOrder((prev: any) => (prev && prev.id === cancelModalOrderId ? updatedOrder : prev));
      setCancelModalOrderId(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleCompleteOrder = (orderId: number) => {
    openConfirm({
      title: 'Xác nhận nhận hàng',
      message:
        'Bạn có chắc chắn muốn xác nhận đã nhận hàng không? Hành động này đồng nghĩa với việc bạn đã nhận sản phẩm đầy đủ và hài lòng.',
      confirmText: 'Xác nhận nhận hàng',
      type: 'warning',
      onConfirm: async () => {
        closeConfirm();
        try {
          const updatedOrder = await completeOrder(orderId);
          toast.success('Đã nhận được hàng và hoàn thành đơn hàng!');
          setSelectedOrder((prev: any) => (prev && prev.id === orderId ? updatedOrder : prev));
          fetchOrders();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Không thể hoàn thành đơn hàng.');
        }
      },
    });
  };

  const handleDownloadInvoice = async (orderId: number | string) => {
    const loadingToast = toast.loading('Đang chuẩn bị hóa đơn...');
    try {
      const response = await api.get(`/orders/${orderId}/invoice`, {
        responseType: 'blob',
      });
      toast.dismiss(loadingToast);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Tải hóa đơn PDF thành công!');
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Lỗi khi tải hóa đơn:', error);
      toast.error('Không thể tải hóa đơn. Vui lòng thử lại sau.');
    }
  };

  const handleRepay = async (orderId: number) => {
    setIsRepaying(true);
    const loadingToast = toast.loading('Đang khởi tạo cổng thanh toán...');
    try {
      const res = await repayOrder(orderId);
      toast.dismiss(loadingToast);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.error('Không tìm thấy liên kết thanh toán.');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'Không thể tạo lại liên kết thanh toán.');
    } finally {
      setIsRepaying(false);
    }
  };

  const handleReorder = (order: any) => {
    if (!order.items || order.items.length === 0) {
      toast.error('Đơn hàng không có sản phẩm nào để mua lại.');
      return;
    }

    try {
      let addedCount = 0;
      order.items.forEach((item: any) => {
        const productId = String(item.product?.id || item.product_id || '');
        if (!productId) return;

        const variantId = item.variant ? item.variant.id : null;
        const compositeId = `${productId}-${variantId || 'base'}`;

        let material = 'Mặc định';
        if (item.variant?.attributes && Object.keys(item.variant.attributes).length > 0) {
          material = formatAttributes(item.variant.attributes);
        }

        const priceVal = Number(item.price || 0);
        const formattedPrice = formatPrice(priceVal);

        const cartItem = {
          id: compositeId,
          productId: productId,
          variantId: variantId,
          name: item.product?.name || 'Sản phẩm',
          material: material,
          price: formattedPrice,
          rawPrice: priceVal,
          image: getProductImage(item),
          quantity: item.quantity || 1,
          availableVariants: item.product?.variants || [],
        };

        useCartStore.getState().addItem(cartItem);
        addedCount++;
      });

      if (addedCount > 0) {
        toast.success('Đã thêm tất cả sản phẩm vào giỏ hàng thành công.');
        navigate('/cart');
      } else {
        toast.error('Không tìm thấy sản phẩm hợp lệ để mua lại.');
      }
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng.');
    }
  };

  const handleOpenReview = (order: any, product?: any, variant?: any) => {
    setReviewOrder(order);
    const targetProduct = product || order.items?.[0]?.product;
    if (!targetProduct || !targetProduct.id) {
      toast.error('Không tìm thấy thông tin sản phẩm để đánh giá.');
      return;
    }
    setSelectedProductToReview(targetProduct);
    const existingReview = getExistingReview(order.id, targetProduct.id);
    if (existingReview) {
      if ((existingReview.edit_count ?? 0) >= 1) {
        toast.error('Đánh giá này đã được chỉnh sửa 1 lần và không thể chỉnh sửa thêm.');
        setReviewOrder(null);
        setSelectedProductToReview(null);
        return;
      }
      setEditingReviewId(existingReview.id);
      setModalRating(existingReview.rating || 5);
      setModalComment(existingReview.comment || '');
      setModalIsAnonymous(existingReview.is_anonymous || false);
      setModalImages(existingReview.images || []);
    } else {
      setEditingReviewId(null);
      setModalRating(5);
      setModalComment('');
      setModalIsAnonymous(false);
      setModalImages([]);
    }

    const imgUrl =
      variant?.image_url ||
      (targetProduct?.images && targetProduct.images.length > 0
        ? targetProduct.images.find((img: any) => img.is_primary)?.image_url ||
          targetProduct.images[0].image_url
        : '') ||
      targetProduct?.image ||
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
    setReviewProductImage(imgUrl);

    setHoverRating(0);
    setModalImagePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setModalImageFiles([]);

    setReviewableStatus({});
    order.items?.forEach((item: any) => {
      const prodId = item.product.id;
      setReviewableStatus((prev) => ({
        ...prev,
        [prodId]: { loading: true, canReview: false },
      }));

      checkCanReview(prodId, order.id)
        .then((res) => {
          setReviewableStatus((prev) => ({
            ...prev,
            [prodId]: { loading: false, canReview: res.canReview, reason: res.reason },
          }));
        })
        .catch(() => {
          setReviewableStatus((prev) => ({
            ...prev,
            [prodId]: { loading: false, canReview: false, reason: 'Không thể kiểm tra' },
          }));
        });
    });
  };

  const handleUploadReviewImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (modalImages.length + modalImageFiles.length >= 3) {
      toast.error('Bạn chỉ được chọn tối đa 3 ảnh cho mỗi đánh giá');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file ảnh dạng PNG, JPEG, JPG, WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setModalImagePreviews((prev) => [...prev, previewUrl]);
    setModalImageFiles((prev) => [...prev, file]);
    e.target.value = '';
  };

  const handleSubmitModalReview = async () => {
    if (!selectedProductToReview) return;
    if (!modalComment.trim()) {
      toast.error('Vui lòng nhập nhận xét của bạn');
      return;
    }

    setSubmittingReview(true);
    try {
      let finalImageUrls: string[] = [...modalImages];
      if (modalImageFiles.length > 0) {
        const uploadResults = await Promise.all(
          modalImageFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload/image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data?.url as string;
          })
        );
        finalImageUrls = [...finalImageUrls, ...uploadResults.filter(Boolean)];
      }

      if (editingReviewId) {
        await updateReview(
          editingReviewId,
          modalRating,
          modalComment,
          finalImageUrls,
          modalIsAnonymous
        );
        toast.success('Cập nhật đánh giá thành công! Cảm ơn bạn.');
      } else {
        await createReview(
          selectedProductToReview.id,
          modalRating,
          modalComment,
          finalImageUrls,
          modalIsAnonymous,
          reviewOrder?.id
        );
        toast.success('Gửi đánh giá thành công! Cảm ơn bạn.');
      }

      fetchOrders();

      setReviewOrder(null);
      setSelectedProductToReview(null);
      setEditingReviewId(null);
      setModalComment('');
      setModalRating(5);
      setModalImages([]);
      setModalImageFiles([]);
      setModalImagePreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenReturnModal = (order: any) => {
    setReturnOrder(order);
    setSelectedReturnItems([]);
    const initialQtys: Record<number, number> = {};
    if (order.items) {
      order.items.forEach((i: any) => {
        initialQtys[i.id] = i.quantity || 1;
      });
    }
    setReturnQuantities(initialQtys);
    setReturnReason('Sản phẩm bị nứt, vỡ, trầy xước bề mặt gỗ');
    setReturnActionType('refund');
    setReturnDescription('');
    setReturnImages([]);
    setReturnImageFiles([]);
    setReturnImagePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  const handleUpdateReturnQuantity = (itemId: number, delta: number, maxQty: number) => {
    setReturnQuantities((prev) => {
      const current = prev[itemId] || maxQty;
      const next = Math.min(Math.max(current + delta, 1), maxQty);
      return { ...prev, [itemId]: next };
    });
  };

  const handleToggleReturnItem = (itemId: number) => {
    setSelectedReturnItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleAllReturnItems = () => {
    if (!returnOrder || !returnOrder.items) return;
    if (selectedReturnItems.length === returnOrder.items.length) {
      setSelectedReturnItems([]);
    } else {
      setSelectedReturnItems(returnOrder.items.map((item: any) => item.id));
    }
  };

  const handleUploadReturnImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file ảnh dạng PNG, JPEG, JPG, WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setReturnImagePreviews((prev) => [...prev, previewUrl]);
    setReturnImageFiles((prev) => [...prev, file]);
    e.target.value = '';
  };

  const handleSubmitReturnRequest = async () => {
    if (!returnOrder) return;
    if (selectedReturnItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm cần đổi trả');
      return;
    }
    if (!returnDescription.trim()) {
      toast.error('Vui lòng nhập mô tả chi tiết tình trạng lỗi');
      return;
    }

    setSubmittingReturn(true);
    try {
      let finalImageUrls: string[] = [...returnImages];
      if (returnImageFiles.length > 0) {
        const uploadResults = await Promise.all(
          returnImageFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload/image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data?.url as string;
          })
        );
        finalImageUrls = [...finalImageUrls, ...uploadResults.filter(Boolean)];
      }

      const itemsPayload = selectedReturnItems.map((itemId) => {
        const item = returnOrder.items?.find((i: any) => i.id === itemId);
        return {
          itemId,
          quantity: returnQuantities[itemId] ?? (item?.quantity || 1),
        };
      });

      const payload = {
        reason: returnReason,
        description: returnDescription,
        images: finalImageUrls,
        items: itemsPayload,
        action_type: returnActionType,
      };

      await requestReturnOrder(returnOrder.id, payload);

      const totalReturnValue = returnOrder.items
        ?.filter((item: any) => selectedReturnItems.includes(item.id))
        .reduce((sum: number, item: any) => {
          const qty = returnQuantities[item.id] ?? (item.quantity || 1);
          return sum + Number(item.price || 0) * qty;
        }, 0);

      const newRequest = {
        orderId: returnOrder.id,
        requestDate: new Date().toISOString(),
        selectedItems: selectedReturnItems.map((itemId) => {
          const item = returnOrder.items.find((i: any) => i.id === itemId);
          const qty = returnQuantities[itemId] ?? (item?.quantity || 1);
          return {
            itemId,
            productName: item?.product?.name || 'Sản phẩm',
            quantity: qty,
            price: item?.price || 0,
            image: getProductImage(item),
          };
        }),
        reason: returnReason,
        action_type: returnActionType,
        description: returnDescription,
        images: finalImageUrls,
        totalReturnValue,
      };

      setSubmittedReturnInfo(newRequest);
      setShowReturnSuccess(true);
      setReturnOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu đổi trả.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    let matchesStatus = true;
    if (selectedStatus === 'return_requested') {
      matchesStatus = order.return_request != null || (order.return_reason != null && order.return_reason !== '');
    } else if (selectedStatus !== 'all') {
      matchesStatus = order.status === selectedStatus;
    }

    let matchesSearch = true;
    if (orderSearchQuery.trim() !== '') {
      const q = orderSearchQuery.trim().toLowerCase();
      const matchId = String(order.id).toLowerCase().includes(q);
      const matchProduct = order.items?.some((item: any) =>
        item.product?.name?.toLowerCase().includes(q)
      );
      matchesSearch = matchId || matchProduct;
    }

    return matchesStatus && matchesSearch;
  });

  return {
    orders,
    isLoadingOrders,
    selectedOrder,
    setSelectedOrder,
    isRepaying,
    selectedStatus,
    setSelectedStatus,
    orderSearchQuery,
    setOrderSearchQuery,
    tabDrag,
    filteredOrders,
    fetchOrders,

    // Review Modal State & Handlers
    reviewOrder,
    setReviewOrder,
    selectedProductToReview,
    setSelectedProductToReview,
    reviewableStatus,
    modalRating,
    setModalRating,
    hoverRating,
    setHoverRating,
    modalComment,
    setModalComment,
    modalIsAnonymous,
    setModalIsAnonymous,
    submittingReview,
    reviewProductImage,
    modalImages,
    setModalImages,
    modalImageFiles,
    setModalImageFiles,
    modalImagePreviews,
    setModalImagePreviews,
    reviewedProductIds,
    userReviewsMap,
    editingReviewId,
    getExistingReview,

    // Return Modal State & Handlers
    returnOrder,
    setReturnOrder,
    selectedReturnItems,
    setSelectedReturnItems,
    returnQuantities,
    setReturnQuantities,
    returnReason,
    setReturnReason,
    returnActionType,
    setReturnActionType,
    returnDescription,
    setReturnDescription,
    returnImages,
    setReturnImages,
    returnImageFiles,
    setReturnImageFiles,
    returnImagePreviews,
    setReturnImagePreviews,
    submittingReturn,

    // Return Success Modal
    showReturnSuccess,
    setShowReturnSuccess,
    submittedReturnInfo,

    // Cancel Order Modal
    cancelModalOrderId,
    setCancelModalOrderId,
    cancelReasonOption,
    setCancelReasonOption,
    customCancelReason,
    setCustomCancelReason,
    isSubmittingCancel,

    // Confirm Modal
    confirmModal,
    closeConfirm,

    // Handlers
    handleCancelOrder,
    handleConfirmCancelOrder,
    handleCompleteOrder,
    handleDownloadInvoice,
    handleRepay,
    handleReorder,
    handleOpenReview,
    handleUploadReviewImage,
    handleSubmitModalReview,
    handleOpenReturnModal,
    handleUpdateReturnQuantity,
    handleToggleReturnItem,
    handleToggleAllReturnItems,
    handleUploadReturnImage,
    handleSubmitReturnRequest,
  };
}
