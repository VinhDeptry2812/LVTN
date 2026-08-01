import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import authService from '@/services/auth.service';
import toast from 'react-hot-toast';

const ProfileInfoTab: React.FC = () => {
  const { user, token, refreshToken, setAuth } = useAuthStore();

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
      const parts = user.name ? user.name.trim().split(/\s+/) : [];
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

  return (
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
                value={user?.email || ''}
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
  );
};

export default ProfileInfoTab;
