import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/services/address.service';

interface SavedAddress {
  id: number;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  detail?: string;
}

interface AddressBookTabProps {
  user: any;
  token: string | null;
}

const AddressBookTab: React.FC<AddressBookTabProps> = ({ user, token }) => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  // Address form fields
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Provinces & Wards (API v2)
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

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

  const fetchAddresses = async () => {
    if (!token) return;
    setIsLoadingAddresses(true);
    try {
      const data = await getAddresses();
      setAddresses(
        data.map((a) => ({
          id: a.id,
          name: a.name,
          phone: a.phone,
          address: a.address,
          isDefault: a.is_default,
          provinceCode: a.province_code,
          provinceName: a.province_name,
          districtCode: a.district_code,
          districtName: a.district_name,
          wardCode: a.ward_code,
          wardName: a.ward_name,
          detail: a.detail,
        }))
      );
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Load provinces list when adding address
  useEffect(() => {
    if (isAddingAddress && provinces.length === 0) {
      const fetchProvinces = async () => {
        setIsLoadingProvinces(true);
        try {
          const res = await fetch('https://provinces.open-api.vn/api/v2/?depth=2');
          if (res.ok) {
            const data = await res.json();
            setProvinces(data);
          }
        } catch (error) {
          console.error('Error fetching provinces:', error);
        } finally {
          setIsLoadingProvinces(false);
        }
      };
      fetchProvinces();
    }
  }, [isAddingAddress, provinces.length]);

  // Load wards when province changes
  useEffect(() => {
    if (selectedProvince) {
      const province = provinces.find((p) => String(p.code) === String(selectedProvince));
      if (province) {
        setWards(province.wards || []);
      } else {
        setWards([]);
      }
    } else {
      setWards([]);
    }
  }, [selectedProvince, provinces]);

  const resetAddressForm = () => {
    setAddrName('');
    setAddrPhone('');
    setAddrDetail('');
    setAddrIsDefault(false);
    setSelectedProvince('');
    setSelectedWard('');
    setWards([]);
    setIsAddingAddress(false);
    setEditingAddressId(null);
  };

  const loadAddressForEdit = async (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddrName(addr.name);
    setAddrPhone(addr.phone);
    setAddrIsDefault(addr.isDefault);
    setIsAddingAddress(true);

    let currentProvinces = provinces;

    if (provinces.length === 0) {
      setIsLoadingProvinces(true);
      try {
        const res = await fetch('https://provinces.open-api.vn/api/v2/?depth=2');
        if (res.ok) {
          const data = await res.json();
          setProvinces(data);
          currentProvinces = data;
        }
      } catch (error) {
        console.error('Error fetching provinces:', error);
      } finally {
        setIsLoadingProvinces(false);
      }
    }

    if (addr.provinceCode) {
      setSelectedProvince(addr.provinceCode);
      const province = currentProvinces.find((p) => String(p.code) === String(addr.provinceCode));
      if (province) {
        setWards(province.wards || []);
      } else {
        setWards([]);
      }
    } else {
      setSelectedProvince('');
      setWards([]);
    }

    if (addr.wardCode) {
      setSelectedWard(addr.wardCode);
    } else {
      setSelectedWard('');
    }

    setAddrDetail(addr.detail || addr.address);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!addrName.trim() || !addrPhone.trim() || !addrDetail.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin địa chỉ.');
      return;
    }

    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(addrPhone.trim())) {
      toast.error('Số điện thoại không đúng định dạng Việt Nam (Ví dụ: 0912345678).');
      return;
    }

    const provinceObj = provinces.find((p) => String(p.code) === String(selectedProvince));
    const wardObj = wards.find((w) => String(w.code) === String(selectedWard));

    if (!provinceObj || !wardObj) {
      toast.error('Vui lòng chọn đầy đủ Tỉnh/Thành phố, Phường/Xã.');
      return;
    }

    const fullAddress = `${addrDetail.trim()}, ${wardObj.name}, ${provinceObj.name}`;
    const payload = {
      name: addrName,
      phone: addrPhone,
      address: fullAddress,
      province_code: selectedProvince,
      province_name: provinceObj.name,
      district_code: '',
      district_name: '',
      ward_code: selectedWard,
      ward_name: wardObj.name,
      detail: addrDetail.trim(),
      is_default: addrIsDefault,
    };

    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, payload);
        toast.success('Cập nhật địa chỉ thành công!');
      } else {
        await createAddress(payload);
        toast.success('Thêm địa chỉ mới thành công!');
      }
      resetAddressForm();
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu địa chỉ.');
    }
  };

  const handleDeleteAddress = (id: number) => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Xóa địa chỉ',
      message: 'Bạn có chắc chắn muốn xóa địa chỉ này không? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa địa chỉ',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteAddress(id);
          toast.success('Xóa địa chỉ thành công.');
          fetchAddresses();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Không thể xóa địa chỉ.');
        }
      },
    });
  };

  const handleSetDefaultAddress = async (id: number) => {
    if (!user) return;
    try {
      await setDefaultAddress(id);
      toast.success('Đã đặt làm địa chỉ mặc định.');
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể đặt mặc định.');
    }
  };

  return (
    <div className="bg-white border border-outline-variant/40 rounded-sm p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">location_on</span>
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline">
            Địa chỉ giao hàng
          </h3>
        </div>

        {!isAddingAddress && (
          <button
            onClick={() => {
              setIsAddingAddress(true);
              setEditingAddressId(null);
              setAddrName('');
              setAddrPhone('');
              setAddrDetail('');
              setAddrIsDefault(false);
            }}
            className="px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Thêm địa chỉ mới
          </button>
        )}
      </div>

      {/* Add/Edit Address Form */}
      {isAddingAddress && (
        <div className="p-6 border border-primary/20 rounded-sm bg-surface-container-low/20 space-y-5 animate-fadeIn">
          <h4 className="font-bold text-xs uppercase tracking-widest text-primary font-headline">
            {editingAddressId ? 'Cập nhật địa chỉ' : 'Địa chỉ mới'}
          </h4>

          <form onSubmit={handleSaveAddress} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                  Họ tên người nhận
                </label>
                <input
                  type="text"
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  required
                  placeholder="Nhập họ tên"
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                  Số điện thoại nhận hàng
                </label>
                <input
                  type="tel"
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  required
                  placeholder="Nhập số điện thoại"
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm"
                />
              </div>
            </div>

            {/* Dropdowns chọn Tỉnh, Xã */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest flex items-center gap-1.5">
                  <span>Tỉnh/Thành phố</span>
                  {isLoadingProvinces && (
                    <span className="text-primary text-[9px] lowercase font-normal animate-pulse">
                      (đang tải...)
                    </span>
                  )}
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedWard('');
                  }}
                  required
                  className="w-full px-3 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm"
                >
                  <option value="">Chọn Tỉnh/Thành phố</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest flex items-center gap-1.5">
                  <span>Phường/Xã</span>
                  {isLoadingWards && (
                    <span className="text-primary text-[9px] lowercase font-normal animate-pulse">
                      (đang tải...)
                    </span>
                  )}
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  required
                  disabled={!selectedProvince}
                  className="w-full px-3 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm disabled:bg-surface-container-low disabled:cursor-not-allowed"
                >
                  <option value="">Chọn Phường/Xã</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                Địa chỉ chi tiết (Số nhà, tên đường...)
              </label>
              <textarea
                value={addrDetail}
                onChange={(e) => setAddrDetail(e.target.value)}
                required
                rows={2}
                placeholder="Ví dụ: Số 123, Đường Nguyễn Trãi..."
                className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  disabled={
                    editingAddressId !== null &&
                    addresses.find((a) => a.id === editingAddressId)?.isDefault
                  }
                  className="w-4 h-4 text-primary border-outline-variant rounded-sm focus:ring-primary accent-[#536257] cursor-pointer"
                />
                <span className="ml-2 text-xs font-semibold text-on-surface-variant/80 uppercase tracking-wider">
                  Đặt làm địa chỉ mặc định
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-on-primary text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/95 hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer"
              >
                Lưu địa chỉ
              </button>
              <button
                type="button"
                onClick={resetAddressForm}
                className="px-6 py-2.5 border border-outline-variant hover:bg-surface-container-low text-on-surface text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of saved addresses */}
      <div className="space-y-4">
        {isLoadingAddresses ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary font-light">sync</span>
            <p className="text-xs text-on-surface-variant/70">Đang tải danh sách địa chỉ...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="py-8 px-4 border border-outline-variant/30 rounded-sm text-center bg-surface-container-low/20">
            <p className="text-sm text-on-surface-variant/70">Bạn chưa thêm địa chỉ nhận hàng nào.</p>
          </div>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-5 border rounded-sm flex flex-col sm:flex-row justify-between sm:items-start gap-4 transition-all duration-300 ${
                addr.isDefault
                  ? 'border-primary bg-primary/2 shadow-sm'
                  : 'border-outline-variant/40 hover:border-primary/45 bg-surface-container-low/5'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center flex-wrap gap-2.5">
                  <span className="font-bold text-sm text-on-surface uppercase tracking-wide">
                    {addr.name}
                  </span>
                  <span className="text-xs text-on-surface-variant/70">({addr.phone})</span>
                  {addr.isDefault && (
                    <span className="inline-block bg-primary/10 text-primary text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-sm border border-primary/20">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant/90 leading-relaxed font-normal">
                  {addr.address}
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto text-xs font-semibold uppercase tracking-wider shrink-0">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefaultAddress(addr.id)}
                    className="text-primary hover:underline transition-all cursor-pointer"
                  >
                    Đặt mặc định
                  </button>
                )}
                <button
                  onClick={() => loadAddressForEdit(addr)}
                  className="text-on-surface-variant/70 hover:text-black hover:underline transition-all flex items-center gap-0.5 cursor-pointer"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="text-error/80 hover:text-error hover:underline transition-all flex items-center gap-0.5 cursor-pointer"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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

export default AddressBookTab;
