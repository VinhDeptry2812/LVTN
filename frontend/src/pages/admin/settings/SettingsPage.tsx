import { useState, useEffect } from 'react';
import { Truck, ShieldAlert, MapPin, Save, RefreshCw, Plus, X, Info } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface ShippingSettings {
  bulky_inner_fee: number;
  bulky_outer_fee: number;
  bulky_freeship_threshold: number;
  standard_inner_fee: number;
  standard_outer_fee: number;
  standard_freeship_threshold: number;
  inner_city_keywords: string[];
  unsupported_keywords: string[];
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ShippingSettings>({
    bulky_inner_fee: 150000,
    bulky_outer_fee: 350000,
    bulky_freeship_threshold: 20000000,
    standard_inner_fee: 30000,
    standard_outer_fee: 60000,
    standard_freeship_threshold: 5000000,
    inner_city_keywords: ['hồ chí minh', 'ho chi minh', 'hcm'],
    unsupported_keywords: ['phú quốc', 'côn đảo', 'trường sa', 'hoàng sa', 'huyện đảo'],
  });

  const [newInnerKeyword, setNewInnerKeyword] = useState('');
  const [newUnsupportedKeyword, setNewUnsupportedKeyword] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shipping-settings');
      if (res.data) {
        setSettings({
          bulky_inner_fee: Number(res.data.bulky_inner_fee) || 0,
          bulky_outer_fee: Number(res.data.bulky_outer_fee) || 0,
          bulky_freeship_threshold: Number(res.data.bulky_freeship_threshold) || 0,
          standard_inner_fee: Number(res.data.standard_inner_fee) || 0,
          standard_outer_fee: Number(res.data.standard_outer_fee) || 0,
          standard_freeship_threshold: Number(res.data.standard_freeship_threshold) || 0,
          inner_city_keywords: Array.isArray(res.data.inner_city_keywords)
            ? res.data.inner_city_keywords
            : typeof res.data.inner_city_keywords === 'string'
            ? res.data.inner_city_keywords.split(',')
            : [],
          unsupported_keywords: Array.isArray(res.data.unsupported_keywords)
            ? res.data.unsupported_keywords
            : typeof res.data.unsupported_keywords === 'string'
            ? res.data.unsupported_keywords.split(',')
            : [],
        });
      }
    } catch (err) {
      console.error('Lỗi tải cấu hình vận chuyển:', err);
      toast.error('Không thể tải cấu hình vận chuyển từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/shipping-settings', settings);
      toast.success('Đã lưu cấu hình vận chuyển hệ thống thành công!');
    } catch (err: any) {
      console.error('Lỗi cập nhật cấu hình vận chuyển:', err);
      toast.error(err.response?.data?.message || 'Không thể lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  const addInnerKeyword = () => {
    const trimmed = newInnerKeyword.trim().toLowerCase();
    if (!trimmed) return;
    if (settings.inner_city_keywords.includes(trimmed)) {
      toast.error('Từ khóa này đã tồn tại trong danh sách nội thành.');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      inner_city_keywords: [...prev.inner_city_keywords, trimmed],
    }));
    setNewInnerKeyword('');
  };

  const removeInnerKeyword = (keywordToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      inner_city_keywords: prev.inner_city_keywords.filter((kw) => kw !== keywordToRemove),
    }));
  };

  const addUnsupportedKeyword = () => {
    const trimmed = newUnsupportedKeyword.trim().toLowerCase();
    if (!trimmed) return;
    if (settings.unsupported_keywords.includes(trimmed)) {
      toast.error('Từ khóa này đã tồn tại trong danh sách từ chối giao.');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      unsupported_keywords: [...prev.unsupported_keywords, trimmed],
    }));
    setNewUnsupportedKeyword('');
  };

  const removeUnsupportedKeyword = (keywordToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      unsupported_keywords: prev.unsupported_keywords.filter((kw) => kw !== keywordToRemove),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="animate-spin text-indigo-600" size={32} />
          <span className="text-sm font-medium">Đang tải cấu hình vận chuyển...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-none border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Truck className="text-indigo-600" size={24} />
            Cài Đặt Vận Chuyển & Logistics Nội Thất
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý phí giao hàng cồng kềnh, ngưỡng miễn phí vận chuyển và chặn tự động các vùng sâu/huyện đảo xa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-none transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Tải lại
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-md shadow-indigo-200 transition-all cursor-pointer"
          >
            <Save size={15} />
            {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>

      {/* Grid Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Hàng Cồng Kềnh / Đồ Nội Thất */}
        <div className="bg-white p-6 rounded-none border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Truck size={18} className="text-amber-500" />
              Sản Phẩm Cồng Kềnh (Nội Thất Lớn)
            </h2>
            <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-200">
              Kích thước lớn
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phí vận chuyển Nội thành (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={settings.bulky_inner_fee}
                onChange={(e) =>
                  setSettings({ ...settings, bulky_inner_fee: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ví dụ: {settings.bulky_inner_fee.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phí vận chuyển Ngoại thành / Các tỉnh (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={settings.bulky_outer_fee}
                onChange={(e) =>
                  setSettings({ ...settings, bulky_outer_fee: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ví dụ: {settings.bulky_outer_fee.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngưỡng Đơn Hàng Được Miễn Phí Giao Hàng (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="500000"
                value={settings.bulky_freeship_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, bulky_freeship_threshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Đơn từ {settings.bulky_freeship_threshold.toLocaleString('vi-VN')} đ sẽ được miễn phí giao.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Hàng Tiêu Chuẩn / Phụ Kiện */}
        <div className="bg-white p-6 rounded-none border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Truck size={18} className="text-blue-500" />
              Sản Phẩm Thường (Phụ Kiện / Trang Trí)
            </h2>
            <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-200">
              Tiêu chuẩn
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phí vận chuyển Nội thành (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={settings.standard_inner_fee}
                onChange={(e) =>
                  setSettings({ ...settings, standard_inner_fee: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ví dụ: {settings.standard_inner_fee.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phí vận chuyển Ngoại thành / Các tỉnh (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={settings.standard_outer_fee}
                onChange={(e) =>
                  setSettings({ ...settings, standard_outer_fee: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ví dụ: {settings.standard_outer_fee.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngưỡng Đơn Hàng Được Miễn Phí Giao Hàng (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                value={settings.standard_freeship_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, standard_freeship_threshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Đơn từ {settings.standard_freeship_threshold.toLocaleString('vi-VN')} đ sẽ được miễn phí giao.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Keywords Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Inner City Keywords */}
        <div className="bg-white p-6 rounded-none border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MapPin size={18} className="text-indigo-600" />
              Từ Khóa Nhận Diện "Nội Thành"
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Địa chỉ của khách chứa một trong các từ khóa này sẽ áp dụng cước Nội thành.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập từ khóa (VD: thủ đức, quận 1...)"
              value={newInnerKeyword}
              onChange={(e) => setNewInnerKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInnerKeyword()}
              className="flex-1 px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={addInnerKeyword}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-none transition-colors cursor-pointer"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {settings.inner_city_keywords.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Chưa có từ khóa nào</span>
            ) : (
              settings.inner_city_keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeInnerKeyword(kw)}
                    className="text-indigo-400 hover:text-indigo-900 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Blacklist / Unsupported Keywords */}
        <div className="bg-white p-6 rounded-none border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600" />
              Từ Khóa Chặn Đặt Hàng / Vùng Không Hỗ Trợ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Địa chỉ chứa từ khóa này sẽ tự động bị ngăn chặn khi đặt hàng đồ cồng kềnh (VD: đảo, huyện đảo).
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập từ khóa từ chối (VD: phú quốc, côn đảo...)"
              value={newUnsupportedKeyword}
              onChange={(e) => setNewUnsupportedKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUnsupportedKeyword()}
              className="flex-1 px-3 py-2 border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={addUnsupportedKeyword}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 rounded-none transition-colors cursor-pointer"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {settings.unsupported_keywords.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Chưa có từ khóa bị chặn</span>
            ) : (
              settings.unsupported_keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeUnsupportedKeyword(kw)}
                    className="text-rose-400 hover:text-rose-900 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Info Callout */}
      <div className="p-4 bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs flex items-start gap-3">
        <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold mb-0.5">Lưu ý nghiệp vụ vận chuyển nội thất:</p>
          <p>
            - Đơn hàng được gắn cờ <strong>Cồng kềnh</strong> tự động nếu chứa ít nhất 1 sản phẩm nội thất lớn (bàn, ghế sofa, giường, tủ...).<br />
            - Khi khách hàng nhập địa chỉ thuộc danh sách từ chối (vd: Côn Đảo), hệ thống sẽ chặn đặt hàng và yêu cầu liên hệ hotline để thỏa thuận cước vận tải chuyên dụng.
          </p>
        </div>
      </div>
    </div>
  );
}
