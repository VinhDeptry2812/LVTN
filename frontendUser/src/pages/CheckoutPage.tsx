import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { createOrder } from '@/services/order.service';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=3')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(err => console.error("Failed to fetch provinces", err));
  }, []);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value;
    setSelectedProvince(provinceCode);
    const province = provinces.find(p => p.code.toString() === provinceCode);
    if (province) {
      setCity(province.name);
      setDistricts(province.districts || []);
      setWards([]);
      setSelectedDistrict('');
      setDistrict('');
      setSelectedWard('');
      setWard('');
    }
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtCode = e.target.value;
    setSelectedDistrict(districtCode);
    const districtObj = districts.find(d => d.code.toString() === districtCode);
    if (districtObj) {
      setDistrict(districtObj.name);
      setWards(districtObj.wards || []);
      setSelectedWard('');
      setWard('');
    }
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardCode = e.target.value;
    setSelectedWard(wardCode);
    const wardObj = wards.find(w => w.code.toString() === wardCode);
    if (wardObj) {
      setWard(wardObj.name);
    }
  };

  // Order Calculations
  const { items, clearCart, orderNote, setOrderNote } = useCartStore();

  const subtotal = items.reduce((total, item) => total + item.rawPrice * item.quantity, 0);
  const total = subtotal;

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay' | 'momo'>('cod');
  const [discountCode, setDiscountCode] = useState('');

  // Order success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace('₫', '₫');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !address || !email || !city || !district || !ward) {
      toast.error('Vui lòng điền đầy đủ thông tin giao hàng.');
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
      const fullAddress = `${address}, ${ward}, ${district}, ${city}`;

      const orderPayload = {
        shipping_address: fullAddress,
        phone,
        notes: orderNote,
        payment_method: paymentMethod as any,
        items: items.map(item => ({
          product_id: parseInt(item.id.toString(), 10),
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
            <h2 className="font-medium text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
              Tóm tắt đơn hàng ({items.length})
            </h2>
            <span className="font-bold text-lg">{formatPrice(total)}</span>
          </div>

          <div className="hidden lg:block space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#e1e1e1] bg-white flex-shrink-0">
                  <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                  <span className="absolute -top-2 -right-2 bg-black/60 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium z-10">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                  {item.material && <p className="text-xs text-[#737373] mt-1">{item.material}</p>}
                </div>
                <div className="font-medium text-sm whitespace-nowrap">
                  {formatPrice(item.rawPrice * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="py-4 border-y border-[#e1e1e1] flex gap-3">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Mã giảm giá"
              className="flex-grow bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
            />
            <button className="bg-[#c8c8c8] text-white px-6 py-3 rounded-md font-medium text-sm hover:bg-primary transition-colors">
              Sử dụng
            </button>
          </div>

          <div className="py-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#717171]">Tạm tính</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#717171]">Phí vận chuyển</span>
              <span className="font-medium">-</span>
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
                <h2 className="text-lg font-medium">Thông tin giao hàng</h2>
                <span className="text-sm text-[#737373]">
                  Bạn đã có tài khoản? <Link to="/login" className="text-primary hover:underline">Đăng nhập</Link>
                </span>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    className="w-full bg-white border border-[#d9d9d9] rounded-md px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none transition-shadow"
                    required
                    disabled={!selectedProvince}
                  >
                    <option value="" disabled>Chọn Quận/Huyện</option>
                    {districts.map(d => (
                      <option key={d.code} value={d.code}>{d.name}</option>
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
                    disabled={!selectedDistrict}
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
                <label className={`flex items-center p-4 cursor-pointer ${paymentMethod === 'momo' ? 'bg-[#f4f8f5]' : ''}`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentMethod === 'momo' ? 'border-primary' : 'border-[#d9d9d9]'}`}>
                    {paymentMethod === 'momo' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="material-symbols-outlined text-[#737373] mr-2">account_balance_wallet</span>
                  <span className="text-sm flex-grow">Thanh toán qua Ví MoMo</span>
                  <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Square.png" alt="MoMo" className="h-6 rounded-sm object-contain" />
                  <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} />
                </label>

              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-4 gap-4 sm:gap-0">
              <Link to="/cart" className="text-primary text-sm hover:underline flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_left</span> Giỏ hàng
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-md font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
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
              Cảm ơn {fullName} đã tin tưởng chọn FurniShop. Đơn hàng của bạn đang được xử lý và sẽ được chuyển đi sớm nhất.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/shop');
                }}
                className="w-full bg-primary text-on-primary py-3 rounded-md hover:brightness-110 active:scale-95 transition-all cursor-pointer font-medium shadow-md"
              >
                QUAY LẠI CỬA HÀNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
