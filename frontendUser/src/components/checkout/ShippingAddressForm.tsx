import React from 'react';
import { Link } from 'react-router-dom';
import type { AddressData } from '@/services/address.service';

interface ShippingAddressFormProps {
  user: any;
  fullName: string;
  setFullName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  provinces: any[];
  wards: any[];
  selectedProvince: string;
  selectedWard: string;
  handleProvinceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleWardChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  savedAddresses: AddressData[];
  setShowAddressModal: (val: boolean) => void;
  shippingFee?: number;
  isBulky?: boolean;
}

export const ShippingAddressForm: React.FC<ShippingAddressFormProps> = ({
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
  handleProvinceChange,
  handleWardChange,
  savedAddresses,
  setShowAddressModal,
  shippingFee = 0,
}) => {
  return (
    <div className="mb-6">
      {/* Header Thông tin giao hàng */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-[#333333]">Thông tin giao hàng</h2>
        {user ? (
          savedAddresses.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddressModal(true)}
              className="text-xs text-[#333333] hover:text-[#4a5d4e] font-medium flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <span className="material-symbols-outlined text-base">contact_page</span>
              <span>Chọn địa chỉ đã lưu</span>
            </button>
          )
        ) : (
          <span className="text-xs text-[#737373]">
            Bạn đã có tài khoản? <Link to="/login" className="text-[#4a5d4e] hover:underline font-medium">Đăng nhập</Link>
          </span>
        )}
      </div>

      {/* Email */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email của bạn"
        className="w-full bg-white border border-[#d9d9d9] rounded px-3 py-2.5 text-xs focus:border-[#4a5d4e] outline-none transition-shadow mb-3"
        required
      />

      {/* Họ tên & Số điện thoại */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Họ và tên"
          className="w-full bg-white border border-[#d9d9d9] rounded px-3 py-2.5 text-xs focus:border-[#4a5d4e] outline-none transition-shadow"
          required
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Số điện thoại"
          className="w-full bg-white border border-[#d9d9d9] rounded px-3 py-2.5 text-xs focus:border-[#4a5d4e] outline-none transition-shadow"
          required
        />
      </div>

      {/* Địa chỉ chi tiết */}
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Địa chỉ chi tiết (Ví dụ: Số 12, đường ABC)"
        className="w-full bg-white border border-[#d9d9d9] rounded px-3 py-2.5 text-xs focus:border-[#4a5d4e] outline-none transition-shadow mb-3"
        required
      />

      {/* Tỉnh thành & Phường xã */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div>
          <select
            value={selectedProvince}
            onChange={handleProvinceChange}
            className="w-full bg-white border border-[#d9d9d9] rounded px-3 py-2.5 text-xs focus:border-[#4a5d4e] outline-none appearance-none cursor-pointer text-gray-700"
            required
          >
            <option value="">Chọn Tỉnh / Thành phố</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedWard}
            onChange={handleWardChange}
            disabled={!selectedProvince}
            className="w-full bg-white border border-[#d9d9d9] rounded px-3 py-2.5 text-xs focus:border-[#4a5d4e] outline-none appearance-none cursor-pointer text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
          >
            <option value="">Chọn Phường / Xã</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Phần Phương thức giao hàng (Chuẩn theo Ảnh 1) */}
      <div className="mb-6">
        <h3 className="text-base font-bold text-[#333333] mb-3">Phương thức giao hàng</h3>
        <div className="border border-[#333333] rounded p-4 bg-white flex justify-between items-center cursor-pointer">
          <div className="flex items-start gap-3">
            <input
              type="radio"
              checked
              readOnly
              className="mt-0.5 text-[#4a5d4e] focus:ring-[#4a5d4e] h-4 w-4 shrink-0"
            />
            <div>
              <span className="font-bold text-xs text-[#333333] block">
                Vận chuyển hàng cồng kềnh
              </span>
              <span className="text-[11px] text-gray-500 block mt-0.5 max-w-sm leading-relaxed">
                Đơn hàng chứa sản phẩm cồng kềnh (giường, tủ lớn...). Miễn phí vận chuyển từ 20.000.000đ.
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#333333] shrink-0 ml-2">
            {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} ₫`}
          </span>
        </div>
      </div>
    </div>
  );
};
