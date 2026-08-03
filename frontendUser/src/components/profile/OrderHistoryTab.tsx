import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Star, Camera, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '@/components/ConfirmModal';
import { useCartStore } from '@/store/useCartStore';
import {
  getMyOrders,
  cancelOrder,
  repayOrder,
  completeOrder,
  requestReturnOrder,
} from '@/services/order.service';
import { checkCanReview, createReview, getMyReviews } from '@/services/review.service';
import api from '@/services/api';

interface OrderHistoryTabProps {
  user: any;
}

const getProductImage = (item: any) => {
  if (item?.variant?.image_url) return item.variant.image_url;

  if (item?.product?.images && item.product.images.length > 0) {
    const primaryImg = item.product.images.find((img: any) => img.is_primary);
    if (primaryImg) return primaryImg.image_url;
    return item.product.images[0].image_url;
  }

  if (item?.product?.image) return item.product.image;
};

const formatAttributes = (attributes: any) => {
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

const OrderHistoryTab: React.FC<OrderHistoryTabProps> = ({ user }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

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

  // Modal thông báo đã gửi yêu cầu thành công
  const [showReturnSuccess, setShowReturnSuccess] = useState(false);
  const [submittedReturnInfo, setSubmittedReturnInfo] = useState<any>(null);

  // IDs của các sản phẩm đã được người dùng đánh giá
  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'danger',
    onConfirm: () => {},
  });

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
      const productIds = reviewsData.map((rev: any) => rev.product?.id).filter(Boolean);
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
    setConfirmModal({
      isOpen: true,
      title: 'Hủy đơn hàng',
      message: 'Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.',
      confirmText: 'Hủy đơn hàng',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const updatedOrder = await cancelOrder(orderId);
          toast.success('Đã hủy đơn hàng thành công.');
          setSelectedOrder((prev: any) => (prev && prev.id === orderId ? updatedOrder : prev));
          fetchOrders();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng.');
        }
      },
    });
  };

  const handleCompleteOrder = (orderId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận nhận hàng',
      message:
        'Bạn có chắc chắn muốn xác nhận đã nhận hàng không? Hành động này đồng nghĩa với việc bạn đã nhận sản phẩm đầy đủ và hài lòng.',
      confirmText: 'Xác nhận nhận hàng',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
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
        const formattedPrice = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(priceVal);

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

    const imgUrl =
      variant?.image_url ||
      (targetProduct?.images && targetProduct.images.length > 0
        ? targetProduct.images.find((img: any) => img.is_primary)?.image_url ||
          targetProduct.images[0].image_url
        : '') ||
      targetProduct?.image ||
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
    setReviewProductImage(imgUrl);

    setModalRating(5);
    setHoverRating(0);
    setModalComment('');
    setModalIsAnonymous(false);
    setModalImages([]);
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

      checkCanReview(prodId)
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

      await createReview(
        selectedProductToReview.id,
        modalRating,
        modalComment,
        finalImageUrls,
        modalIsAnonymous
      );
      toast.success('Gửi đánh giá thành công! Cảm ơn bạn.');

      const prodId = selectedProductToReview.id;
      setReviewedProductIds((prev) => [...prev, prodId]);
      setReviewableStatus((prev) => ({
        ...prev,
        [prodId]: { loading: true, canReview: false },
      }));
      checkCanReview(prodId)
        .then((res) =>
          setReviewableStatus((prev) => ({
            ...prev,
            [prodId]: { loading: false, canReview: res.canReview, reason: res.reason },
          }))
        )
        .catch(() =>
          setReviewableStatus((prev) => ({
            ...prev,
            [prodId]: { loading: false, canReview: false, reason: 'Không thể kiểm tra' },
          }))
        );

      setReviewOrder(null);
      setSelectedProductToReview(null);
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
        description: returnDescription,
        images: finalImageUrls,
        action_type: returnActionType,
        totalReturnValue: totalReturnValue || 0,
      };

      setSubmittedReturnInfo(newRequest);
      setShowReturnSuccess(true);
      setReturnOrder(null);
      setReturnImageFiles([]);
      setReturnImagePreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      toast.success('Gửi yêu cầu đổi trả thành công!');
      fetchOrders();
    } catch (error: any) {
      console.error('Error submitting return request:', error);
      toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu đổi trả.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Lọc đơn hàng theo tab & ô tìm kiếm
  const filteredOrders = orders.filter((o) => {
    let matchesStatus = true;
    if (selectedStatus === 'return_requested') {
      matchesStatus =
        o.status === 'return_pending' ||
        o.status === 'return_approved' ||
        o.status === 'return_rejected';
    } else if (selectedStatus !== 'all') {
      matchesStatus = o.status === selectedStatus;
    }

    let matchesSearch = true;
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toLowerCase();
      matchesSearch =
        String(o.id).toLowerCase().includes(q) ||
        o.items?.some((item: any) => item.product?.name?.toLowerCase().includes(q));
    }

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="bg-white border border-outline-variant/40 rounded-sm p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">local_shipping</span>
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline">
            Lịch sử đơn hàng của tôi
          </h3>
        </div>

        {/* Ô tìm kiếm đơn hàng */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Tìm theo mã đơn hoặc tên SP..."
            value={orderSearchQuery}
            onChange={(e) => setOrderSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant/60 rounded-sm text-xs focus:outline-none focus:border-primary transition"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-on-surface-variant/50 text-[18px]">
            search
          </span>
          {orderSearchQuery && (
            <button
              onClick={() => setOrderSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-on-surface-variant/50 hover:text-on-surface text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bộ Lọc Trạng Thái Đơn Hàng */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-outline-variant/20 scrollbar-thin">
        {[
          { id: 'all', label: 'Tất cả đơn', count: orders.length },
          { id: 'pending', label: 'Chờ xử lý', count: orders.filter((o) => o.status === 'pending').length },
          { id: 'confirmed', label: 'Đã xác nhận', count: orders.filter((o) => o.status === 'confirmed').length },
          { id: 'shipping', label: 'Đang giao', count: orders.filter((o) => o.status === 'shipping').length },
          { id: 'delivered', label: 'Đã giao hàng', count: orders.filter((o) => o.status === 'delivered').length },
          { id: 'completed', label: 'Hoàn thành', count: orders.filter((o) => o.status === 'completed').length },
          { id: 'cancelled', label: 'Đã hủy', count: orders.filter((o) => o.status === 'cancelled').length },
          {
            id: 'return_requested',
            label: 'Đổi trả',
            count: orders.filter(
              (o) =>
                o.status === 'return_pending' ||
                o.status === 'return_approved' ||
                o.status === 'return_rejected'
            ).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
              selectedStatus === tab.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface-container-low/40 text-on-surface-variant/80 border-outline-variant/30 hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedStatus === tab.id ? 'bg-white/20 text-white' : 'bg-outline-variant/30 text-on-surface'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Danh Sách Đơn Hàng */}
      <div className="space-y-4">
        {isLoadingOrders ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary font-light">sync</span>
            <p className="text-xs text-on-surface-variant/70">Đang tải lịch sử đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 px-4 border border-outline-variant/30 rounded-sm text-center bg-surface-container-low/20 space-y-3">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 font-light">
              receipt_long
            </span>
            <p className="text-sm text-on-surface-variant/70">
              {orderSearchQuery
                ? 'Không tìm thấy đơn hàng phù hợp với từ khóa.'
                : 'Bạn chưa có đơn hàng nào thuộc trạng thái này.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="border border-outline-variant/40 rounded-sm bg-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.035)] transition-all duration-300"
            >
              {/* Header đơn hàng */}
              <div className="p-4 bg-surface-container-low/20 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-on-surface">
                    Mã đơn: <span className="font-mono text-primary font-bold">#{order.id}</span>
                  </span>
                  <span className="text-on-surface-variant/60">•</span>
                  <span className="text-on-surface-variant/80">
                    {new Date(order.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      order.status === 'return_pending'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : order.status === 'return_approved'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : order.status === 'return_rejected'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : order.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : order.status === 'delivered'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : order.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : order.status === 'shipping'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : order.status === 'confirmed'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    {(order.status === 'return_pending' && 'Đang chờ đổi trả') ||
                      (order.status === 'return_approved' && 'Đổi trả đã được duyệt') ||
                      (order.status === 'return_rejected' && 'Đổi trả bị từ chối') ||
                      (order.status === 'pending' && 'Chờ xử lý') ||
                      (order.status === 'confirmed' && 'Đã xác nhận') ||
                      (order.status === 'shipping' && 'Đang giao') ||
                      (order.status === 'delivered' && 'Đã giao hàng') ||
                      (order.status === 'completed' && 'Hoàn thành') ||
                      (order.status === 'cancelled' && 'Đã hủy')}
                  </span>
                </div>
              </div>

              {/* Danh sách SP trong đơn */}
              <div className="divide-y divide-outline-variant/15 p-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <img
                        src={getProductImage(item)}
                        alt={item.product?.name}
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                        onError={(e: any) => {
                          e.target.src =
                            'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-semibold text-xs text-on-surface truncate">
                          {item.product?.name}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant/70">
                          Số lượng: <span className="font-semibold text-on-surface">{item.quantity}</span>
                        </p>
                        <p className="text-[11px] text-on-surface-variant/70">
                          Đơn giá:{' '}
                          <span className="font-semibold text-on-surface">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(Number(item.price))}
                          </span>
                        </p>
                      </div>
                    </div>

                    {(order.status === 'completed' || order.status === 'delivered') &&
                      (item.product?.id && reviewedProductIds.includes(item.product.id) ? (
                        <button
                          disabled
                          className="px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 shrink-0 cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[12px]">done</span>
                          Đã đánh giá
                        </button>
                      ) : (
                        <button
                          onClick={() => item.product && handleOpenReview(order, item.product, item.variant)}
                          className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[12px]">rate_review</span>
                          Đánh giá
                        </button>
                      ))}
                  </div>
                ))}
              </div>

              {/* Footer đơn hàng & tổng tiền */}
              <div className="p-4 bg-surface-container-low/10 border-t border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-on-surface-variant/80">Tổng thanh toán: </span>
                  <span className="font-bold text-sm text-primary font-headline">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(Number(order.total_amount))}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3.5 py-1.5 border border-outline-variant hover:bg-surface-container-low text-on-surface transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                  >
                    Xem chi tiết
                  </button>

                  {order.status === 'delivered' && (
                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                    >
                      Đã nhận hàng
                    </button>
                  )}

                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-3.5 py-1.5 border border-error/45 text-error hover:bg-error hover:text-white transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                    >
                      Hủy đơn
                    </button>
                  )}

                  {order.status === 'pending' &&
                    order.payment_status === 'pending' &&
                    (order.payment_method === 'vnpay' || order.payment_method === 'momo') && (
                      <button
                        onClick={() => handleRepay(order.id)}
                        disabled={isRepaying}
                        className="px-3.5 py-1.5 border border-emerald-600/45 text-emerald-600 hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                      >
                        Thanh toán ngay
                      </button>
                    )}

                  {(order.status === 'completed' || order.status === 'cancelled') && (
                    <button
                      onClick={() => handleReorder(order)}
                      className="px-3.5 py-1.5 border border-amber-600/45 text-amber-600 hover:bg-amber-600 hover:text-white transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                    >
                      Mua lại
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Đánh giá sản phẩm */}
      {reviewOrder && selectedProductToReview && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-sm w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-outline-variant/30 scale-100 transition-transform duration-300">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-[#FAF7F2]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#5A6B53] text-xl">rate_review</span>
                <h3 className="text-base font-bold uppercase tracking-wider text-[#5A6B53]">
                  Viết đánh giá sản phẩm
                </h3>
              </div>
              <button
                onClick={() => {
                  setReviewOrder(null);
                  setSelectedProductToReview(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1">
              <div className="space-y-5">
                <div className="flex items-center gap-3 bg-surface-container-low/20 p-3 border border-outline-variant/30 rounded-sm">
                  <img
                    src={reviewProductImage}
                    alt={selectedProductToReview?.name || 'Sản phẩm'}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                    onError={(e: any) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                    }}
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-[#5A6B53]">{selectedProductToReview?.name || 'Sản phẩm'}</h4>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                    Đánh giá của bạn:
                  </label>
                  <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = (hoverRating || modalRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setModalRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          className="cursor-pointer focus:outline-none transition-transform hover:scale-110 duration-150"
                        >
                          <Star
                            size={32}
                            className={`transition-all duration-150 ${
                              isActive
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.6)]'
                                : 'text-slate-300 fill-transparent hover:text-amber-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                    Nhận xét & Bình luận:
                  </label>
                  <textarea
                    rows={4}
                    value={modalComment}
                    onChange={(e) => setModalComment(e.target.value)}
                    placeholder="Hãy để lại ý kiến của bạn về chất liệu, độ hoàn thiện, quá trình đóng gói và vận chuyển của sản phẩm này..."
                    className="w-full p-3.5 rounded-sm border border-outline-variant/60 bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-[#5A6B53] placeholder:text-slate-400 text-xs leading-relaxed"
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                    Hình ảnh đính kèm (Tối đa 3 ảnh):
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {modalImagePreviews.map((previewUrl, index) => (
                      <div
                        key={index}
                        className="relative w-20 h-20 border border-outline-variant/50 rounded-sm overflow-hidden bg-slate-50 shrink-0"
                      >
                        <img src={previewUrl} alt={`review-img-${index}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] text-center py-0.5">
                          Chờ gửi
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(previewUrl);
                            setModalImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
                            setModalImageFiles((prev) => prev.filter((_, idx) => idx !== index));
                          }}
                          className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {modalImagePreviews.length < 3 && (
                      <label className="w-20 h-20 rounded-sm border border-dashed border-outline-variant/80 hover:border-[#5A6B53] flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-[#5A6B53] cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all shrink-0">
                        <Camera size={20} />
                        <span className="text-[9px] mt-1 font-semibold">Tải ảnh lên</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadReviewImage}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
                  <input
                    type="checkbox"
                    id="modal-anonymous-checkbox"
                    checked={modalIsAnonymous}
                    onChange={(e) => setModalIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-[#5A6B53] rounded border-outline-variant/60 focus:ring-[#5A6B53] cursor-pointer"
                  />
                  <label
                    htmlFor="modal-anonymous-checkbox"
                    className="text-xs text-on-surface-variant cursor-pointer select-none font-medium"
                  >
                    Đánh giá ẩn danh (Tên sẽ hiển thị dạng: <span className="font-semibold text-on-surface">Khách hàng</span>)
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setReviewOrder(null);
                  setSelectedProductToReview(null);
                }}
                className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitModalReview}
                disabled={submittingReview}
                className="px-5 py-2 bg-[#5A6B53] border border-[#5A6B53] text-white hover:bg-[#4a5a43] disabled:opacity-50 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1.5"
              >
                {submittingReview && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                )}
                Gửi đánh giá
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Chi tiết đơn hàng */}
      {selectedOrder && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-outline-variant/30 transition-transform duration-300 scale-100">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-surface-container-low/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
                <h3 className="text-base font-bold uppercase tracking-wider text-on-surface">
                  Chi tiết đơn hàng <span className="font-mono text-primary font-bold">#{selectedOrder.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low/20 p-4 border border-outline-variant/30 rounded-sm text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                      Ngày đặt:
                    </span>
                    <span className="text-on-surface font-medium">
                      {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                      Trạng thái đơn hàng:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        selectedOrder.status === 'return_pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : selectedOrder.status === 'return_approved'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : selectedOrder.status === 'return_rejected'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : selectedOrder.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : selectedOrder.status === 'delivered'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : selectedOrder.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : selectedOrder.status === 'shipping'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : selectedOrder.status === 'confirmed'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      {(selectedOrder.status === 'return_pending' && 'Đang chờ đổi trả') ||
                        (selectedOrder.status === 'return_approved' && 'Đổi trả đã được duyệt') ||
                        (selectedOrder.status === 'return_rejected' && 'Đổi trả bị từ chối') ||
                        (selectedOrder.status === 'pending' && 'Chờ xử lý') ||
                        (selectedOrder.status === 'confirmed' && 'Đã xác nhận') ||
                        (selectedOrder.status === 'shipping' && 'Đang giao') ||
                        (selectedOrder.status === 'delivered' && 'Đã giao hàng') ||
                        (selectedOrder.status === 'completed' && 'Hoàn thành') ||
                        (selectedOrder.status === 'cancelled' && 'Đã hủy')}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                      Hình thức thanh toán:
                    </span>
                    <span className="text-on-surface font-medium uppercase tracking-wide">
                      {selectedOrder.payment_method === 'cod' && 'Thanh toán khi nhận hàng (COD)'}
                      {selectedOrder.payment_method === 'vnpay' && 'Thanh toán qua VNPay'}
                      {selectedOrder.payment_method === 'momo' && 'Thanh toán qua MoMo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                      Trạng thái thanh toán:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        selectedOrder.payment_status === 'paid'
                          ? 'bg-primary/8 text-primary border-primary/20'
                          : 'bg-error/8 text-error border-error/20'
                      }`}
                    >
                      {selectedOrder.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thông tin vận chuyển */}
              <div className="space-y-2.5 text-sm">
                <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface border-b border-outline-variant/30 pb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">local_shipping</span>
                  Thông tin giao hàng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white p-2 text-on-surface-variant">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">
                      Số điện thoại nhận hàng
                    </span>
                    <span className="font-semibold text-on-surface text-sm">{selectedOrder.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">
                      Địa chỉ giao hàng
                    </span>
                    <span className="text-on-surface text-sm">{selectedOrder.shipping_address}</span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="col-span-1 sm:col-span-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">
                        Ghi chú đơn hàng
                      </span>
                      <p className="text-on-surface bg-surface-container-low/30 p-2.5 rounded-sm border border-outline-variant/20 italic text-sm mt-0.5">
                        "{selectedOrder.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface border-b border-outline-variant/30 pb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
                  Danh sách sản phẩm ({selectedOrder.items?.length || 0})
                </h4>
                <div className="divide-y divide-outline-variant/20 max-h-[300px] overflow-y-auto border border-outline-variant/25 rounded-sm bg-white shadow-sm">
                  {selectedOrder.items?.map((item: any) => {
                    const material =
                      item.variant?.attributes && Object.keys(item.variant.attributes).length > 0
                        ? formatAttributes(item.variant.attributes)
                        : 'Mặc định';

                    return (
                      <div
                        key={item.id}
                        className="p-4 flex items-center gap-4 hover:bg-surface-container-low/10 transition-colors"
                      >
                        <img
                          src={getProductImage(item)}
                          alt={item.product?.name || 'Sản phẩm'}
                          loading="lazy"
                          decoding="async"
                          className="w-16 h-16 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                          onError={(e: any) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm text-on-surface truncate">
                            {item.product?.name || 'Sản phẩm'}
                          </h5>
                          <p className="text-xs text-on-surface-variant/70 mt-0.5">Loại: {material}</p>
                          <p className="text-xs text-on-surface-variant/70 mt-0.5">
                            Số lượng:{' '}
                            <span className="font-semibold text-on-surface">{item.quantity}</span>
                          </p>
                          {(selectedOrder.status === 'completed' || selectedOrder.status === 'delivered') &&
                            (item.product?.id && reviewedProductIds.includes(item.product.id) ? (
                              <button
                                disabled
                                className="mt-1.5 px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 w-fit cursor-not-allowed"
                              >
                                <span className="material-symbols-outlined text-[12px]">done</span>
                                Đã đánh giá
                              </button>
                            ) : (
                              <button
                                onClick={() => item.product && handleOpenReview(selectedOrder, item.product, item.variant)}
                                className="mt-1.5 px-3 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1 w-fit"
                              >
                                <span className="material-symbols-outlined text-[12px]">rate_review</span>
                                Đánh giá
                              </button>
                            ))}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-on-surface">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                              Number(item.price)
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Thông tin yêu cầu đổi trả nếu có */}
              {(() => {
                const returnReq = selectedOrder.return_request || (
                  ((selectedOrder as any).return_items || (selectedOrder as any).return_reason) ? {
                    action_type: (selectedOrder as any).return_action_type || 'refund',
                    reason: (selectedOrder as any).return_reason || 'Yêu cầu đổi trả',
                    description: (selectedOrder as any).return_description || '',
                    items: (selectedOrder as any).return_items,
                    rejected_reason: (selectedOrder as any).rejected_reason,
                    images: (selectedOrder as any).return_images || [],
                  } : null
                );

                if (!returnReq) return null;

                return (
                  <div className="border border-red-200 bg-red-50/40 p-4 rounded-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-red-200/60 pb-2">
                      <div className="flex items-center gap-2 text-red-700 font-bold uppercase tracking-wider text-xs">
                        <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                        Thông tin yêu cầu đổi trả
                      </div>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                          selectedOrder.status === 'return_approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : selectedOrder.status === 'return_rejected'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}
                      >
                        {selectedOrder.status === 'return_approved'
                          ? 'Chấp nhận đổi trả'
                          : selectedOrder.status === 'return_rejected'
                          ? 'Bị từ chối'
                          : 'Chờ xử lý'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface-variant">
                      <div>
                        <span className="font-semibold text-on-surface">Phương thức yêu cầu:</span>{' '}
                        <span className="font-medium text-red-600">
                          {returnReq.action_type === 'exchange'
                            ? 'Đổi mới 1-1'
                            : 'Trả hàng & Hoàn tiền'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-on-surface">Lý do chính:</span>{' '}
                        {returnReq.reason}
                      </div>
                    </div>

                    {returnReq.description && (
                      <div className="text-xs text-on-surface-variant">
                        <span className="font-semibold text-on-surface">Mô tả chi tiết:</span>{' '}
                        <p className="italic bg-white/70 p-2 rounded border border-red-100 mt-1">
                          "{returnReq.description}"
                        </p>
                      </div>
                    )}

                    {/* Danh sách sản phẩm được yêu cầu đổi trả */}
                    <div className="space-y-2 border-t border-red-200/60 pt-3">
                      <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                        Danh sách sản phẩm yêu cầu đổi trả:
                      </span>
                      <div className="divide-y divide-red-200/40 bg-white/80 rounded border border-red-200/60 overflow-hidden">
                        {(() => {
                          const parseReturnItemsHelper = (raw: any): { itemId: number; quantity: number | null }[] => {
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

                          const rawItems = selectedOrder.return_request?.items || selectedOrder.return_items;
                          const parsedReturnItems = parseReturnItemsHelper(rawItems);

                          return selectedOrder.items?.map((item: any) => {
                            let isReturned = false;
                            let returnedQty = item.quantity || 1;

                            if (parsedReturnItems.length === 0 && selectedOrder.return_request) {
                              isReturned = true;
                            } else {
                              const match = parsedReturnItems.find((ri) => Number(ri.itemId) === Number(item.id));

                              if (match) {
                                isReturned = true;
                                returnedQty = match.quantity
                                  ? Math.min(Math.max(Number(match.quantity), 1), item.quantity)
                                  : item.quantity;
                              }
                            }

                            if (!isReturned) return null;

                          const totalItemPrice = Number(item.price || 0) * returnedQty;

                          return (
                            <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <img
                                  src={getProductImage(item)}
                                  alt={item.product?.name || 'Sản phẩm'}
                                  className="w-12 h-12 object-cover rounded border border-outline-variant/20 shrink-0 bg-surface-container-low"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h6 className="font-bold text-on-surface truncate text-xs">
                                      {item.product?.name || 'Sản phẩm'}
                                    </h6>
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded border border-red-200 shrink-0">
                                      Sản phẩm lỗi
                                    </span>
                                  </div>
                                  {item.variant?.attributes && (
                                    <p className="text-[10px] text-on-surface-variant/70 mt-0.5 truncate">
                                      Sản phẩm: {formatAttributes(item.variant.attributes)}
                                    </p>
                                  )}
                                  <div className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-3">
                                    <span>
                                      Số lượng trả: <strong className="text-red-600 font-bold">x{returnedQty}</strong>{' '}
                                      <span className="text-on-surface-variant/60 font-normal">(Đã mua: x{item.quantity})</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-red-600 text-xs block">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalItemPrice)}
                                </span>
                                <span className="text-[10px] text-on-surface-variant/70">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.price || 0))}/cái
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      </div>
                    </div>

                  {returnReq.rejected_reason && (
                    <div className="text-xs text-red-700 bg-red-100/80 p-2.5 rounded border border-red-200 space-y-1">
                      <span className="font-bold">Lý do Admin từ chối:</span>
                      <p className="italic">{returnReq.rejected_reason}</p>
                    </div>
                  )}

                  {returnReq.images && returnReq.images.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-on-surface">
                        Hình ảnh bằng chứng:
                      </span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {returnReq.images.map((img: string, idx: number) => (
                          <a key={idx} href={img} target="_blank" rel="noreferrer">
                            <img
                              src={img}
                              alt={`Lỗi ${idx + 1}`}
                              className="w-14 h-14 object-cover rounded border border-red-200 hover:scale-105 transition-transform"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

              {/* Tóm tắt chi phí */}
              <div className="space-y-2 border-t border-outline-variant/30 pt-4 text-sm font-medium">
                <div className="flex justify-between text-on-surface-variant/90">
                  <span>Tổng tiền sản phẩm:</span>
                  <span>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      selectedOrder.items?.reduce(
                        (total: number, item: any) => total + Number(item.price) * item.quantity,
                        0
                      ) || 0
                    )}
                  </span>
                </div>
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-error font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">sell</span>
                      Mã giảm giá ({selectedOrder.voucher_code}):
                    </span>
                    <span>
                      -
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        Number(selectedOrder.discount_amount)
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant/90">
                  <span>Phí vận chuyển:</span>
                  <span className="text-primary font-bold">Miễn phí</span>
                </div>
                <div className="flex justify-between text-base font-bold text-on-surface border-t border-outline-variant/20 pt-2.5">
                  <span>Tổng thanh toán:</span>
                  <span className="text-primary font-headline">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      Number(selectedOrder.total_amount)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex flex-wrap items-center justify-end gap-3">
              {selectedOrder.status === 'delivered' && (
                <button
                  onClick={() => handleCompleteOrder(selectedOrder.id)}
                  className="px-5 py-2 bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
                >
                  Đã nhận hàng
                </button>
              )}

              {selectedOrder.status === 'pending' && (
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="px-5 py-2 border border-error/45 text-error hover:bg-error hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
                >
                  Hủy đơn hàng
                </button>
              )}

              {selectedOrder.status === 'completed' && (
                <button
                  onClick={() => {
                    handleOpenReturnModal(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="px-5 py-2 border border-red-600/45 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
                >
                  Yêu cầu đổi trả
                </button>
              )}

              <button
                onClick={() => handleDownloadInvoice(selectedOrder.id)}
                className="px-5 py-2 border border-primary/45 text-primary hover:bg-primary hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                Tải hóa đơn (PDF)
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Yêu cầu đổi trả */}
      {returnOrder && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-outline-variant/30 transition-transform duration-300 scale-100">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-surface-container-low/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-xl">assignment_return</span>
                <h3 className="text-base font-bold uppercase tracking-wider text-on-surface">
                  Yêu cầu đổi trả hàng lỗi <span className="font-mono text-red-600 font-bold">#{returnOrder.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setReturnOrder(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-sm">
              <div className="bg-red-50/50 border border-red-200/60 p-4 rounded-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-red-900 text-xs uppercase tracking-wider">
                    Chính sách đổi trả hàng lỗi
                  </h4>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Nội thất gỗ cao cấp hỗ trợ đổi mới 1-1 hoặc hoàn tiền đối với các sản phẩm gặp lỗi do nhà sản xuất (nứt, vỡ gỗ, trầy xước sơn bề mặt nặng, sai lệch kích thước...) trong vòng 7 ngày kể từ khi nhận hàng. Vui lòng cung cấp hình ảnh thực tế để được xử lý nhanh nhất.
                  </p>
                </div>
              </div>

              {/* Danh sách sản phẩm đổi trả */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                    Chọn sản phẩm cần đổi trả ({selectedReturnItems.length}/{returnOrder.items?.length || 0}):
                  </label>
                  {returnOrder.items && returnOrder.items.length > 1 && (
                    <button
                      type="button"
                      onClick={handleToggleAllReturnItems}
                      className="text-xs text-primary hover:underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {selectedReturnItems.length === returnOrder.items.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>

                {selectedReturnItems.length === 0 && (
                  <p className="text-xs text-red-600 font-medium bg-red-50/80 px-3 py-2 rounded-xs border border-red-200/80 flex items-center gap-1.5 animate-pulse">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Vui lòng tích chọn ít nhất 1 sản phẩm cần đổi trả trước khi gửi yêu cầu.
                  </p>
                )}

                <div className="border border-outline-variant/30 rounded-sm divide-y divide-outline-variant/20 overflow-hidden bg-surface-container-lowest/50">
                  {returnOrder.items?.map((item: any) => {
                    const isSelected = selectedReturnItems.includes(item.id);
                    const currentQty = returnQuantities[item.id] ?? item.quantity;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleReturnItem(item.id)}
                        className={`p-3.5 flex items-center gap-4 cursor-pointer transition-colors hover:bg-surface-container-low/20 ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4.5 h-4.5 rounded-sm border-outline text-primary focus:ring-primary cursor-pointer"
                        />
                        <img
                          src={getProductImage(item)}
                          alt={item.product?.name || 'Sản phẩm'}
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 object-cover rounded-sm border border-outline-variant/15 shrink-0 bg-surface-container-low"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-xs text-on-surface truncate">
                            {item.product?.name || 'Sản phẩm'}
                          </h5>
                          <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
                            Sản phẩm:{' '}
                            {item.variant?.attributes
                              ? formatAttributes(item.variant.attributes)
                              : 'Mặc định'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant/70 mt-1">
                            Đã mua: <strong className="text-on-surface font-semibold">{item.quantity}</strong>
                          </p>
                        </div>

                        {isSelected && (
                          <div
                            className="flex items-center gap-1 bg-white border border-outline/30 rounded-xs p-1 shrink-0 shadow-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-on-surface-variant font-medium mr-1 hidden sm:inline">Số lượng lỗi:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateReturnQuantity(item.id, -1, item.quantity)}
                              disabled={currentQty <= 1}
                              className="w-6 h-6 flex items-center justify-center bg-surface-container-high hover:bg-outline/20 text-on-surface font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed rounded-xs transition-colors"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-rose-600">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateReturnQuantity(item.id, 1, item.quantity)}
                              disabled={currentQty >= item.quantity}
                              className="w-6 h-6 flex items-center justify-center bg-surface-container-high hover:bg-outline/20 text-on-surface font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed rounded-xs transition-colors"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lý do đổi trả */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                  Lý do đổi trả:
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-sm transition-all duration-200 text-xs"
                >
                  <option value="Sản phẩm bị nứt, vỡ, trầy xước bề mặt gỗ">
                    Sản phẩm bị nứt, vỡ, trầy xước bề mặt gỗ
                  </option>
                  <option value="Sai lệch kích thước, màu sắc so với mô tả">
                    Sai lệch kích thước, màu sắc so với mô tả
                  </option>
                  <option value="Thiếu phụ kiện, ốc vít lắp đặt đi kèm">
                    Thiếu phụ kiện, ốc vít lắp đặt đi kèm
                  </option>
                  <option value="Sản phẩm bị cong vênh, không lắp ráp được">
                    Sản phẩm bị cong vênh, không lắp ráp được
                  </option>
                  <option value="Lý do khác">Lý do khác (Vui lòng ghi rõ ở mô tả bên dưới)</option>
                </select>
              </div>

              {/* Phương án đổi trả mong muốn */}
              <div className="space-y-2.5">
                <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant block">
                  Phương án giải quyết mong muốn:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setReturnActionType('exchange')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition-all flex items-start gap-3 select-none ${
                      returnActionType === 'exchange'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-outline hover:bg-surface-container-low/20 text-on-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={returnActionType === 'exchange'}
                      onChange={() => {}}
                      className="w-4 h-4 text-primary focus:ring-primary cursor-pointer mt-0.5"
                    />
                    <div>
                      <h5 className="font-bold text-xs">Đổi mới sản phẩm 1-1</h5>
                      <p className="text-[10px] text-on-surface-variant/70 mt-1 leading-relaxed">
                        Nhận lại sản phẩm mới cùng loại nếu sản phẩm nhận được gặp lỗi do nhà sản xuất (miễn phí vận chuyển thu hồi & đổi mới).
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setReturnActionType('refund')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition-all flex items-start gap-3 select-none ${
                      returnActionType === 'refund'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-outline hover:bg-surface-container-low/20 text-on-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={returnActionType === 'refund'}
                      onChange={() => {}}
                      className="w-4 h-4 text-primary focus:ring-primary cursor-pointer mt-0.5"
                    />
                    <div>
                      <h5 className="font-bold text-xs">Trả hàng và hoàn tiền</h5>
                      <p className="text-[10px] text-on-surface-variant/70 mt-1 leading-relaxed">
                        Thu hồi sản phẩm lỗi và hoàn trả lại số tiền tương ứng của sản phẩm đã mua qua hình thức chuyển khoản ngân hàng.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mô tả chi tiết lỗi */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                  Mô tả chi tiết tình trạng lỗi (Bắt buộc):
                </label>
                <textarea
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="Ví dụ: Mặt bàn gỗ sồi bị nứt dài khoảng 10cm ở góc phải..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-sm transition-all duration-200 text-xs leading-relaxed"
                />
              </div>

              {/* Tải ảnh minh họa lỗi */}
              <div className="space-y-3">
                <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                  Hình ảnh minh họa tình trạng lỗi:
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {returnImagePreviews.map((previewUrl, index) => (
                    <div
                      key={index}
                      className="relative aspect-square border border-outline-variant/40 rounded-sm overflow-hidden bg-surface-container-low group"
                    >
                      <img src={previewUrl} alt="Lỗi sản phẩm" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] text-center py-0.5">
                        Chờ gửi
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(previewUrl);
                          setReturnImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
                          setReturnImageFiles((prev) => prev.filter((_, idx) => idx !== index));
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {returnImagePreviews.length < 4 && (
                    <label className="aspect-square border border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer text-on-surface-variant/70 hover:text-primary">
                      <Camera className="w-5 h-5 font-light" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider">Tải ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadReturnImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex items-center justify-end gap-3">
              <button
                onClick={() => setReturnOrder(null)}
                className="px-4 py-2 border border-outline hover:bg-surface-container-low text-on-surface text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmitReturnRequest}
                disabled={submittingReturn}
                className="px-5 py-2 bg-red-600 border border-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1.5"
              >
                {submittingReturn && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                )}
                Gửi yêu cầu đổi trả
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Yêu cầu đổi trả thành công */}
      {showReturnSuccess && submittedReturnInfo && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-sm w-full max-w-md shadow-2xl flex flex-col border border-outline-variant/30 transition-transform duration-300 scale-100 overflow-hidden">
            <div className="p-6 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold uppercase tracking-wider text-on-surface">
                  Đã gửi yêu cầu đổi trả
                </h3>
                <p className="text-xs text-on-surface-variant/80">
                  Mã đơn hàng:{' '}
                  <strong className="text-primary font-mono">#{submittedReturnInfo.orderId}</strong>
                </p>
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-sm font-medium inline-block">
                  Trạng thái: Chờ bộ phận kỹ thuật xác nhận
                </p>
              </div>

              {/* Tóm tắt sản phẩm đổi trả */}
              <div className="text-left bg-surface-container-low/40 p-3.5 rounded-sm border border-outline-variant/20 text-xs space-y-2.5">
                <div className="flex items-center justify-between font-bold text-[10px] text-on-surface uppercase tracking-wider border-b border-outline-variant/20 pb-2">
                  <span>Sản phẩm đổi trả ({submittedReturnInfo.selectedItems?.length || 0})</span>
                  <span>Phương án: {submittedReturnInfo.action_type === 'refund' ? 'Trả hàng' : 'Đổi mới'}</span>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {submittedReturnInfo.selectedItems?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-8 h-8 object-cover rounded border border-outline-variant/20 shrink-0 bg-surface-container-low"
                        />
                        <div className="truncate">
                          <p className="font-semibold text-on-surface truncate text-xs">{item.productName}</p>
                          <p className="text-[10px] text-on-surface-variant/70">Số lượng: x{item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-left bg-surface-container-low/30 p-4 rounded-sm border border-outline-variant/20 text-xs space-y-3">
                <h4 className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                  Hướng dẫn các bước tiếp theo:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-on-surface-variant leading-relaxed">
                  <li>
                    <strong>Giữ nguyên hiện trạng:</strong> Vui lòng không tiếp tục tự ý lắp ráp hoặc sửa chữa sản phẩm bị lỗi.
                  </li>
                  <li>
                    <strong>Đóng gói lại sản phẩm:</strong> Để sản phẩm bị lỗi cùng các phụ kiện đi kèm vào lại thùng carton cũ.
                  </li>
                  <li>
                    <strong>Kỹ thuật viên liên hệ:</strong> CSKH sẽ gọi điện xác nhận lỗi trong 24h làm việc.
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setShowReturnSuccess(false)}
                className="w-full py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-primary/95 transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default OrderHistoryTab;
