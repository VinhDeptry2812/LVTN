import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import authService from '@/services/auth.service';
import { getMyOrders, cancelOrder } from '@/services/order.service';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
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

  // Address List States
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Address Form States
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

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

      // Load extra info from LocalStorage
      const extraKey = `profile_extra_${user.id}`;
      const savedExtra = localStorage.getItem(extraKey);
      if (savedExtra) {
        try {
          const { savedGender, savedBirthday } = JSON.parse(savedExtra);
          setGender(savedGender || '');
          setBirthday(savedBirthday || '');
        } catch (e) {
          console.error('Error loading profile extra info:', e);
        }
      }

      // Load addresses from LocalStorage
      const addrKey = `addresses_${user.id}`;
      const savedAddresses = localStorage.getItem(addrKey);
      if (savedAddresses) {
        try {
          setAddresses(JSON.parse(savedAddresses));
        } catch (e) {
          console.error('Error loading addresses:', e);
        }
      }
    }
  }, [user]);

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
    if (user && activeTab === 'profile') {
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

      // Call API
      await authService.updateProfile({
        name: fullName,
        phone: phone || undefined,
      });

      // Save gender and birthday to LocalStorage
      const extraKey = `profile_extra_${user.id}`;
      localStorage.setItem(
        extraKey,
        JSON.stringify({ savedGender: gender, savedBirthday: birthday })
      );

      // Update store state
      const updatedUser = {
        ...user,
        name: fullName,
        phone: phone,
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
      fetchOrders(); // Refresh order list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng.');
    }
  };

  // Handle Add/Edit Address
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!addrName.trim() || !addrPhone.trim() || !addrDetail.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin địa chỉ.');
      return;
    }

    let updatedAddresses = [...addresses];

    if (editingAddressId) {
      // Edit mode
      updatedAddresses = updatedAddresses.map((addr) => {
        if (addr.id === editingAddressId) {
          return {
            ...addr,
            name: addrName,
            phone: addrPhone,
            address: addrDetail,
            isDefault: addrIsDefault ? true : addr.isDefault,
          };
        }
        return addrIsDefault ? { ...addr, isDefault: false } : addr;
      });
    } else {
      // Add mode
      const newAddress: SavedAddress = {
        id: Date.now().toString(),
        name: addrName,
        phone: addrPhone,
        address: addrDetail,
        isDefault: addrIsDefault || addresses.length === 0, // Make default if it's the first one
      };

      if (newAddress.isDefault) {
        updatedAddresses = updatedAddresses.map((addr) => ({ ...addr, isDefault: false }));
      }
      updatedAddresses.push(newAddress);
    }

    // Save
    setAddresses(updatedAddresses);
    localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));

    // Reset Form
    setAddrName('');
    setAddrPhone('');
    setAddrDetail('');
    setAddrIsDefault(false);
    setIsAddingAddress(false);
    setEditingAddressId(null);

    toast.success(editingAddressId ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ mới thành công!');
  };

  // Handle Delete Address
  const handleDeleteAddress = (id: string) => {
    if (!user) return;
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này không?');
    if (!isConfirmed) return;

    const targetAddress = addresses.find((addr) => addr.id === id);
    const updatedAddresses = addresses.filter((addr) => addr.id !== id);

    // If we deleted the default address and there are remaining addresses, set the first one as default
    if (targetAddress?.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    setAddresses(updatedAddresses);
    localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));
    toast.success('Xóa địa chỉ thành công.');
  };

  // Set Default Address
  const handleSetDefaultAddress = (id: string) => {
    if (!user) return;
    const updated = addresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setAddresses(updated);
    localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updated));
    toast.success('Đã đặt làm địa chỉ mặc định.');
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
                  className={`flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 ${
                    activeTab === 'profile'
                      ? 'bg-primary/8 text-primary border-primary'
                      : 'text-on-surface-variant/70 hover:bg-surface-container-low hover:text-on-surface border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  Thông tin tài khoản
                </button>
                
                <button
                  onClick={() => setSearchParams({ tab: 'address' })}
                  className={`flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 ${
                    activeTab === 'address'
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

                  {/* Order History */}
                  <div className="bg-white border border-outline-variant/40 rounded-sm p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
                      <span className="material-symbols-outlined text-primary text-[24px]">shopping_bag</span>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline">
                        Lịch sử đơn hàng
                      </h3>
                    </div>

                    {isLoadingOrders ? (
                      <div className="py-12 text-center">
                        <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="py-8 px-4 border border-outline-variant/30 rounded-sm text-center bg-surface-container-low/20">
                        <p className="text-sm text-on-surface-variant/70">Bạn chưa đặt mua sản phẩm nào.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-outline-variant/30 rounded-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low text-xs font-semibold uppercase tracking-wider text-on-surface-variant/80 border-b border-outline-variant/30">
                              <th className="p-4">Mã đơn hàng</th>
                              <th className="p-4">Ngày đặt</th>
                              <th className="p-4">Tổng tiền</th>
                              <th className="p-4">Trạng thái</th>
                              <th className="p-4 text-center">Hành động</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20 text-sm">
                            {orders.map((order) => (
                              <tr key={order.id} className="hover:bg-surface-container-low/20 transition-all duration-200">
                                <td className="p-4 font-mono font-bold text-primary">#{order.id}</td>
                                <td className="p-4 text-on-surface-variant/90">
                                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="p-4 font-bold text-on-surface">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}
                                </td>
                                <td className="p-4">
                                  <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold uppercase tracking-wider text-on-surface-variant/70">Đơn hàng:</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                        order.status === 'completed'
                                          ? 'bg-primary/8 text-primary border-primary/20'
                                          : order.status === 'cancelled'
                                          ? 'bg-error/8 text-error border-error/20'
                                          : 'bg-secondary/8 text-secondary border-secondary/20'
                                      }`}>
                                        {order.status === 'pending' && 'Chờ xử lý'}
                                        {order.status === 'processing' && 'Đang xử lý'}
                                        {order.status === 'shipped' && 'Đang giao'}
                                        {order.status === 'completed' && 'Hoàn thành'}
                                        {order.status === 'cancelled' && 'Đã hủy'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold uppercase tracking-wider text-on-surface-variant/70">Thanh toán:</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                        order.payment_status === 'paid'
                                          ? 'bg-primary/8 text-primary border-primary/20'
                                          : 'bg-error/8 text-error border-error/20'
                                      }`}>
                                        {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  {order.status === 'pending' ? (
                                    <button
                                      onClick={() => handleCancelOrder(order.id)}
                                      className="px-3 py-1.5 border border-error/30 text-error hover:bg-error hover:text-white transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                                    >
                                      Hủy đơn
                                    </button>
                                  ) : (
                                    <span className="text-xs text-on-surface-variant/40">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Địa chỉ nhận hàng chi tiết</label>
                          <textarea
                            value={addrDetail}
                            onChange={(e) => setAddrDetail(e.target.value)}
                            required
                            rows={3}
                            placeholder="Nhập địa chỉ nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
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
                            onClick={() => {
                              setIsAddingAddress(false);
                              setEditingAddressId(null);
                            }}
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
                              onClick={() => {
                                setEditingAddressId(addr.id);
                                setAddrName(addr.name);
                                setAddrPhone(addr.phone);
                                setAddrDetail(addr.address);
                                setAddrIsDefault(addr.isDefault);
                                setIsAddingAddress(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
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

      <Footer />
    </div>
  );
};

export default ProfilePage;
