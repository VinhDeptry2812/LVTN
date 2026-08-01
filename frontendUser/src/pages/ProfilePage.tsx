import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import authService from '@/services/auth.service';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';
import OrderHistoryTab from '@/components/profile/OrderHistoryTab';
import AddressBookTab from '@/components/profile/AddressBookTab';
import WarrantyTab from '@/components/profile/WarrantyTab';

const ProfilePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token, refreshToken, setAuth, logout } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Active tab state
  const activeTab = searchParams.get('tab') || 'profile';

  // Listen to store hydration
  useEffect(() => {
    const storePersist = (useAuthStore as unknown as {
      persist: {
        hasHydrated: () => boolean;
        onFinishHydration: (fn: () => void) => () => void;
      };
    }).persist;

    if (storePersist?.hasHydrated?.()) {
      setIsHydrated(true);
    } else {
      // Fallback nếu không dùng middleware persist hoặc đã hydrated sẵn
      setIsHydrated(true);
    }

    const unsub = storePersist?.onFinishHydration?.(() => {
      setIsHydrated(true);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!isHydrated) return;

    if (!token || !user) {
      toast.error('Vui lòng đăng nhập để xem thông tin tài khoản.');
      navigate('/register');
    }
  }, [isHydrated, token, user, navigate]);

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

  // Load and parse user info
  useEffect(() => {
    if (user) {
      const parts = user.name ? user.name.trim().split(/\s+/) : [''];
      if (parts.length <= 1) {
        setFirstName(user.name || '');
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

      await authService.updateProfile({
        name: fullName,
        phone: phone || undefined,
        gender: gender || undefined,
        birthday: birthday || undefined,
      });

      const updatedUser = {
        ...user,
        name: fullName,
        phone: phone,
        gender: gender,
        birthday: birthday,
      };
      setAuth(token || '', refreshToken || '', updatedUser);

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
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    logout();
    toast.success('Đăng xuất thành công.');
    navigate('/');
  };

  if (!isHydrated || !user) {
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
                  onClick={() => setSearchParams({ tab: 'warranty' })}
                  className={`flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 ${activeTab === 'warranty'
                      ? 'bg-primary/8 text-primary border-primary'
                      : 'text-on-surface-variant/70 hover:bg-surface-container-low hover:text-on-surface border-transparent'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  Sổ bảo hành
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
                  className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-sm transition-all duration-300 font-semibold text-xs uppercase tracking-wider font-headline border-l-4 text-error/80 hover:bg-error/5 hover:text-error border-transparent cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Đăng xuất
                </button>
              </nav>
            </aside>

            {/* RIGHT COLUMN: Tab Content */}
            <section className="w-full md:w-3/4 space-y-10">

              {/* TAB 1: PROFILE INFO & PASSWORD */}
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
                <OrderHistoryTab user={user} />
              )}

              {/* TAB 3: SỔ BẢO HÀNH */}
              {activeTab === 'warranty' && (
                <WarrantyTab user={user} />
              )}

              {/* TAB 4: SỔ ĐỊA CHỈ */}
              {activeTab === 'address' && (
                <AddressBookTab user={user} token={token || ''} />
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
