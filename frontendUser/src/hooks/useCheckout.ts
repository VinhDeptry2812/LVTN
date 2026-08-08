import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { createOrder } from '@/services/order.service';
import api from '@/services/api';
import { getAddresses, type AddressData } from '@/services/address.service';
import toast from 'react-hot-toast';
import gsap from 'gsap';

export interface AppliedVoucher {
  id: number;
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discountAmount: number;
}

export function useCheckout() {
  const navigate = useNavigate();
  const checkoutRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');

  // Address Data States
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<AddressData[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // Fetch Provinces
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/?depth=2')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(err => console.error("Failed to fetch provinces", err));
  }, []);

  // Fetch Saved Addresses
  useEffect(() => {
    if (user) {
      setIsLoadingAddresses(true);
      getAddresses()
        .then((data) => {
          setSavedAddresses(data);
        })
        .catch((err) => console.error('Failed to fetch addresses', err))
        .finally(() => setIsLoadingAddresses(false));
    }
  }, [user]);

  // Pre-fill basic info if fields are empty and user is logged in
  useEffect(() => {
    if (user) {
      if (!fullName && user.name) setFullName(user.name);
      if (!email && user.email) setEmail(user.email);
      if (!phone && user.phone) setPhone(user.phone);
    }
  }, [user]);

  const applySavedAddressToForm = (addr: AddressData) => {
    setFullName(addr.name);
    setPhone(addr.phone);
    setAddress(addr.detail || '');

    const pCode = addr.province_code || '';
    const wCode = addr.ward_code || '';

    setSelectedProvince(pCode);
    setCity(addr.province_name || '');
    setSelectedDistrict('');
    setDistrict('');
    setDistricts([]);

    const province = provinces.find(p => p.code.toString() === pCode.toString());
    if (province) {
      const pWards = province.wards || [];
      setWards(pWards);
      setSelectedWard(wCode);
      setWard(addr.ward_name || '');
    } else {
      setWards([]);
      setSelectedWard('');
      setWard('');
    }
  };

  useEffect(() => {
    if (user && provinces.length > 0 && savedAddresses.length > 0 && !hasAutoFilled) {
      const defaultAddr = savedAddresses.find(addr => addr.is_default);
      if (defaultAddr) {
        applySavedAddressToForm(defaultAddr);
        setHasAutoFilled(true);
      }
    }
  }, [user, provinces, savedAddresses, hasAutoFilled]);

  const handleSelectSavedAddress = (addr: AddressData) => {
    applySavedAddressToForm(addr);
    setShowAddressModal(false);
    toast.success('Đã áp dụng địa chỉ giao hàng.');
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value;
    setSelectedProvince(provinceCode);
    const province = provinces.find(p => p.code.toString() === provinceCode);
    if (province) {
      setCity(province.name);
      setWards(province.wards || []);
      setSelectedWard('');
      setWard('');
    } else {
      setCity('');
      setWards([]);
      setSelectedWard('');
      setWard('');
    }
    setSelectedDistrict('');
    setDistrict('');
    setDistricts([]);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardCode = e.target.value;
    setSelectedWard(wardCode);
    const wardObj = wards.find(w => w.code.toString() === wardCode);
    if (wardObj) {
      setWard(wardObj.name);
    }
  };

  // Cart & Order Calculations
  const { items, clearCart, orderNote, setOrderNote, updateVariant, updateQuantity, removeItem } = useCartStore();

  const subtotal = items.reduce((total, item) => total + item.rawPrice * item.quantity, 0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay'>('cod');
  const [discountCode, setDiscountCode] = useState('');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Voucher State
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [activeVouchers, setActiveVouchers] = useState<any[]>([]);
  const [isLoadingActiveVouchers, setIsLoadingActiveVouchers] = useState(false);

  // Filter eligible vouchers count
  const eligibleVouchersCount = useMemo(() => {
    return activeVouchers.filter((v) => {
      const minVal = Number(v.min_order_value || 0);
      const isUsedByUser = Boolean(v.is_used_by_user);
      return subtotal >= minVal && !isUsedByUser;
    }).length;
  }, [activeVouchers, subtotal]);

  // Sort vouchers for modal
  const sortedModalVouchers = useMemo(() => {
    return activeVouchers
      .filter((v) => !v.is_used_by_user)
      .sort((a, b) => {
        const minA = Number(a.min_order_value || 0);
        const minB = Number(b.min_order_value || 0);
        const eligibleA = subtotal >= minA;
        const eligibleB = subtotal >= minB;
        if (eligibleA && !eligibleB) return -1;
        if (!eligibleA && eligibleB) return 1;
        return 0;
      });
  }, [activeVouchers, subtotal]);

  useEffect(() => {
    const fetchActiveVouchers = async () => {
      try {
        setIsLoadingActiveVouchers(true);
        const res = await api.get('/vouchers/active', {
          params: { userId: user?.id },
        });
        setActiveVouchers(res.data || []);
      } catch (err) {
        console.error('Lỗi lấy danh sách mã giảm giá:', err);
      } finally {
        setIsLoadingActiveVouchers(false);
      }
    };
    fetchActiveVouchers();
  }, [user?.id]);

  // Shipping Fee State
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [isBulky, setIsBulky] = useState<boolean>(false);
  const [isLoadingShipping, setIsLoadingShipping] = useState<boolean>(false);
  const [unsupportedError, setUnsupportedError] = useState<string | null>(null);

  const discountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  // Order Success Modal & Submitting State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply Voucher Handler
  const handleApplyVoucher = async (codeToApply?: string) => {
    const targetCode = typeof codeToApply === 'string' ? codeToApply.trim().toUpperCase() : discountCode.trim().toUpperCase();
    if (!targetCode) {
      toast.error('Vui lòng nhập hoặc chọn mã giảm giá.');
      return;
    }

    setDiscountCode(targetCode);

    try {
      setIsValidatingVoucher(true);
      const res = await api.post('/vouchers/validate', {
        code: targetCode,
        orderValue: subtotal,
        userId: user?.id,
      });
      setAppliedVoucher(res.data);
      toast.success(`Áp dụng mã giảm giá ${res.data.code} thành công!`);
      setIsVoucherModalOpen(false);
    } catch (error: any) {
      console.error('Lỗi áp dụng voucher:', error);
      const errMsg = error.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';
      toast.error(errMsg);
      setAppliedVoucher(null);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setDiscountCode('');
    toast.success('Đã hủy áp dụng mã giảm giá.');
  };

  // Revalidate voucher on subtotal change
  useEffect(() => {
    if (appliedVoucher) {
      const revalidateVoucher = async () => {
        try {
          const res = await api.post('/vouchers/validate', {
            code: appliedVoucher.code,
            orderValue: subtotal,
            userId: user?.id,
          });
          setAppliedVoucher(res.data);
        } catch (error: any) {
          const errMsg = error.response?.data?.message || 'Mã giảm giá không còn khả dụng.';
          toast.error(`${errMsg} Đã tự động hủy áp dụng.`);
          setAppliedVoucher(null);
        }
      };
      revalidateVoucher();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, user?.id]);

  // Fetch shipping fee
  useEffect(() => {
    const fetchShippingFee = async () => {
      if (items.length === 0) {
        setShippingFee(0);
        setIsBulky(false);
        setUnsupportedError(null);
        return;
      }
      try {
        setIsLoadingShipping(true);
        setUnsupportedError(null);
        const itemsPayload = items.map(item => ({
          product_id: parseInt(item.id.toString(), 10),
          quantity: item.quantity
        }));
        
        const fullAddr = [address, ward, city].filter(Boolean).join(', ');
        const res = await api.post('/orders/calculate-shipping', {
          items: itemsPayload,
          province: fullAddr || city || ''
        });
        setShippingFee(res.data.shipping_fee);
        setIsBulky(res.data.is_bulky);
      } catch (error: any) {
        console.error('Failed to calculate shipping fee', error);
        if (error.response?.data?.message) {
          setUnsupportedError(error.response.data.message);
        }
      } finally {
        setIsLoadingShipping(false);
      }
    };

    fetchShippingFee();
  }, [items, city, ward, address]);

  // Update item quantity
  const handleUpdateQuantity = (id: string, currentQty: number, delta: number, item: any) => {
    const newQty = currentQty + delta;
    if (newQty < 1) {
      removeItem(id);
      toast.success('Đã xóa sản phẩm khỏi đơn hàng.');
    } else {
      const variant = item.availableVariants?.find((v: any) => v.id === item.variantId);
      const maxStock = variant ? (variant.stock || 0) : 9999;
      if (newQty > maxStock) {
        toast.error(`Sản phẩm chỉ còn tối đa ${maxStock} sản phẩm trong kho.`);
        return;
      }
      updateQuantity(id, newQty);
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !address || !email || !city || !ward) {
      toast.error('Vui lòng điền đầy đủ thông tin giao hàng.');
      return;
    }

    if (unsupportedError) {
      toast.error(unsupportedError);
      return;
    }

    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error('Số điện thoại không đúng định dạng Việt Nam (Ví dụ: 0912345678).');
      return;
    }

    if (items.length === 0) {
      toast.error('Giỏ hàng của bạn đang trống.');
      return;
    }

    if (!user) {
      toast.error('Bạn cần đăng nhập để thực hiện bước tiếp theo.');
      return;
    }

    if (user.role === 'admin' || user.role === 'staff') {
      toast.error('Tài khoản Quản trị/Nhân viên không được phép đặt hàng mua sắm cá nhân. Vui lòng sử dụng tài khoản Khách hàng.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fullAddress = `${address}, ${ward}, ${city}`;

      const orderPayload = {
        shipping_address: fullAddress,
        phone,
        notes: orderNote,
        payment_method: paymentMethod as any,
        voucher_code: appliedVoucher ? appliedVoucher.code : undefined,
        items: items.map(item => ({
          product_id: parseInt(item.id.toString(), 10),
          variant_id: item.variantId ? parseInt(item.variantId.toString(), 10) : undefined,
          quantity: item.quantity,
          price: item.rawPrice
        }))
      };

      const result = await createOrder(orderPayload);

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      clearCart();
      setShowSuccessModal(true);
      setTimeout(() => {
        gsap.fromTo(
          '.success-dialog',
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
        );
      }, 100);
    } catch (error: any) {
      console.error('Lỗi đặt hàng:', error);
      if (error.response?.status === 401 || error.response?.data?.message === 'Unauthorized') {
        toast.error('Bạn cần đăng nhập để thực hiện thanh toán.');
      } else {
        toast.error(error.response?.data?.message || 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    navigate,
    checkoutRef,
    user,
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    address,
    setAddress,
    city,
    ward,
    provinces,
    wards,
    selectedProvince,
    selectedWard,
    savedAddresses,
    showAddressModal,
    setShowAddressModal,
    isLoadingAddresses,
    handleSelectSavedAddress,
    handleProvinceChange,
    handleWardChange,
    items,
    orderNote,
    setOrderNote,
    updateVariant,
    subtotal,
    paymentMethod,
    setPaymentMethod,
    discountCode,
    setDiscountCode,
    isVoucherModalOpen,
    setIsVoucherModalOpen,
    appliedVoucher,
    isValidatingVoucher,
    activeVouchers,
    isLoadingActiveVouchers,
    eligibleVouchersCount,
    sortedModalVouchers,
    shippingFee,
    isBulky,
    isLoadingShipping,
    unsupportedError,
    discountAmount,
    total,
    showSuccessModal,
    setShowSuccessModal,
    isSubmitting,
    handleApplyVoucher,
    handleRemoveVoucher,
    handleUpdateQuantity,
    handlePlaceOrder,
  };
}
