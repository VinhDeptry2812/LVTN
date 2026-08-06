import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Ticket,
  Copy,
  Check,
  Search,
  Filter,
  Calendar,
  ShoppingBag,
  Info,
  Sparkles,
  Tag,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import api from '@/services/api';
import { formatPrice, formatDate } from '@/utils/format';
import { useDragScroll } from '@/hooks/useDragScroll';

interface Voucher {
  id: number;
  code: string;
  description?: string | null;
  discount_type: 'fixed_amount' | 'percentage';
  discount_value: number | string;
  min_order_value?: number | string | null;
  max_discount_amount?: number | string | null;
  start_date: string;
  end_date: string;
  usage_limit?: number | null;
  used_count: number;
  is_used_by_user?: boolean;
  apply_type: 'all' | 'category' | 'product';
  categories?: any[];
  products?: any[];
}

interface VoucherTabProps {
  user: any;
}

const VoucherTab: React.FC<VoucherTabProps> = ({ user }) => {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const filterDrag = useDragScroll();

  // Fetch active vouchers for user
  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/vouchers/active', {
        params: { userId: user?.id },
      });
      setVouchers(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách mã giảm giá:', err);
      toast.error('Không thể tải danh sách mã giảm giá.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [user?.id]);

  // Statistics
  const stats = useMemo(() => {
    const total = vouchers.length;
    const available = vouchers.filter((v) => !v.is_used_by_user).length;
    const used = vouchers.filter((v) => v.is_used_by_user).length;
    return { total, available, used };
  }, [vouchers]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const query = searchTerm.toLowerCase().trim();
      const matchCode = v.code.toLowerCase().includes(query);
      const matchDesc = v.description?.toLowerCase().includes(query) || false;
      const matchSearch = !query || matchCode || matchDesc;

      if (statusFilter === 'available') return matchSearch && !v.is_used_by_user;
      if (statusFilter === 'used') return matchSearch && v.is_used_by_user;
      return matchSearch;
    });
  }, [vouchers, searchTerm, statusFilter]);

  // Copy code handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã: ${code}`);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header & Search / Filter Bar */}
      <div className="bg-white border border-stone-200/80 rounded-lg p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#536257]/10 text-[#536257] flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-headline flex items-center gap-2">
                Kho Mã Giảm Giá
                <Sparkles className="w-4 h-4 text-[#536257] fill-[#536257]" />
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Quản lý các voucher khuyến mãi cá nhân và áp dụng trực tiếp khi thanh toán đơn hàng
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã voucher hoặc từ khóa mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#536257] focus:ring-1 focus:ring-[#536257]/20 bg-stone-50/50 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div
            ref={filterDrag.ref}
            {...filterDrag.events}
            className={`flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none select-none ${
              filterDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <span className="text-xs text-stone-400 flex items-center gap-1 shrink-0 mr-1 hidden sm:flex">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            <button
              type="button"
              onClick={() => {
                if (filterDrag.isDragging) return;
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tất cả ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => {
                if (filterDrag.isDragging) return;
                setStatusFilter('available');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'available'
                  ? 'bg-[#536257] text-white shadow-xs'
                  : 'bg-[#536257]/10 text-[#536257] hover:bg-[#536257]/20 border border-[#536257]/30'
              }`}
            >
              Sẵn sàng dùng ({stats.available})
            </button>
            <button
              type="button"
              onClick={() => {
                if (filterDrag.isDragging) return;
                setStatusFilter('used');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'used'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200/50'
              }`}
            >
              Đã dùng ({stats.used})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Vouchers List Grid */}
      {isLoading ? (
        <div className="bg-white border border-stone-200/80 rounded-lg p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <span className="material-symbols-outlined animate-spin text-4xl text-[#536257] font-light">sync</span>
          <p className="text-xs text-stone-500 font-medium">Đang tải danh sách kho mã giảm giá...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-lg p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#536257]/10 flex items-center justify-center text-[#536257]">
            <Ticket className="w-8 h-8 font-light" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-stone-900">
              {searchTerm || statusFilter !== 'all'
                ? 'Không tìm thấy mã giảm giá phù hợp'
                : 'Hiện chưa có mã giảm giá nào trong kho'}
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              {searchTerm || statusFilter !== 'all'
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang bộ lọc trạng thái khác.'
                : 'Hãy theo dõi các chương trình ưu đãi mới từ cửa hàng để nhận thêm voucher hấp dẫn.'}
            </p>
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-2 text-xs font-semibold text-[#536257] hover:text-[#3d4940] underline cursor-pointer"
            >
              Xóa bộ lọc & tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVouchers.map((v) => {
            const isUsed = v.is_used_by_user;
            const discountVal = Number(v.discount_value);
            const minVal = Number(v.min_order_value || 0);
            const maxVal = v.max_discount_amount ? Number(v.max_discount_amount) : null;
            const isPercentage = v.discount_type === 'percentage';

            let mainTitle = '';
            if (isPercentage) {
              mainTitle = `Giảm ${discountVal}%`;
              if (maxVal) mainTitle += ` (tối đa ${formatPrice(maxVal)})`;
            } else {
              mainTitle = `Giảm ${formatPrice(discountVal)}`;
            }

            return (
              <div
                key={v.id}
                className={`relative flex flex-col justify-between border rounded-lg overflow-hidden transition-all duration-300 ${
                  isUsed
                    ? 'bg-stone-50/80 border-stone-200 opacity-75'
                    : 'bg-white border-[#536257]/20 hover:border-[#536257]/50 hover:shadow-md'
                }`}
              >
                {/* Header Strip with Discount Badge */}
                <div
                  className={`p-4 sm:p-5 flex items-start justify-between gap-3 border-b ${
                    isUsed ? 'bg-stone-100/70 border-stone-200' : 'bg-[#536257]/5 border-[#536257]/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 font-bold text-center p-1 ${
                        isUsed
                          ? 'bg-stone-200 text-stone-600'
                          : 'bg-[#536257] text-white shadow-xs'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-mono tracking-wider leading-none">
                        {isPercentage ? 'Giảm' : 'Voucher'}
                      </span>
                      <span className="text-sm font-black leading-tight mt-0.5">
                        {isPercentage ? `${discountVal}%` : `${Math.round(discountVal / 1000)}k`}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-stone-900 bg-white px-2.5 py-0.5 rounded border border-stone-200/80 shadow-2xs">
                          {v.code}
                        </span>
                        {isUsed ? (
                          <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-stone-500" />
                            Đã sử dụng
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#536257] bg-[#536257]/15 px-2 py-0.5 rounded-full">
                            Có thể dùng
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-stone-800 text-xs sm:text-sm line-clamp-1">
                        {mainTitle}
                      </h4>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(v.code)}
                    title="Sao chép mã"
                    className={`p-2 rounded-md transition cursor-pointer shrink-0 border ${
                      copiedCode === v.code
                        ? 'bg-[#536257] text-white border-[#536257]'
                        : 'bg-white hover:bg-[#536257]/10 text-stone-700 border-stone-200 hover:border-[#536257]/30'
                    }`}
                  >
                    {copiedCode === v.code ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Description callout */}
                    {v.description && (
                      <div className="bg-[#536257]/5 border border-[#536257]/20 rounded-md p-2.5 text-xs text-stone-800 leading-relaxed font-sans flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-[#536257] shrink-0 mt-0.5" />
                        <span>{v.description}</span>
                      </div>
                    )}

                    {/* Conditions breakdown */}
                    <div className="space-y-1.5 text-xs text-stone-600 pt-1">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>
                          Điều kiện:{' '}
                          <strong className="text-stone-800">
                            {minVal > 0 ? `Đơn từ ${formatPrice(minVal)}` : 'Cho mọi đơn hàng'}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>
                          Phạm vi:{' '}
                          <strong className="text-stone-800">
                            {v.apply_type === 'all'
                              ? 'Toàn bộ cửa hàng'
                              : v.apply_type === 'category'
                              ? `Áp dụng ${v.categories?.length || 0} danh mục`
                              : `Áp dụng ${v.products?.length || 0} sản phẩm`}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>
                          Hạn sử dụng:{' '}
                          <strong className="text-stone-800">{formatDate(v.end_date)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-stone-500 font-mono">
                      Hạn: {formatDate(v.start_date)} - {formatDate(v.end_date)}
                    </span>

                    {isUsed ? (
                      <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-md border border-stone-200">
                        Đã dùng cho đơn trước
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/store')}
                        className="px-3.5 py-1.5 bg-[#536257] hover:bg-[#435147] text-white font-medium text-xs rounded-md transition shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Dùng ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VoucherTab;
