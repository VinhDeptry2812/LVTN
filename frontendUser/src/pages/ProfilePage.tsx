import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import authService from '@/services/auth.service';
import { getMyOrders, cancelOrder, repayOrder, completeOrder } from '@/services/order.service';
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress, type AddressData } from '@/services/address.service';
import { useCartStore } from '@/store/useCartStore';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';

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

const ProfilePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token, setAuth, logout } = useAuthStore();

  // Active tab state
  const activeTab = searchParams.get('tab') || 'profile';

  // Redirect if not logged in
  useEffect(() => {
    if (!token || !user) {
      toast.error('Vui lòng đăng nhập để xem thông tin tài khoản.');
      navigate('/register');
    }
  }, [token, user, navigate]);

  // Profile Form States
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | ''>('');
  const [birthday, setBirthday] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Change Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Address List States
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  // Address Form States
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Dropdown Tỉnh/Huyện/Xã States
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  // Load and parse user info
  useEffect(() => {
    if (user) {
      // Split user.name into lastName and firstName
      const parts = user.name.trim().split(/\s+/);
      if (parts.length <= 1) {
        setFirstName(user.name);
        setLastName('');
      } else {
        const last = parts[parts.length - 1];
        const rest = parts.slice(0, parts.length - 1).join(' ');
        setFirstName(last);
        setLastName(rest);
      }
      setPhone(user.phone || '');
      setGender((user.gender as 'Nam' | 'Nữ' | '') || '');
      setBirthday(user.birthday || '');
    }
  }, [user]);

  // Load addresses from API
  const fetchAddresses = async () => {
    if (!token) return;
    setIsLoadingAddresses(true);
    try {
      const data = await getAddresses();
      setAddresses(data.map((a) => ({
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
      })));
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user && token && activeTab === 'address') {
      fetchAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, activeTab]);

  // Tự động load danh sách Tỉnh/Thành phố khi mở form
  useEffect(() => {
    if (isAddingAddress && provinces.length === 0) {
      const fetchProvinces = async () => {
        setIsLoadingProvinces(true);
        try {
          const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
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

  // Tự động load danh sách Quận/Huyện khi chọn Tỉnh/Thành phố
  useEffect(() => {
    if (selectedProvince) {
      const fetchDistricts = async () => {
        setIsLoadingDistricts(true);
        try {
          const res = await fetch(`https://provinces.open-api.vn/api/p/${selectedProvince}?depth=2`);
          if (res.ok) {
            const data = await res.json();
            setDistricts(data.districts || []);
          }
        } catch (error) {
          console.error('Error fetching districts:', error);
        } finally {
          setIsLoadingDistricts(false);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvince]);

  // Tự động load danh sách Phường/Xã khi chọn Quận/Huyện
  useEffect(() => {
    if (selectedDistrict) {
      const fetchWards = async () => {
        setIsLoadingWards(true);
        try {
          const res = await fetch(`https://provinces.open-api.vn/api/d/${selectedDistrict}?depth=2`);
          if (res.ok) {
            const data = await res.json();
            setWards(data.wards || []);
          }
        } catch (error) {
          console.error('Error fetching wards:', error);
        } finally {
          setIsLoadingWards(false);
        }
      };
      fetchWards();
    } else {
      setWards([]);
    }
  }, [selectedDistrict]);

  // Load Orders
  const fetchOrders = async () => {
    if (!user) return;
    setIsLoadingOrders(true);
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Không thể tải lịch sử đơn hàng.');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user && (activeTab === 'orders' || activeTab === 'profile')) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;

    setIsUpdatingProfile(true);
    try {
      const fullName = `${lastName} ${firstName}`.trim();
      if (!fullName) {
        toast.error('Họ và tên không được để trống.');
        setIsUpdatingProfile(false);
        return;
      }

      // Call API with gender and birthday
      await authService.updateProfile({
        name: fullName,
        phone: phone || undefined,
        gender: gender || undefined,
        birthday: birthday || undefined,
      });

      // Update store state
      const updatedUser = {
        ...user,
        name: fullName,
        phone: phone,
        gender: gender,
        birthday: birthday,
      };
      setAuth(token, updatedUser);

      toast.success('Cập nhật thông tin tài khoản thành công!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Cập nhật thông tin thất bại.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        oldPassword,
        newPassword,
        confirmNewPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId: number) => {
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?');
    if (!isConfirmed) return;

    try {
      await cancelOrder(orderId);
      toast.success('Đã hủy đơn hàng thành công.');
      // Update selectedOrder state if it is currently open
      setSelectedOrder((prev: any) => prev && prev.id === orderId ? { ...prev, status: 'cancelled' } : prev);
      fetchOrders(); // Refresh order list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng.');
    }
  };

  // Handle Complete Order
  const handleCompleteOrder = async (orderId: number) => {
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn xác nhận đã nhận hàng không?');
    if (!isConfirmed) return;

    try {
      await completeOrder(orderId);
      toast.success('Đã nhận được hàng và hoàn thành đơn hàng!');
      // Update selectedOrder state if it is currently open
      setSelectedOrder((prev: any) =>
        prev && prev.id === orderId ? { ...prev, status: 'completed', payment_status: 'paid' } : prev
      );
      fetchOrders(); // Refresh order list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể hoàn thành đơn hàng.');
    }
  };

  // Handle Repay Order
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

  // Handle Reorder (Mua lại)
  const handleReorder = (order: any) => {
    if (!order.items || order.items.length === 0) {
      toast.error('Đơn hàng không có sản phẩm nào để mua lại.');
      return;
    }

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
        .join('|');
    };

    try {
      // Add each item in order to cart
      order.items.forEach((item: any) => {
        const productId = String(item.product.id);
        const variantId = item.variant ? item.variant.id : null;
        const compositeId = `${productId}-${variantId || 'base'}`;

        let material = 'Mặc định';
        if (item.variant?.attributes && Object.keys(item.variant.attributes).length > 0) {
          material = formatAttributes(item.variant.attributes);
        }

        const priceVal = Number(item.price);
        const formattedPrice = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(priceVal);

        const cartItem = {
          id: compositeId,
          productId: productId,
          variantId: variantId,
          name: item.product.name,
          material: material,
          price: formattedPrice,
          rawPrice: priceVal,
          image: item.variant?.image_url || item.product.image || '',
          quantity: item.quantity || 1,
          availableVariants: item.product.variants || [],
        };

        useCartStore.getState().addItem(cartItem);
      });

      toast.success('Đã thêm tất cả sản phẩm vào giỏ hàng thành công.');
      navigate('/cart');
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng.');
    }
  };

  // Reset Address Form States
  const resetAddressForm = () => {
    setAddrName('');
    setAddrPhone('');
    setAddrDetail('');
    setAddrIsDefault(false);
    setSelectedProvince('');
    setSelectedDistrict('');
    setSelectedWard('');
    setDistricts([]);
    setWards([]);
    setIsAddingAddress(false);
    setEditingAddressId(null);
  };

  // Tải đồng bộ dữ liệu Tỉnh/Huyện/Xã khi sửa địa chỉ
  const loadAddressForEdit = async (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddrName(addr.name);
    setAddrPhone(addr.phone);
    setAddrIsDefault(addr.isDefault);
    setIsAddingAddress(true);

    // Tải danh sách tỉnh nếu chưa có
    if (provinces.length === 0) {
      setIsLoadingProvinces(true);
      try {
        const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
        if (res.ok) {
          const data = await res.json();
          setProvinces(data);
        }
      } catch (error) {
        console.error('Error fetching provinces:', error);
      } finally {
        setIsLoadingProvinces(false);
      }
    }

    if (addr.provinceCode) {
      setSelectedProvince(addr.provinceCode);
      setIsLoadingDistricts(true);
      try {
        const res = await fetch(`https://provinces.open-api.vn/api/p/${addr.provinceCode}?depth=2`);
        if (res.ok) {
          const data = await res.json();
          setDistricts(data.districts || []);
        }
      } catch (error) {
        console.error('Error fetching districts:', error);
      } finally {
        setIsLoadingDistricts(false);
      }
    } else {
      setSelectedProvince('');
      setDistricts([]);
    }

    if (addr.districtCode) {
      setSelectedDistrict(addr.districtCode);
      setIsLoadingWards(true);
      try {
        const res = await fetch(`https://provinces.open-api.vn/api/d/${addr.districtCode}?depth=2`);
        if (res.ok) {
          const data = await res.json();
          setWards(data.wards || []);
        }
      } catch (error) {
        console.error('Error fetching wards:', error);
      } finally {
        setIsLoadingWards(false);
      }
    } else {
      setSelectedDistrict('');
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

  // Handle Add/Edit Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!addrName.trim() || !addrPhone.trim() || !addrDetail.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin địa chỉ.');
      return;
    }

    const provinceObj = provinces.find((p) => String(p.code) === String(selectedProvince));
    const districtObj = districts.find((d) => String(d.code) === String(selectedDistrict));
    const wardObj = wards.find((w) => String(w.code) === String(selectedWard));

    if (!provinceObj || !districtObj || !wardObj) {
      toast.error('Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã.');
      return;
    }

    const fullAddress = `${addrDetail.trim()}, ${wardObj.name}, ${districtObj.name}, ${provinceObj.name}`;
    const payload = {
      name: addrName,
      phone: addrPhone,
      address: fullAddress,
      province_code: selectedProvince,
      province_name: provinceObj.name,
      district_code: selectedDistrict,
      district_name: districtObj.name,
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
      fetchAddresses(); // Reload từ API
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu địa chỉ.');
    }
  };

  // Handle Delete Address
  const handleDeleteAddress = async (id: number) => {
    if (!user) return;
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này không?');
    if (!isConfirmed) return;

    try {
      await deleteAddress(id);
      toast.success('Xóa địa chỉ thành công.');
      fetchAddresses(); // Reload từ API
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa địa chỉ.');
    }
  };

  // Set Default Address
  const handleSetDefaultAddress = async (id: number) => {
    if (!user) return;
    try {
      await setDefaultAddress(id);
      toast.success('Đã đặt làm địa chỉ mặc định.');
      fetchAddresses(); // Reload từ API
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể đặt mặc định.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    logout();
    toast.success('Đăng xuất thành công.');
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-body-md text-on-surface">
      <Header />

      <main className="flex-grow py-12 md:py-20 bg-background mt-16 md:mt-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">

          {/* Greeting Banner */}
          <div className="bg-surface-container rounded-sm p-6 md:p-8 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 border border-outline-variant/30 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shrink-0">
                <span className="material-symbols-outlined text-[32px] font-light">account_circle</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold font-headline text-on-surface truncate">Xin chào, {user.name}!</h2>
                <p className="text-xs text-on-surface-variant/80 mt-1 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12">

            {/* LEFT COLUMN: Sidebar Navigation */}
            <aside className="w-full md:w-1/4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 border-b border-outline-variant/30 pb-3 mb-4 font-headline">
                Quản lý tài khoản
              </h2>
              <nav className="space-y-2.5">
                <button
                  onClick={() => setSearchParams({ tab: 'profile' })}
                  className={`flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 ${activeTab === 'profile'
                      ? 'bg-primary/8 text-primary border-primary'
                      : 'text-on-surface-variant/70 hover:bg-surface-container-low hover:text-on-surface border-transparent'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  Thông tin tài khoản
                </button>

                <button
                  onClick={() => setSearchParams({ tab: 'orders' })}
                  className={`flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 ${activeTab === 'orders'
                      ? 'bg-primary/8 text-primary border-primary'
                      : 'text-on-surface-variant/70 hover:bg-surface-container-low hover:text-on-surface border-transparent'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  Lịch sử đơn hàng
                </button>

                <button
                  onClick={() => setSearchParams({ tab: 'address' })}
                  className={`flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 ${activeTab === 'address'
                      ? 'bg-primary/8 text-primary border-primary'
                      : 'text-on-surface-variant/70 hover:bg-surface-container-low hover:text-on-surface border-transparent'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                  Danh sách địa chỉ
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 text-error/80 hover:bg-error/5 hover:text-error border-transparent"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Đăng xuất
                </button>
              </nav>
            </aside>

            {/* RIGHT COLUMN: Tab Content */}
            <section className="w-full md:w-3/4 space-y-10">

              {/* TAB 1: PROFILE INFO & PASSWORD & ORDERS */}
              {activeTab === 'profile' && (
                <div className="space-y-10">

                  {/* Account Information Form */}
                  <div className="bg-white border border-outline-variant/40 rounded-sm p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
                      <span className="material-symbols-outlined text-primary text-[24px]">manage_accounts</span>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline">
                        Cập nhật hồ sơ
                      </h3>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Họ và tên đệm</label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            placeholder="Nhập họ và tên đệm"
                            className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-surface-container-low/20 font-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 shadow-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Tên</label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            placeholder="Nhập tên"
                            className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-surface-container-low/20 font-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Email</label>
                          <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-3 border border-outline-variant/60 rounded-sm bg-surface-container-low/60 text-on-surface-variant/50 font-body-md cursor-not-allowed focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Số điện thoại</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Nhập số điện thoại"
                            className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-surface-container-low/20 font-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-2">Giới tính</label>
                          <div className="flex items-center gap-6 mt-2">
                            <label className="flex items-center cursor-pointer select-none">
                              <input
                                type="radio"
                                name="gender"
                                value="Nam"
                                checked={gender === 'Nam'}
                                onChange={() => setGender('Nam')}
                                className="w-4 h-4 text-primary border-outline-variant focus:ring-primary accent-[#536257] cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-on-surface">Nam</span>
                            </label>
                            <label className="flex items-center cursor-pointer select-none">
                              <input
                                type="radio"
                                name="gender"
                                value="Nữ"
                                checked={gender === 'Nữ'}
                                onChange={() => setGender('Nữ')}
                                className="w-4 h-4 text-primary border-outline-variant focus:ring-primary accent-[#536257] cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-on-surface">Nữ</span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Ngày sinh</label>
                          <input
                            type="date"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-surface-container-low/20 font-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 uppercase shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isUpdatingProfile}
                          className="px-8 py-3.5 bg-primary text-on-primary font-semibold text-xs tracking-wider uppercase rounded-sm hover:bg-primary/95 hover:shadow-md active:scale-[0.98] transition-all duration-300 flex items-center justify-center cursor-pointer"
                        >
                          {isUpdatingProfile && (
                            <span className="material-symbols-outlined animate-spin mr-2 text-sm">sync</span>
                          )}
                          Lưu thay đổi
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Change Password Form */}
                  <div className="bg-white border border-outline-variant/40 rounded-sm p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
                      <span className="material-symbols-outlined text-primary text-[24px]">lock</span>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline">
                        Đổi mật khẩu
                      </h3>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Mật khẩu cũ</label>
                        <input
                          type="password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          required
                          placeholder="Nhập mật khẩu cũ"
                          className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-surface-container-low/20 font-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 shadow-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Mật khẩu mới</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                            className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-surface-container-low/20 font-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 shadow-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Xác nhận mật khẩu mới</label>
                          <input
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                            placeholder="Nhập lại mật khẩu mới"
                            className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-surface-container-low/20 font-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isChangingPassword}
                          className="px-8 py-3.5 bg-primary text-on-primary font-semibold text-xs tracking-wider uppercase rounded-sm hover:bg-primary/95 hover:shadow-md active:scale-[0.98] transition-all duration-300 flex items-center justify-center cursor-pointer"
                        >
                          {isChangingPassword && (
                            <span className="material-symbols-outlined animate-spin mr-2 text-sm">sync</span>
                          )}
                          Cập nhật mật khẩu
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

              {/* TAB 2: LỊCH SỬ ĐƠN HÀNG */}
              {activeTab === 'orders' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-outline-variant/45 rounded-sm p-6 md:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
                    <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4 flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[28px] font-light">shopping_bag</span>
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline">
                            Lịch sử đơn hàng
                          </h3>
                          <p className="text-xs text-on-surface-variant/80 mt-1">Quản lý và xem lại tất cả các đơn hàng đã đặt của bạn</p>
                        </div>
                      </div>
                    </div>

                    {/* Thanh lọc trạng thái đơn hàng */}
                    {!isLoadingOrders && orders.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/15 pb-4 overflow-x-auto select-none no-scrollbar">
                        {[
                          { key: 'all', label: 'Tất cả' },
                          { key: 'pending', label: 'Chờ xử lý' },
                          { key: 'confirmed', label: 'Đã xác nhận' },
                          { key: 'shipping', label: 'Đang giao' },
                          { key: 'delivered', label: 'Đã giao hàng' },
                          { key: 'completed', label: 'Hoàn thành' },
                          { key: 'cancelled', label: 'Đã hủy' },
                        ].map((tab) => {
                          const count = tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length;
                          return (
                            <button
                              key={tab.key}
                              onClick={() => setSelectedStatus(tab.key)}
                              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all duration-300 whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${selectedStatus === tab.key
                                  ? 'bg-primary border-primary text-on-primary shadow-sm'
                                  : 'bg-surface-container-low/20 border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low/50 hover:border-outline-variant'
                                }`}
                            >
                              {tab.label}
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-extrabold ${selectedStatus === tab.key ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
                                }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {isLoadingOrders ? (
                      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary font-light">sync</span>
                        <p className="text-xs text-on-surface-variant/70">Đang tải danh sách đơn hàng...</p>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="py-16 px-4 border border-dashed border-outline-variant/60 rounded-sm text-center bg-surface-container-low/10 flex flex-col items-center justify-center gap-4">
                        <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 font-light">production_quantity_limits</span>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">Bạn chưa đặt mua đơn hàng nào</p>
                          <p className="text-xs text-on-surface-variant/70 mt-1">Hãy tham khảo các sản phẩm chất lượng cao của chúng tôi và đặt hàng ngay nhé!</p>
                        </div>
                        <button
                          onClick={() => navigate('/shop')}
                          className="px-6 py-2.5 bg-primary text-on-primary font-semibold text-xs tracking-wider uppercase rounded-sm hover:bg-primary/95 transition-all duration-300 shadow-sm cursor-pointer"
                        >
                          Khám phá cửa hàng
                        </button>
                      </div>
                    ) : (() => {
                      const filteredOrders = selectedStatus === 'all'
                        ? orders
                        : orders.filter((o) => o.status === selectedStatus);

                      if (filteredOrders.length === 0) {
                        return (
                          <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3 border border-dashed border-outline-variant/30 rounded-sm">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">find_in_page</span>
                            <p className="text-xs text-on-surface-variant/80">Không tìm thấy đơn hàng nào ở trạng thái này.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {filteredOrders.map((order) => {
                            const totalItemsCount = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                            return (
                              <div
                                key={order.id}
                                className="border border-outline-variant/50 rounded-sm overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.035)] transition-all duration-300"
                              >
                                {/* Order Card Header */}
                                <div className="bg-surface-container-low/30 px-6 py-4 border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold font-mono text-primary bg-primary/5 px-2.5 py-1 rounded-sm border border-primary/10">
                                      #{order.id}
                                    </span>
                                    <span className="text-xs text-on-surface-variant/80 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[16px] font-light">calendar_today</span>
                                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Badge Trạng thái đơn hàng */}
                                    <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${order.status === 'completed'
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
                                      }`}>
                                      {order.status === 'pending' && 'Chờ xử lý'}
                                      {order.status === 'confirmed' && 'Đã xác nhận'}
                                      {order.status === 'shipping' && 'Đang giao'}
                                      {order.status === 'delivered' && 'Đã giao hàng'}
                                      {order.status === 'completed' && 'Hoàn thành'}
                                      {order.status === 'cancelled' && 'Đã hủy'}
                                    </span>

                                    {/* Badge Trạng thái thanh toán */}
                                    <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${order.payment_status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}>
                                      {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                    </span>
                                  </div>
                                </div>

                                {/* Order Card Body */}
                                <div className="divide-y divide-outline-variant/20 px-6 py-2 bg-white">
                                  {order.items?.map((item: any, idx: number) => {
                                    if (idx >= 2) return null;

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
                                        .join(' | ');
                                    };

                                    const material = item.variant?.attributes && Object.keys(item.variant.attributes).length > 0
                                      ? formatAttributes(item.variant.attributes)
                                      : 'Mặc định';

                                    return (
                                      <div key={item.id} className="py-4 flex items-center gap-4 hover:bg-surface-container-low/5 transition-colors">
                                        <img
                                          src={item.variant?.image_url || item.product.image || 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60'}
                                          alt={item.product.name}
                                          className="w-14 h-14 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                                          onError={(e: any) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-semibold text-xs text-on-surface truncate">{item.product.name}</h5>
                                          <p className="text-[10px] text-on-surface-variant/70 mt-0.5">Biến thể: {material}</p>
                                          <p className="text-[10px] text-on-surface-variant/70 mt-0.5">Số lượng: <span className="font-semibold text-on-surface">{item.quantity}</span></p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="font-bold text-xs text-on-surface">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.price))}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {order.items?.length > 2 && (
                                    <div className="py-3 text-center text-xs text-on-surface-variant/80 bg-surface-container-low/20 font-medium border-t border-outline-variant/10">
                                      và {order.items.length - 2} sản phẩm khác...
                                    </div>
                                  )}
                                </div>

                                {/* Order Card Footer */}
                                <div className="bg-surface-container-low/10 px-6 py-4 border-t border-outline-variant/40 flex flex-wrap items-center justify-between gap-4">
                                  <div className="text-xs text-on-surface-variant/80 font-medium">
                                    Tổng số lượng: <span className="font-bold text-on-surface">{totalItemsCount} sản phẩm</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4">
                                    <div className="text-right">
                                      <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-widest block">Tổng tiền</span>
                                      <span className="text-base font-bold text-primary font-headline">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="px-4 py-2 border border-secondary text-secondary hover:bg-secondary hover:text-white transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap"
                                      >
                                        Chi tiết
                                      </button>

                                      {order.status === 'pending' && (
                                        <button
                                          onClick={() => handleCancelOrder(order.id)}
                                          className="px-4 py-2 border border-error text-error hover:bg-error hover:text-white transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap"
                                        >
                                          Hủy đơn
                                        </button>
                                      )}

                                      {order.status === 'delivered' && (
                                        <button
                                          onClick={() => handleCompleteOrder(order.id)}
                                          className="px-4 py-2 bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap"
                                        >
                                          Đã nhận hàng
                                        </button>
                                      )}

                                      {order.status === 'pending' &&
                                        order.payment_status === 'pending' &&
                                        (order.payment_method === 'vnpay' || order.payment_method === 'momo') && (
                                          <button
                                            onClick={() => handleRepay(order.id)}
                                            disabled={isRepaying}
                                            className="px-4 py-2 bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 disabled:opacity-50 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap flex items-center gap-1"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">payment</span>
                                            Thanh toán
                                          </button>
                                        )}

                                      {(order.status === 'completed' || order.status === 'cancelled') && (
                                        <button
                                          onClick={() => handleReorder(order)}
                                          className="px-4 py-2 border border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap"
                                        >
                                          Mua lại
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 2: ADDRESS LIST */}
              {activeTab === 'address' && (
                <div className="bg-white border border-outline-variant/40 rounded-sm p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-8">

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
                            <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Họ tên người nhận</label>
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
                            <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Số điện thoại nhận hàng</label>
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

                        {/* Bộ 3 dropdown chọn Tỉnh, Huyện, Xã */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest flex items-center gap-1.5">
                              <span>Tỉnh/Thành phố</span>
                              {isLoadingProvinces && <span className="text-primary text-[9px] lowercase font-normal animate-pulse">(đang tải...)</span>}
                            </label>
                            <select
                              value={selectedProvince}
                              onChange={(e) => {
                                setSelectedProvince(e.target.value);
                                setSelectedDistrict('');
                                setSelectedWard('');
                              }}
                              required
                              className="w-full px-3 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm"
                            >
                              <option value="">Chọn Tỉnh/Thành phố</option>
                              {provinces.map((p) => (
                                <option key={p.code} value={p.code}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest flex items-center gap-1.5">
                              <span>Quận/Huyện</span>
                              {isLoadingDistricts && <span className="text-primary text-[9px] lowercase font-normal animate-pulse">(đang tải...)</span>}
                            </label>
                            <select
                              value={selectedDistrict}
                              onChange={(e) => {
                                setSelectedDistrict(e.target.value);
                                setSelectedWard('');
                              }}
                              required
                              disabled={!selectedProvince}
                              className="w-full px-3 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm disabled:bg-surface-container-low disabled:cursor-not-allowed"
                            >
                              <option value="">Chọn Quận/Huyện</option>
                              {districts.map((d) => (
                                <option key={d.code} value={d.code}>{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest flex items-center gap-1.5">
                              <span>Phường/Xã</span>
                              {isLoadingWards && <span className="text-primary text-[9px] lowercase font-normal animate-pulse">(đang tải...)</span>}
                            </label>
                            <select
                              value={selectedWard}
                              onChange={(e) => setSelectedWard(e.target.value)}
                              required
                              disabled={!selectedDistrict}
                              className="w-full px-3 py-2.5 border border-outline-variant rounded-sm bg-white font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 shadow-sm disabled:bg-surface-container-low disabled:cursor-not-allowed"
                            >
                              <option value="">Chọn Phường/Xã</option>
                              {wards.map((w) => (
                                <option key={w.code} value={w.code}>{w.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Địa chỉ chi tiết (Số nhà, tên đường...)</label>
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
                              disabled={editingAddressId !== null && addresses.find(a => a.id === editingAddressId)?.isDefault}
                              className="w-4 h-4 text-primary border-outline-variant rounded-sm focus:ring-primary accent-[#536257] cursor-pointer"
                            />
                            <span className="ml-2 text-xs font-semibold text-on-surface-variant/80 uppercase tracking-wider">Đặt làm địa chỉ mặc định</span>
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
                    {addresses.length === 0 ? (
                      <div className="py-8 px-4 border border-outline-variant/30 rounded-sm text-center bg-surface-container-low/20">
                        <p className="text-sm text-on-surface-variant/70">Bạn chưa thêm địa chỉ nhận hàng nào.</p>
                      </div>
                    ) : (
                      addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-5 border rounded-sm flex flex-col sm:flex-row justify-between sm:items-start gap-4 transition-all duration-300 ${addr.isDefault
                              ? 'border-primary bg-primary/2 shadow-sm'
                              : 'border-outline-variant/40 hover:border-primary/45 bg-surface-container-low/5'
                            }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center flex-wrap gap-2.5">
                              <span className="font-bold text-sm text-on-surface uppercase tracking-wide">
                                {addr.name}
                              </span>
                              <span className="text-xs text-on-surface-variant/70">
                                ({addr.phone})
                              </span>
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

                </div>
              )}

            </section>

          </div>
        </div>
      </main>

      {/* Modal Chi tiết đơn hàng */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-outline-variant/30 transition-transform duration-300 scale-100">
            {/* Header */}
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

            {/* Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Trạng thái và Thông tin chung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low/20 p-4 border border-outline-variant/30 rounded-sm text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">Ngày đặt:</span>
                    <span className="text-on-surface font-medium">
                      {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">Trạng thái đơn hàng:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      selectedOrder.status === 'completed'
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
                    }`}>
                      {selectedOrder.status === 'pending' && 'Chờ xử lý'}
                      {selectedOrder.status === 'confirmed' && 'Đã xác nhận'}
                      {selectedOrder.status === 'shipping' && 'Đang giao'}
                      {selectedOrder.status === 'delivered' && 'Đã giao hàng'}
                      {selectedOrder.status === 'completed' && 'Hoàn thành'}
                      {selectedOrder.status === 'cancelled' && 'Đã hủy'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">Hình thức thanh toán:</span>
                    <span className="text-on-surface font-medium uppercase tracking-wide">
                      {selectedOrder.payment_method === 'cod' && 'Thanh toán khi nhận hàng (COD)'}
                      {selectedOrder.payment_method === 'vnpay' && 'Thanh toán qua VNPay'}
                      {selectedOrder.payment_method === 'momo' && 'Thanh toán qua MoMo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">Trạng thái thanh toán:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${selectedOrder.payment_status === 'paid'
                        ? 'bg-primary/8 text-primary border-primary/20'
                        : 'bg-error/8 text-error border-error/20'
                      }`}>
                      {selectedOrder.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>
                </div>

                {/* Hiển thị lịch sử trạng thái nếu có */}
                {(selectedOrder.confirmed_at || selectedOrder.shipping_at || selectedOrder.delivered_at || selectedOrder.completed_at || selectedOrder.cancelled_at) && (
                  <div className="col-span-1 sm:col-span-2 mt-2 pt-3 border-t border-outline-variant/20 space-y-1 text-xs text-on-surface-variant/80">
                    <div className="font-semibold text-[10px] uppercase tracking-wider mb-1 text-on-surface">Lịch sử trạng thái:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {selectedOrder.confirmed_at && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>Đã xác nhận: <strong className="text-on-surface font-semibold">{new Date(selectedOrder.confirmed_at).toLocaleString('vi-VN')}</strong></span>
                        </div>
                      )}
                      {selectedOrder.shipping_at && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span>Đang vận chuyển: <strong className="text-on-surface font-semibold">{new Date(selectedOrder.shipping_at).toLocaleString('vi-VN')}</strong></span>
                        </div>
                      )}
                      {selectedOrder.delivered_at && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                          <span>Đã giao hàng: <strong className="text-on-surface font-semibold">{new Date(selectedOrder.delivered_at).toLocaleString('vi-VN')}</strong></span>
                        </div>
                      )}
                      {selectedOrder.completed_at && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Đã hoàn thành: <strong className="text-on-surface font-semibold">{new Date(selectedOrder.completed_at).toLocaleString('vi-VN')}</strong></span>
                        </div>
                      )}
                      {selectedOrder.cancelled_at && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Đã hủy: <strong className="text-on-surface font-semibold">{new Date(selectedOrder.cancelled_at).toLocaleString('vi-VN')}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin vận chuyển */}
              <div className="space-y-2.5 text-sm">
                <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface border-b border-outline-variant/30 pb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">local_shipping</span>
                  Thông tin giao hàng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white p-2 text-on-surface-variant">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">Số điện thoại nhận hàng</span>
                    <span className="font-semibold text-on-surface text-sm">{selectedOrder.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">Địa chỉ giao hàng</span>
                    <span className="text-on-surface text-sm">{selectedOrder.shipping_address}</span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="col-span-1 sm:col-span-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">Ghi chú đơn hàng</span>
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
                        .join(' | ');
                    };
                    const material = item.variant?.attributes && Object.keys(item.variant.attributes).length > 0
                      ? formatAttributes(item.variant.attributes)
                      : 'Mặc định';

                    return (
                      <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-surface-container-low/10 transition-colors">
                        <img
                          src={item.variant?.image_url || item.product.image || 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60'}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm text-on-surface truncate">{item.product.name}</h5>
                          <p className="text-xs text-on-surface-variant/70 mt-0.5">Biến thể: {material}</p>
                          <p className="text-xs text-on-surface-variant/70 mt-0.5">Số lượng: <span className="font-semibold text-on-surface">{item.quantity}</span></p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-on-surface">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.price))}
                          </p>
                          <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                            Thành tiền: <span className="font-semibold text-on-surface">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.price) * item.quantity)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tóm tắt chi phí */}
              <div className="space-y-2 border-t border-outline-variant/30 pt-4 text-sm font-medium">
                <div className="flex justify-between text-on-surface-variant/90">
                  <span>Tổng tiền sản phẩm:</span>
                  <span>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      selectedOrder.items?.reduce((total: number, item: any) => total + Number(item.price) * item.quantity, 0) || 0
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
                      -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(selectedOrder.discount_amount))}
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
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(selectedOrder.total_amount))}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex flex-wrap items-center justify-end gap-3">
              {selectedOrder.status === 'delivered' && (
                <button
                  onClick={() => handleCompleteOrder(selectedOrder.id)}
                  className="px-5 py-2 bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
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

              {selectedOrder.status === 'pending' &&
                selectedOrder.payment_status === 'pending' &&
                (selectedOrder.payment_method === 'vnpay' || selectedOrder.payment_method === 'momo') && (
                  <button
                    onClick={() => handleRepay(selectedOrder.id)}
                    disabled={isRepaying}
                    className="px-5 py-2 border border-emerald-600/45 text-emerald-600 hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
                  >
                    Thanh toán ngay
                  </button>
                )}

              {(selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled') && (
                <button
                  onClick={() => handleReorder(selectedOrder)}
                  className="px-5 py-2 border border-amber-600/45 text-amber-600 hover:bg-amber-600 hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
                >
                  Mua lại
                </button>
              )}

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProfilePage;
