import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCheckout } from '@/hooks/useCheckout';
import { ShippingAddressForm } from '@/components/checkout/ShippingAddressForm';
import { SavedAddressModal } from '@/components/checkout/SavedAddressModal';
import { VoucherSelectModal } from '@/components/checkout/VoucherSelectModal';
import { VariantSelectModal } from '@/components/checkout/VariantSelectModal';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';
import { PaymentMethodSection } from '@/components/checkout/PaymentMethodSection';
import { OrderSuccessModal } from '@/components/checkout/OrderSuccessModal';

export const CheckoutPage: React.FC = () => {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [selectingItemForVariant, setSelectingItemForVariant] = useState<any | null>(null);

  const {
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
  } = useCheckout();

  if (items.length === 0 && !showSuccessModal) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
          <span className="material-symbols-outlined text-6xl text-gray-300 block mb-4">shopping_bag</span>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Giỏ hàng của bạn đang trống</h2>
          <p className="text-gray-500 text-sm mb-6">
            Vui lòng thêm sản phẩm vào giỏ hàng trước khi tiến hành thanh toán.
          </p>
          <Link
            to="/shop"
            className="inline-block bg-[#4a5d4e] hover:bg-[#3d4c40] text-white font-bold px-6 py-2.5 rounded transition-all text-sm cursor-pointer"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]" ref={checkoutRef}>
      <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row min-h-screen">
        {/* Right Side: Order Summary (45%) */}
        <div className="w-full lg:w-[45%] bg-[#fafafa] p-4 lg:py-12 lg:pl-16 lg:pr-12 border-b lg:border-b-0 lg:border-l border-[#e6e6e6] order-1 lg:order-2 flex flex-col justify-start">
          {/* Toggle Mobile Summary */}
          <div
            className="lg:hidden flex items-center justify-between py-3 border-b border-[#e6e6e6] cursor-pointer"
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          >
            <div className="flex items-center text-[#4a5d4e] text-sm font-medium">
              <span className="material-symbols-outlined mr-1 text-base">shopping_bag</span>
              <span>{isSummaryOpen ? 'Ẩn thông tin đơn hàng' : 'Hiển thị thông tin đơn hàng'}</span>
              <span className="material-symbols-outlined ml-1 text-base">
                {isSummaryOpen ? 'expand_less' : 'expand_more'}
              </span>
            </div>
            <span className="text-base font-bold text-[#333333]">{total.toLocaleString('vi-VN')} ₫</span>
          </div>

          <div className={`${isSummaryOpen ? 'block' : 'hidden'} lg:block pt-4 lg:pt-0 w-full max-w-md`}>
            <CheckoutOrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              isBulky={isBulky}
              isLoadingShipping={isLoadingShipping}
              unsupportedError={unsupportedError}
              appliedVoucher={appliedVoucher}
              eligibleVouchersCount={eligibleVouchersCount}
              discountAmount={discountAmount}
              total={total}
              orderNote={orderNote}
              setOrderNote={setOrderNote}
              updateVariant={updateVariant}
              handleUpdateQuantity={handleUpdateQuantity}
              handleRemoveVoucher={handleRemoveVoucher}
              setIsVoucherModalOpen={setIsVoucherModalOpen}
              discountCode={discountCode}
              setDiscountCode={setDiscountCode}
              handleApplyVoucher={handleApplyVoucher}
              isValidatingVoucher={isValidatingVoucher}
              onOpenVariantModal={(item) => setSelectingItemForVariant(item)}
            />
          </div>
        </div>

        {/* Left Side: Checkout Form (55%) */}
        <div className="w-full lg:w-[55%] bg-white p-4 lg:py-12 lg:pl-12 lg:pr-16 order-2 lg:order-1 flex justify-end">
          <div className="w-full max-w-xl">
            {/* Logo */}
            <Link to="/" className="text-[#333333] font-bold text-3xl block mb-2 tracking-tight">
              Nội thất
            </Link>

            {/* Breadcrumbs (Theo chuẩn Ảnh 1) */}
            <nav className="flex items-center gap-2 text-xs md:text-sm text-[#737373] mb-8">
              <Link to="/cart" className="hover:text-[#4a5d4e] transition-colors">Giỏ hàng</Link>
              <span className="text-xs">›</span>
              <span className="font-bold text-[#333333]">Thông tin giao hàng</span>
              <span className="text-xs">›</span>
              <span className="hidden sm:inline">Phương thức thanh toán</span>
            </nav>

            {/* Warning for Admin/Staff Accounts */}
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded flex items-start gap-3 text-amber-900 text-sm">
                <span className="material-symbols-outlined text-amber-600 mt-0.5 shrink-0">warning</span>
                <div>
                  <p className="font-bold">Lưu ý: Tài khoản Nội bộ ({user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'})</p>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Để đảm bảo tính minh bạch nghiệp vụ và phân tách quyền hạn, tài khoản quản trị/nhân viên không được phép đặt hàng cá nhân. Vui lòng đăng xuất và sử dụng tài khoản Khách hàng.
                  </p>
                </div>
              </div>
            )}

            <ShippingAddressForm
              user={user}
              fullName={fullName}
              setFullName={setFullName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              address={address}
              setAddress={setAddress}
              provinces={provinces}
              wards={wards}
              selectedProvince={selectedProvince}
              selectedWard={selectedWard}
              handleProvinceChange={handleProvinceChange}
              handleWardChange={handleWardChange}
              savedAddresses={savedAddresses}
              setShowAddressModal={setShowAddressModal}
              shippingFee={shippingFee}
              isBulky={isBulky}
            />

            <PaymentMethodSection
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              isSubmitting={isSubmitting}
              unsupportedError={unsupportedError}
              total={total}
            />
          </div>
        </div>
      </form>

      {/* Modals */}
      <SavedAddressModal
        showAddressModal={showAddressModal}
        setShowAddressModal={setShowAddressModal}
        isLoadingAddresses={isLoadingAddresses}
        savedAddresses={savedAddresses}
        handleSelectSavedAddress={handleSelectSavedAddress}
      />

      <VoucherSelectModal
        isVoucherModalOpen={isVoucherModalOpen}
        setIsVoucherModalOpen={setIsVoucherModalOpen}
        discountCode={discountCode}
        setDiscountCode={setDiscountCode}
        appliedVoucher={appliedVoucher}
        isValidatingVoucher={isValidatingVoucher}
        isLoadingActiveVouchers={isLoadingActiveVouchers}
        sortedModalVouchers={sortedModalVouchers}
        subtotal={subtotal}
        handleApplyVoucher={handleApplyVoucher}
        handleRemoveVoucher={handleRemoveVoucher}
      />

      <VariantSelectModal
        isOpen={Boolean(selectingItemForVariant)}
        onClose={() => setSelectingItemForVariant(null)}
        item={selectingItemForVariant}
        onSelectVariant={(cartItemId, newVariantId) => {
          updateVariant(cartItemId, newVariantId);
        }}
      />

      <OrderSuccessModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        navigate={navigate}
      />
    </div>
  );
};

export default CheckoutPage;
