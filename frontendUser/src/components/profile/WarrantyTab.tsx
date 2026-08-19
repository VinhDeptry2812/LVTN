import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Camera, X, Search, Filter, ShieldCheck, Clock, AlertCircle, Wrench, Calendar, CheckCircle2, History, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/services/api';
import { getProductImage } from '@/utils/image';
import { formatDate } from '@/utils/format';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useDragScroll } from '@/hooks/useDragScroll';

interface WarrantyTabProps {
  user: any;
}

const getVariantText = (variant: any) => {
  if (!variant) return null;
  if (variant.name) return variant.name;
  if (variant.attributes && typeof variant.attributes === 'object') {
    const entries = Object.entries(variant.attributes).filter(([_, v]) => Boolean(v));
    if (entries.length > 0) {
      return entries
        .map(([key, val]: [string, any]) => {
          const str = String(val);
          const cleanVal = str.includes('|') ? str.split('|')[0].trim() : str.trim();
          return `${key}: ${cleanVal}`;
        })
        .join(' | ');
    }
  }
  return variant.sku ? `SKU: ${variant.sku}` : null;
};

const WarrantyTab: React.FC<WarrantyTabProps> = ({ user }) => {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [isLoadingWarranties, setIsLoadingWarranties] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'claiming_processing' | 'expired'>('all');
  const filterDrag = useDragScroll();

  // Claim modal state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);
  const [claimReason, setClaimReason] = useState('');
  const [claimImages, setClaimImages] = useState<string[]>([]);
  const claimUpload = useImageUpload({ maxFiles: 3, maxSizeMB: 5 });
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Timeline log expand state
  const [expandedLogWarrantyId, setExpandedLogWarrantyId] = useState<number | null>(null);
  
  // Warranty details expand state
  const [expandedWarrantyIds, setExpandedWarrantyIds] = useState<number[]>([]);
  
  const toggleExpand = (id: number) => {
    setExpandedWarrantyIds((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    );
  };

  // Fetch warranties
  const fetchWarranties = async () => {
    setIsLoadingWarranties(true);
    try {
      const res = await api.get('/warranties/my-warranties');
      setWarranties(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách bảo hành:', err);
    } finally {
      setIsLoadingWarranties(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWarranties();
    }
  }, [user]);

  // Statistics
  const stats = useMemo(() => {
    const total = warranties.length;
    const active = warranties.filter(w => w.status === 'active').length;
    const claimingProcessing = warranties.filter(w => w.claim_status && ['claiming', 'processing'].includes(w.claim_status)).length;
    const expired = warranties.filter(w => w.status === 'expired' || w.status === 'voided').length;
    return { total, active, claimingProcessing, expired };
  }, [warranties]);

  // Filtered Warranties
  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      // Search match
      const query = searchTerm.toLowerCase().trim();
      const matchName = w.product?.name?.toLowerCase().includes(query) || false;
      const matchCode = w.code?.toLowerCase().includes(query) || false;
      const matchSerial = w.serial_number?.toLowerCase().includes(query) || false;
      const matchSearch = !query || matchName || matchCode || matchSerial;

      // Status filter match
      if (statusFilter === 'active') return matchSearch && w.status === 'active';
      if (statusFilter === 'claiming_processing') return matchSearch && w.claim_status && ['claiming', 'processing'].includes(w.claim_status);
      if (statusFilter === 'expired') return matchSearch && (w.status === 'expired' || w.status === 'voided');

      return matchSearch;
    });
  }, [warranties, searchTerm, statusFilter]);

  const handleOpenClaimModal = (w: any) => {
    setSelectedWarranty(w);
    setClaimReason(w.claim_reason || '');
    setClaimImages(w.claim_images || []);
    claimUpload.reset();
    setIsClaimModalOpen(true);
  };

  const handleSendClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    if (!claimReason.trim()) {
      toast.error('Vui lòng mô tả lý do hỏng hóc hoặc sự cố của sản phẩm.');
      return;
    }

    setIsSubmittingClaim(true);
    try {
      let finalImageUrls: string[] = [...claimImages];
      if (claimUpload.files.length > 0) {
        const uploadResults = await Promise.all(
          claimUpload.files.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload/image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data?.url as string;
          })
        );
        finalImageUrls = [...finalImageUrls, ...uploadResults.filter(Boolean)];
      }

      await api.patch(`/warranties/${selectedWarranty.id}/claim`, {
        claim_reason: claimReason.trim(),
        claim_images: finalImageUrls.length > 0 ? finalImageUrls : undefined,
      });

      toast.success('Gửi yêu cầu bảo hành thành công! Kỹ thuật viên sẽ sớm làm việc cùng bạn.');
      setIsClaimModalOpen(false);
      claimUpload.reset();
      fetchWarranties();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu bảo hành.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header & Summary Stats Bar */}
      <div className="bg-white border border-stone-200/80 rounded-lg p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#536257]/10 text-[#536257] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-headline">
                Sổ Bảo Hành Điện Tử
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Quản lý quyền lợi, tra cứu mã thẻ và gửi yêu cầu hỗ trợ sửa chữa nội thất trực tuyến
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
              placeholder="Tìm kiếm theo tên sản phẩm, mã bảo hành (BH...) hoặc số Serial..."
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
                setStatusFilter('active');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-[#536257] text-white shadow-xs'
                  : 'bg-[#536257]/10 text-[#536257] hover:bg-[#536257]/20 border border-[#536257]/30'
              }`}
            >
              Còn hạn ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => {
                if (filterDrag.isDragging) return;
                setStatusFilter('claiming_processing');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'claiming_processing'
                  ? 'bg-[#8c7a6b] text-white shadow-xs'
                  : 'bg-[#8c7a6b]/10 text-[#6b5c4c] hover:bg-[#8c7a6b]/20 border border-[#6b5c4c]/30'
              }`}
            >
              Đang xử lý ({stats.claimingProcessing})
            </button>
            <button
              type="button"
              onClick={() => {
                if (filterDrag.isDragging) return;
                setStatusFilter('expired');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'expired'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200/50'
              }`}
            >
              Hết hạn ({stats.expired})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Warranties List */}
      {isLoadingWarranties ? (
        <div className="bg-white border border-stone-200/80 rounded-lg p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <span className="material-symbols-outlined animate-spin text-4xl text-[#536257] font-light">sync</span>
          <p className="text-xs text-stone-500 font-medium">Đang đồng bộ dữ liệu phiếu bảo hành...</p>
        </div>
      ) : filteredWarranties.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-lg p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
            <ShieldCheck className="w-8 h-8 font-light" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-stone-900">
              {searchTerm || statusFilter !== 'all' ? 'Không tìm thấy phiếu bảo hành phù hợp' : 'Chưa có phiếu bảo hành điện tử nào'}
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              {searchTerm || statusFilter !== 'all'
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc trạng thái phía trên.'
                : 'Các sản phẩm nội thất bạn mua tại hệ thống sẽ tự động được kích hoạt bảo hành điện tử và hiển thị tại đây.'}
            </p>
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="mt-2 text-xs font-semibold text-[#536257] hover:text-[#3d4940] underline cursor-pointer"
            >
              Xóa bộ lọc & tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWarranties.map((w) => {
            const isActive = w.status === 'active';
            const isExpired = w.status === 'expired' || w.status === 'voided';
            const isClaiming = w.claim_status === 'claiming';
            const isProcessing = w.claim_status === 'processing';
            const isCompleted = w.claim_status === 'completed';
            const isRejected = w.claim_status === 'rejected';

            return (
              <div
                key={w.id}
                className="bg-white border border-stone-200/90 rounded-lg p-4 sm:p-5 md:p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-4 relative overflow-hidden group"
              >
                {/* Visual Status Strip Indicator */}
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                    isClaiming || isProcessing
                      ? 'bg-[#8c7a6b]'
                      : isActive
                      ? 'bg-[#536257]'
                      : 'bg-stone-300'
                  }`}
                />

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6 pl-2 sm:pl-3">
                  {/* Left: Product Info & Summary */}
                  <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
                    <img
                      src={getProductImage(w, 'https://res.cloudinary.com/dblkv5veh/image/upload/v1784303294/Image-not-found_dm03kv.png')}
                      alt={w.product?.name || 'Sản phẩm'}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover bg-stone-100 rounded-md border border-stone-200/80 shrink-0 shadow-2xs"
                      onError={(e: any) => {
                        e.target.src = 'https://res.cloudinary.com/dblkv5veh/image/upload/v1784303294/Image-not-found_dm03kv.png';
                      }}
                    />
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-stone-900 line-clamp-1 leading-snug">
                          {w.product?.name || `Sản phẩm #${w.product_id}`}
                        </h4>
                        {getVariantText(w.variant) && (
                          <span className="text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full font-medium border border-stone-200/60">
                            {getVariantText(w.variant)}
                          </span>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-[#536257]/10 text-[#536257] border-[#536257]/30'
                            : isExpired
                            ? 'bg-stone-100 text-stone-600 border-stone-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#536257] animate-pulse' : 'bg-stone-400'}`} />
                          {isActive && 'Còn hạn bảo hành'}
                          {w.status === 'expired' && 'Đã hết hạn'}
                          {w.status === 'voided' && 'Phiếu bị hủy'}
                        </span>

                        {w.claim_status && w.claim_status !== 'none' && (
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 ${
                            isClaiming
                              ? 'bg-[#8c7a6b]/10 text-[#6b5c4c] border-[#6b5c4c]/30'
                              : isProcessing
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : isCompleted
                              ? 'bg-[#536257]/10 text-[#536257] border-[#536257]/30'
                              : 'bg-rose-50 text-rose-900 border-rose-200'
                          }`}>
                            <Wrench className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isClaiming && 'Đã gửi yêu cầu (Chờ duyệt)'}
                              {isProcessing && 'Đang tiếp nhận & sửa chữa'}
                              {isCompleted && 'Đã bảo hành thành công'}
                              {isRejected && 'Yêu cầu bị từ chối'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Expand/Collapse Button */}
                  <div className="w-full lg:w-auto flex justify-end shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(w.id)}
                      className="px-4 py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {expandedWarrantyIds.includes(w.id) ? 'Thu gọn' : 'Xem chi tiết'}
                      {expandedWarrantyIds.includes(w.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed View */}
                {expandedWarrantyIds.includes(w.id) && (
                  <div className="mt-4 pt-4 border-t border-stone-100 space-y-4 pl-2 sm:pl-3 animate-fadeIn">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Detailed Info */}
                      <div className="space-y-3">
                        {/* Code & Serial Pills */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-[#536257] bg-[#536257]/10 px-2.5 py-0.5 rounded-md border border-[#536257]/20 flex items-center gap-1">
                            Mã : {w.code}
                          </span>
                          {w.serial_number && (
                            <span className="text-stone-500 font-mono text-[11px] bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200/60">
                              SN: {w.serial_number}
                            </span>
                          )}
                        </div>

                        {/* Period dates */}
                        <div className="text-xs text-stone-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="flex items-center gap-1 text-stone-500">
                            <Calendar className="w-3.5 h-3.5" />
                            Thời hạn:
                          </span>
                          <span className="font-semibold text-stone-800">{formatDate(w.start_date)} - {formatDate(w.end_date)}</span>
                          <span className="text-stone-500">({w.warranty_months} tháng)</span>
                        </div>

                        {/* Claim Images preview if present */}
                        {w.claim_images && Array.isArray(w.claim_images) && w.claim_images.length > 0 && (
                          <div className="pt-1.5 flex items-center gap-2">
                            <span className="text-[11px] text-stone-500 font-medium">Ảnh chụp sự cố:</span>
                            <div className="flex gap-1.5 overflow-x-auto">
                              {w.claim_images.map((imgUrl: string, idx: number) => (
                                <a key={idx} href={imgUrl} target="_blank" rel="noreferrer" className="block shrink-0">
                                  <img
                                    src={imgUrl}
                                    alt={`Ảnh lỗi ${idx + 1}`}
                                    className="w-9 h-9 object-cover rounded-md border border-stone-200 hover:ring-2 hover:ring-[#536257] transition"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {isActive && (
                        <div className="w-full lg:w-auto">
                          {(!w.claim_status || w.claim_status === 'none') && (
                            <button
                              type="button"
                              onClick={() => handleOpenClaimModal(w)}
                              className="w-full lg:w-auto px-4 py-2 bg-[#536257] hover:bg-[#435147] text-white font-medium text-xs rounded-lg transition-all shadow-xs hover:shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              Gửi yêu cầu bảo hành / sửa chữa
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleOpenClaimModal(w)}
                              className="w-full lg:w-auto px-4 py-2 bg-[#536257] hover:bg-[#435147] text-white font-medium text-xs rounded-lg transition-all shadow-xs hover:shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              Gửi yêu cầu đợt mới
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => handleOpenClaimModal(w)}
                              className="w-full lg:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg transition-all shadow-xs hover:shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              Gửi lại yêu cầu bảo hành
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Highlight Appointment Box (Callout) */}
                    {w.appointment_date && (
                      <div className="pt-2">
                        <div className="bg-gradient-to-r from-[#536257]/10 via-[#536257]/5 to-transparent border border-[#536257]/30 rounded-lg p-3 sm:p-3.5 flex items-start gap-3 text-xs text-stone-900">
                          <div className="w-8 h-8 rounded-full bg-[#536257] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-[#536257] text-xs sm:text-sm flex items-center gap-1.5">
                              {w.resolution_type === 'repair' || w.resolution_type === 'replace'
                                ? 'Lịch Hẹn Thu Hồi Về Xưởng'
                                : 'Lịch Hẹn Kỹ Thuật Viên Tới Nhà'}
                            </p>
                            <p className="font-mono text-xs font-semibold text-[#536257]">
                              Thời gian dự kiến: {formatDate(w.appointment_date)}
                            </p>
                            {w.assigned_technician && (
                              <p className="text-xs font-mono font-medium text-blue-900">
                                Nhân viên kĩ thuật: {w.assigned_technician}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resolution Note Callout */}
                    {w.resolution_note && (
                      <div className="pt-2">
                        <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3 text-xs text-stone-800 space-y-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-[#536257] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#536257]" />
                            Ghi chú từ Kỹ Thuật Viên:
                          </span>
                          <p className="text-stone-700 leading-relaxed break-words">{w.resolution_note}</p>
                        </div>
                      </div>
                    )}

                    {/* Timeline Log Section Toggle */}
                    {(() => {
                      // Gom nhóm các log thuộc cùng 1 lý do báo lỗi (đợt bảo hành)
                      const uniqueLogs: any[] = [];
                      const seenReasons = new Set<string>();
                      (w.claim_logs || []).forEach((log: any) => {
                        const key = log.claim_reason ? log.claim_reason.trim().toLowerCase() : `log_${log.id}`;
                        if (!seenReasons.has(key)) {
                          seenReasons.add(key);
                          uniqueLogs.push(log);
                        }
                      });

                      if (uniqueLogs.length === 0) return null;

                      return (
                        <div className="pt-2 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => setExpandedLogWarrantyId(expandedLogWarrantyId === w.id ? null : w.id)}
                            className="text-xs font-semibold text-stone-700 hover:text-[#536257] flex items-center gap-1.5 cursor-pointer py-1 transition"
                          >
                            <History className="w-4 h-4 text-[#536257]" />
                            <span>{expandedLogWarrantyId === w.id ? 'Thu gọn nhật ký bảo hành' : `Xem nhật ký lịch sử (${uniqueLogs.length} đợt)`}</span>
                            {expandedLogWarrantyId === w.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {/* Timeline Tree */}
                          {expandedLogWarrantyId === w.id && (
                            <div className="mt-3 pt-2 space-y-4 pl-3 border-l-2 border-stone-200 ml-2">
                              {uniqueLogs.map((log: any, index: number) => (
                                <div key={log.id || index} className="relative pl-4 space-y-1.5 text-xs">
                                  {/* Dot indicator */}
                                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#536257] ring-4 ring-white" />

                                  <div className="flex items-center justify-between text-stone-500 font-mono text-[11px]">
                                    <span className="font-bold text-stone-800">Đợt #{uniqueLogs.length - index}</span>
                                    <span>{formatDate(log.created_at)}</span>
                                  </div>

                                  {log.claim_reason && (
                                    <p className="text-stone-700 bg-stone-50 p-2.5 rounded-md border border-stone-200/60">
                                      <strong className="text-stone-900 block text-[11px] mb-0.5">Mô tả sự cố:</strong>
                                      {log.claim_reason}
                                    </p>
                                  )}

                                  {log.resolution_type && (
                                    <p className="text-stone-800 font-semibold text-[11px]">
                                      <strong>Phương án xử lý:</strong>{' '}
                                      {log.resolution_type === 'repair' && 'Thu hồi về xưởng sửa chữa'}
                                      {log.resolution_type === 'replace' && 'Đổi mới sản phẩm 1:1'}
                                      {log.resolution_type === 'home_service' && 'KTV hỗ trợ tại nhà'}
                                      {log.resolution_type === 'reject' && 'Từ chối bảo hành'}
                                    </p>
                                  )}

                                  {log.assigned_technician && (
                                    <p className="text-blue-900 font-mono text-[11px]">
                                      <strong>Đội ngũ phụ trách:</strong> {log.assigned_technician}
                                    </p>
                                  )}

                                  {log.resolution_note && (
                                    <p className="text-emerald-950 bg-emerald-50/70 p-2.5 rounded-md border border-emerald-200/60">
                                      <strong className="text-emerald-900 block text-[11px] mb-0.5">Phương án kỹ thuật:</strong>
                                      {log.resolution_note}
                                    </p>
                                  )}

                                  {log.appointment_date && (
                                    <p className="text-[#536257] font-mono text-[11px] bg-[#536257]/10 p-2 rounded-md border border-[#536257]/20">
                                      📅 <strong>Lịch hẹn kiểm tra / thu hồi:</strong> {formatDate(log.appointment_date)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Redesigned Claim Modal */}
      {isClaimModalOpen && selectedWarranty && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSendClaim}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-5 border border-stone-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <h3 className="text-base font-bold text-stone-900 font-headline flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#536257]" />
                {selectedWarranty.claim_status === 'completed'
                  ? 'Gửi Yêu Cầu Bảo Hành Đợt Mới'
                  : selectedWarranty.claim_status === 'rejected'
                  ? 'Gửi Lại Yêu Cầu Bảo Hành (Khiếu Nại)'
                  : 'Yêu Cầu Sửa Chữa / Bảo Hành'}
              </h3>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#536257]/10 text-stone-900 p-3.5 rounded-lg border border-[#536257]/20 text-xs space-y-1 font-mono">
              <p>Mã bảo hành: <span className="font-bold text-[#536257]">{selectedWarranty.code}</span></p>
              <p>Sản phẩm: <span className="font-semibold text-stone-900">{selectedWarranty.product?.name}</span></p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Mô tả chi tiết sự cố / Hỏng hóc (*):
              </label>
              <textarea
                rows={4}
                required
                placeholder="Vui lòng mô tả cụ thể sự cố (ví dụ: gãy chân ghế, bong tróc nệm, trầy xước bề mặt gỗ, khớp nối bị nứt...)"
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-3 focus:outline-none focus:border-[#536257] focus:ring-1 focus:ring-[#536257]/20 bg-stone-50/30 font-body-md transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Hình ảnh minh họa sự cố (Tối đa 3 ảnh):
              </label>
              <div className="grid grid-cols-4 gap-3">
                {claimImages.map((imgUrl, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square border border-stone-200 rounded-lg overflow-hidden bg-stone-50 group shadow-2xs">
                    <img src={imgUrl} alt="Ảnh sự cố" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setClaimImages(prev => prev.filter((_, idx) => idx !== index))}
                      className="absolute top-1 right-1 w-5 h-5 bg-stone-900/70 hover:bg-stone-900 text-white rounded-full flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {claimUpload.previews.map((previewUrl, index) => (
                  <div key={`preview-${index}`} className="relative aspect-square border border-stone-200 rounded-lg overflow-hidden bg-stone-50 group shadow-2xs">
                    <img src={previewUrl} alt="Lỗi sản phẩm" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-stone-900/60 text-white text-[8px] text-center py-0.5 font-mono">Chờ gửi</div>
                    <button
                      type="button"
                      onClick={() => claimUpload.removeImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-stone-900/70 hover:bg-stone-900 text-white rounded-full flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(claimImages.length + claimUpload.previews.length) < 4 && (
                  <label className="aspect-square border border-dashed border-stone-300 hover:border-[#536257] hover:bg-[#536257]/5 transition-all rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer text-stone-500 hover:text-[#536257]">
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Tải ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={claimUpload.handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingClaim}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#536257] hover:bg-[#435147] disabled:opacity-50 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmittingClaim ? 'Đang gửi...' : 'Gửi yêu cầu bảo hành'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WarrantyTab;
