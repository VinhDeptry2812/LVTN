import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useCartStore } from '@/store/useCartStore';
import { productCardImage } from '@/utils/cloudinaryUrl';
import { useAuthStore } from '@/store/useAuthStore';
import { createOrder } from '@/services/order.service';
import toast from 'react-hot-toast';
import VariantSelectorModal from '@/components/VariantSelectorModal';
import api from '@/services/api';
import { getAddresses, type AddressData } from '@/services/address.service';
import { formatPrice } from '@/utils/format';

const formatAttributes = (attributes: Record<string, any> | undefined) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .join('|');
};

export default function CheckoutPage() {
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

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/?depth=2')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(err => console.error("Failed to fetch provinces", err));
  }, []);

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

  const handleDistrictChange = () => {};

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardCode = e.target.value;
    setSelectedWard(wardCode);
    const wardObj = wards.find(w => w.code.toString() === wardCode);
    if (wardObj) {
      setWard(wardObj.name);
    }
  };

  // Order Calculations
  const { items, clearCart, orderNote, setOrderNote, updateVariant, updateQuantity, removeItem } = useCartStore();

  const subtotal = items.reduce((total, item) => total + item.rawPrice * item.quantity, 0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay' | 'momo' | 'payos'>('cod');
  const [discountCode, setDiscountCode] = useState('');

  // Voucher State
  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: number;
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    discountAmount: number;
  } | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [activeVouchers, setActiveVouchers] = useState<any[]>([]);
  const [isLoadingActiveVouchers, setIsLoadingActiveVouchers] = useState(false);

  useEffect(() => {
    const fetchActiveVouchers = async () => {
      try {
        setIsLoadingActiveVouchers(true);
        const res = await api.get('/vouchers/active');
        setActiveVouchers(res.data || []);
      } catch (err) {
        console.error('Lỗi lấy danh sách mã giảm giá:', err);
      } finally {
        setIsLoadingActiveVouchers(false);
      }
    };
    fetchActiveVouchers();
  }, []);

  const [shippingFee, setShippingFee] = useState<number>(0);
  const [isBulky, setIsBulky] = useState<boolean>(false);
  const [isLoadingShipping, setIsLoadingShipping] = useState<boolean>(false);

  const discountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  // Order success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voucher Handlers
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

  // Revalidate voucher when subtotal changes
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

  useEffect(() => {
    const fetchShippingFee = async () => {
      if (items.length === 0) {
        setShippingFee(0);
        setIsBulky(false);
        return;
      }
      try {
        setIsLoadingShipping(true);
        const itemsPayload = items.map(item => ({
          product_id: parseInt(item.id.toString(), 10),
          quantity: item.quantity
        }));
        
        const res = await api.post('/orders/calculate-shipping', {
          items: itemsPayload,
          province: city || ''
        });
        setShippingFee(res.data.shipping_fee);
        setIsBulky(res.data.is_bulky);
      } catch (error) {
        console.error('Failed to calculate shipping fee', error);
      } finally {
        setIsLoadingShipping(false);
      }
    };

    fetchShippingFee();
  }, [items, city]);



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

  // GSAP animation
  useGSAP(() => {
    gsap.from('.checkout-left > *', {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out'
    });
    gsap.from('.checkout-right > *', {
      opacity: 0,
      x: 20,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.2
    });
  }, { scope: checkoutRef });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !address || !email || !city || !ward) {
      toast.error('Vui lòng điền đầy đủ thông tin giao hàng.');
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-body-md antialiased text-[#333333] bg-white" ref={checkoutRef}>

      {/* Right Side: Order Summary (Renders first on mobile) */}
      <div className="lg:w-[45%] w-full bg-[#fafafa] border-b lg:border-b-0 lg:border-l border-[#e1e1e1] order-1 lg:order-2">
        <div className="lg:max-w-md mx-auto lg:ml-10 lg:mr-auto px-4 py-8 lg:py-12 checkout-right sticky top-0">

          {/* Mobile toggle summary button (simplified) */}
          <div className="lg:hidden flex items-center justify-between mb-4 border-b border-[#e1e1e1] pb-4">
            <h2 className="font-medium text-sm md:text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
              Tóm tắt đơn hàng ({items.length})
            </h2>
            <span className="font-bold text-lg">{formatPrice(total)}</span>
          </div>

          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 sm:gap-4 items-start sm:items-center">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#e1e1e1] bg-white">
                    <img className="w-full h-full object-cover" src={productCardImage(item.image)} alt={item.name} />
                  </div>
                </div>
                <div className="flex-grow text-left min-w-0">
                  <p className="font-medium text-sm line-clamp-2 leading-snug">{item.name}</p>
                  
                  {/* Hiển thị và thay đổi phân loại sản phẩm */}
                  <VariantSelectorModal
                    item={item}
                    onUpdateVariant={updateVariant}
                  />

                  {/* Bộ chọn số lượng */}
                  <div className="flex items-center mt-2">
                    <div className="flex items-center border border-[#d9d9d9] rounded-md bg-white h-7 shrink-0" role="group" aria-label={`Số lượng ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, -1, item)}
                        aria-label="Giảm số lượng"
                        className="w-7 h-full flex items-center justify-center text-[#555555] hover:text-primary hover:bg-[#fafafa] transition-colors cursor-pointer rounded-l-md"
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">remove</span>
                      </button>
                      <span className="text-xs font-semibold w-7 text-center select-none" aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, 1, item)}
                        aria-label="Tăng số lượng"
                        className="w-7 h-full flex items-center justify-center text-[#555555] hover:text-primary hover:bg-[#fafafa] transition-colors cursor-pointer rounded-r-md"
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="font-semibold text-sm whitespace-nowrap self-start sm:self-center text-right shrink-0 mt-0.5 sm:mt-0">
                  {formatPrice(item.rawPrice * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Danh sách Voucher khả dụng */}
          {(activeVouchers.length > 0 || isLoadingActiveVouchers) && (
            <div className="py-4 border-t border-[#e1e1e1] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">confirmation_number</span>
                  Mã giảm giá khả dụng
                </span>
                {isLoadingActiveVouchers && <span className="text-xs text-gray-400">Đang tải mã...</span>}
              </div>

              {activeVouchers.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gray-300 snap-x">
                  {activeVouchers.map((v) => {
                    const minVal = Number(v.min_order_value || 0);
                    const isEligible = subtotal >= minVal;
                    const isSelected = appliedVoucher?.code === v.code;

                    let discountLabel = '';
                    if (v.discount_type === 'fixed_amount') {
                      discountLabel = `Giảm ${formatPrice(Number(v.discount_value))}`;
                    } else {
                      discountLabel = `Giảm ${v.discount_value}%`;
                      if (v.max_discount_amount) {
                        discountLabel += ` (Tối đa ${formatPrice(Number(v.max_discount_amount))})`;
                      }
                    }

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveVoucher();
                          } else {
                            handleApplyVoucher(v.code);
                          }
                        }}
                        className={`flex-shrink-0 snap-start p-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer min-w-[200px] max-w-[240px] relative ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-500/30'
                            : isEligible
                            ? 'border-dashed border-primary/50 bg-amber-50/30 hover:border-primary hover:bg-amber-50/80 hover:shadow-sm'
                            : 'border-gray-200 bg-gray-50/60 opacity-65 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-800 tracking-wider">
                            {v.code}
                          </span>
                          {isSelected ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">check</span> Đã chọn
                            </span>
                          ) : isEligible ? (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              Áp dụng ngay
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-200/80 px-1.5 py-0.5 rounded-full">
                              Chưa đủ ĐK
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-gray-900 line-clamp-1">{discountLabel}</p>

                        <p className="text-[11px] text-gray-500 mt-1">
                          {minVal > 0 ? `Đơn từ ${formatPrice(minVal)}` : 'Cho mọi đơn hàng'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {appliedVoucher ? (
            <div className="py-4 border-y border-[#e1e1e1] space-y-2">
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-250 rounded-md px-4 py-3 text-sm text-emerald-850">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">sell</span>
                  <span className="font-semibold">{appliedVoucher.code}</span>
                  <span className="text-xs text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded-none font-medium">
                    Đã áp dụng
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="text-emerald-750 hover:text-emerald-950 font-semibold flex items-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 border-y border-[#e1e1e1] flex gap-3">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Nhập mã giảm giá"
                className="flex-grow bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow uppercase font-mono tracking-wider"
                disabled={isValidatingVoucher}
              />
              <button
                type="button"
                onClick={() => handleApplyVoucher()}
                disabled={isValidatingVoucher}
                className="bg-primary hover:brightness-110 text-white px-6 py-3 border border-primary rounded-md font-medium text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[100px]"
              >
                {isValidatingVoucher ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Sử dụng'
                )}
              </button>
            </div>
          )}

          <div className="py-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#717171]">Tạm tính</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            {appliedVoucher && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Giảm giá (Voucher)</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#717171]">Phí vận chuyển</span>
              <span className="font-medium">
                {isLoadingShipping ? (
                  <span className="text-xs text-gray-400">Đang tính...</span>
                ) : shippingFee === 0 ? (
                  'Miễn phí'
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e1e1e1] flex justify-between items-center">
            <span className="text-base text-[#717171]">Tổng cộng</span>
            <div className="flex items-end gap-2">
              <span className="text-xs text-[#717171] mb-1">VND</span>
              <span className="text-2xl font-semibold text-[#333333]">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side: Checkout Form */}
      <div className="lg:w-[55%] w-full bg-white px-4 py-8 lg:py-12 order-2 lg:order-1">
        <div className="lg:max-w-xl mx-auto lg:mr-10 lg:ml-auto checkout-left">

          {/* Logo */}
          <Link to="/" className="text-primary font-headline-lg font-bold text-3xl block mb-4 tracking-tight">
            Nội thất
          </Link>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs md:text-sm text-[#737373] mb-8">
            <Link to="/cart" className="hover:text-primary transition-colors">Giỏ hàng</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="font-medium text-[#333333]">Thông tin giao hàng</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="hidden sm:inline">Phương thức thanh toán</span>
          </nav>

          <form onSubmit={handlePlaceOrder}>
            {/* Contact Info */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm lg:text-lg font-medium">Thông tin giao hàng</h2>
                {user ? (
                  savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className="text-sm lg:text-lg text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer bg-transparent border-none"
                    >
                      <span className="material-symbols-outlined text-base">local_shipping</span>
                      Chọn địa chỉ đã lưu
                    </button>
                  )
                ) : (
                  <span className="text-sm text-[#737373]">
                    Bạn đã có tài khoản? <Link to="/login" className="text-primary hover:underline">Đăng nhập</Link>
                  </span>
                )}
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email của bạn"
                className="w-full bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow mb-4"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Họ và tên"
                  className="w-full bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                  required
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="w-full bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                  required
                />
              </div>

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Địa chỉ (Ví dụ: Số 123, Đường ABC)"
                className="w-full bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow mb-4"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <select
                    value={selectedProvince}
                    onChange={handleProvinceChange}
                    className="w-full bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none transition-shadow"
                    required
                  >
                    <option value="" disabled>Chọn Tỉnh/Thành</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-[#737373] pointer-events-none">expand_more</span>
                </div>
                <div className="relative">
                  <select
                    value={selectedWard}
                    onChange={handleWardChange}
                    className="w-full bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none transition-shadow"
                    required
                    disabled={!selectedProvince}
                  >
                    <option value="" disabled>Chọn Phường/Xã</option>
                    {wards.map(w => (
                      <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-[#737373] pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>

            {/* Phương thức giao hàng */}
            {selectedProvince && selectedWard && (
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4 text-left">Phương thức giao hàng</h2>
                <div className="bg-white border border-[#333333] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full border-2 border-[#333333] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#333333]" />
                    </div>
                    <div className="text-sm text-[#333333] text-left leading-relaxed">
                      <p className="font-medium">
                        {isBulky ? 'Vận chuyển hàng cồng kềnh' : 'Tiêu chuẩn'}
                      </p>
                      <p className="text-xs text-[#737373] mt-1">
                        {isBulky
                          ? 'Đơn hàng chứa sản phẩm cồng kềnh (giường, tủ lớn...). Miễn phí vận chuyển từ 20.000.000đ.'
                          : 'Miễn phí vận chuyển cho đơn hàng từ 5.000.000đ.'}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm whitespace-nowrap text-[#333333] md:self-center self-start pl-7 md:pl-0">
                    {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
                  </span>
                </div>
              </div>
            )}

            {/* Ghi chú đơn hàng */}
            {orderNote.trim().length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4">Ghi chú đơn hàng</h2>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ghi chú thêm về đơn hàng (ví dụ: giao giờ hành chính, ...)"
                  className="w-full bg-white border border-[#d9d9d9] rounded-md p-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow resize-y min-h-[100px]"
                ></textarea>
              </div>
            )}

            {/* Payment Method */}
            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">Phương thức thanh toán</h2>
              <div className="border border-[#d9d9d9] rounded-md overflow-hidden bg-white">

                {/* COD */}
                <label className={`flex items-center p-4 border-b border-[#d9d9d9] cursor-pointer ${paymentMethod === 'cod' ? 'bg-[#f4f8f5]' : ''}`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentMethod === 'cod' ? 'border-primary' : 'border-[#d9d9d9]'}`}>
                    {paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="material-symbols-outlined text-[#737373] mr-2">local_shipping</span>
                  <span className="text-sm flex-grow">Thanh toán khi nhận hàng (COD)</span>
                  <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                </label>

                {/* VNPay */}
                <label className={`flex items-center p-4 border-b border-[#d9d9d9] cursor-pointer ${paymentMethod === 'vnpay' ? 'bg-[#f4f8f5]' : ''}`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentMethod === 'vnpay' ? 'border-primary' : 'border-[#d9d9d9]'}`}>
                    {paymentMethod === 'vnpay' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="material-symbols-outlined text-[#737373] mr-2">account_balance</span>
                  <span className="text-sm flex-grow">Thanh toán qua VNPAY</span>
                  <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-VNPAY-QR.png" alt="VNPay" className="h-4 object-contain" />
                  <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} />
                </label>

                {/* Momo */}
                <label className={`flex items-center p-4 border-b border-[#d9d9d9] cursor-pointer ${paymentMethod === 'momo' ? 'bg-[#f4f8f5]' : ''}`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentMethod === 'momo' ? 'border-primary' : 'border-[#d9d9d9]'}`}>
                    {paymentMethod === 'momo' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="material-symbols-outlined text-[#737373] mr-2">account_balance_wallet</span>
                  <span className="text-sm flex-grow">Thanh toán qua Ví MoMo</span>
                  <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Square.png" alt="MoMo" className="h-6 rounded-sm object-contain" />
                  <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} />
                </label>

                {/* PayOS (VietQR) */}
                <label className={`flex items-center p-4 cursor-pointer ${paymentMethod === 'payos' ? 'bg-[#f4f8f5]' : ''}`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentMethod === 'payos' ? 'border-primary' : 'border-[#d9d9d9]'}`}>
                    {paymentMethod === 'payos' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="material-symbols-outlined text-[#737373] mr-2">qr_code_2</span>
                  <span className="text-sm flex-grow">Chuyển khoản ngân hàng (VietQR / PayOS)</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">VietQR</span>
                  <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'payos'} onChange={() => setPaymentMethod('payos')} />
                </label>

              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-4 gap-4 sm:gap-0">
              <Link to="/cart" className="group text-primary text-sm flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-sm transition-transform duration-300 group-hover:-translate-x-1">chevron_left</span>
                <span className="group-hover:underline">Giỏ hàng</span>
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-primary text-white px-8 py-4 border border-primary rounded-md font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng'}
              </button>
            </div>

            <div className="mt-10 border-t border-[#e1e1e1] pt-4 text-xs text-[#737373] flex gap-4 justify-center sm:justify-start">
              <a href="#" className="hover:text-primary">Chính sách hoàn trả</a>
              <a href="#" className="hover:text-primary">Chính sách bảo mật</a>
              <a href="#" className="hover:text-primary">Điều khoản sử dụng</a>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="success-dialog bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl relative border border-outline-variant/30">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-[36px]">done</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-primary">Đặt hàng thành công!</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Cảm ơn {fullName} đã tin tưởng chọn Nội thất. Đơn hàng của bạn đang được xử lý và sẽ được chuyển đi sớm nhất.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/shop');
                }}
                className="w-full bg-primary text-on-primary py-3 border border-primary rounded-md hover:brightness-110 active:scale-95 transition-all cursor-pointer font-medium shadow-md"
              >
                QUAY LẠI CỬA HÀNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Address Selection Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e1e1e1]">
              <h3 className="font-bold text-lg text-[#333333]">Địa chỉ đã lưu</h3>
              <button 
                type="button" 
                onClick={() => setShowAddressModal(false)} 
                className="w-8 h-8 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-grow">
              {isLoadingAddresses ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#737373]">Đang tải địa chỉ...</p>
                </div>
              ) : savedAddresses.length === 0 ? (
                <div className="text-center py-10 text-[#737373]">
                  <span className="material-symbols-outlined text-4xl mb-2 block text-[#d9d9d9]">local_shipping</span>
                  <p className="text-sm">Bạn chưa lưu địa chỉ nào.</p>
                </div>
              ) : (
                savedAddresses.map((addr) => (
                  <div 
                    key={addr.id}
                    className="border border-[#e1e1e1] hover:border-primary/50 rounded-xl p-4 transition-all duration-200 text-left relative cursor-pointer group bg-[#fafafa] hover:bg-primary/[0.01]"
                    onClick={() => handleSelectSavedAddress(addr)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#333333]">{addr.name}</span>
                        {addr.is_default && (
                          <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-xs text-primary font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Chọn địa chỉ
                      </button>
                    </div>
                    
                    <p className="text-xs text-[#737373] mb-1 flex items-center gap-1.5 font-sans">
                      <span className="material-symbols-outlined text-sm">phone</span>
                      {addr.phone}
                    </p>
                    <p className="text-xs text-[#555555] flex items-start gap-1.5 leading-relaxed mt-1 font-sans">
                      <span className="material-symbols-outlined text-sm mt-0.5">location_on</span>
                      <span>
                        {addr.detail ? `${addr.detail}, ` : ''}
                        {addr.ward_name}, {addr.district_name}, {addr.province_name}
                      </span>
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#e1e1e1] bg-[#fafafa] flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="px-6 py-2.5 border border-[#d9d9d9] hover:bg-[#eaeaea] text-[#555555] rounded-lg font-semibold text-sm transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
