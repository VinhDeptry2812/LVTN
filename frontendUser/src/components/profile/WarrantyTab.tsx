import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Camera, X } from 'lucide-react';
import api from '@/services/api';

interface WarrantyTabProps {
  user: any;
}

const WarrantyTab: React.FC<WarrantyTabProps> = ({ user }) => {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [isLoadingWarranties, setIsLoadingWarranties] = useState(false);

  // Claim modal state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);
  const [claimReason, setClaimReason] = useState('');
  const [claimImages, setClaimImages] = useState<string[]>([]);
  const [claimImageFiles, setClaimImageFiles] = useState<File[]>([]);
  const [claimImagePreviews, setClaimImagePreviews] = useState<string[]>([]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

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

  const handleOpenClaimModal = (w: any) => {
    setSelectedWarranty(w);
    setClaimReason(w.claim_reason || '');
    setClaimImages(w.claim_images || []);
    setClaimImageFiles([]);
    setClaimImagePreviews(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return []; });
    setIsClaimModalOpen(true);
  };

  const handleUploadClaimImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file ảnh dạng PNG, JPEG, JPG, WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setClaimImagePreviews(prev => [...prev, previewUrl]);
    setClaimImageFiles(prev => [...prev, file]);
    e.target.value = '';
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
      if (claimImageFiles.length > 0) {
        const uploadResults = await Promise.all(
          claimImageFiles.map(async (file) => {
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

      toast.success('Gửi yêu cầu bảo hành thành công! Bộ phận kỹ thuật sẽ sớm liên hệ tới bạn.');
      setIsClaimModalOpen(false);
      setClaimImageFiles([]);
      setClaimImagePreviews(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return []; });
      fetchWarranties();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu bảo hành.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const formatDate = (dStr?: string) => {
    if (!dStr) return '-';
    return new Date(dStr).toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-outline-variant/45 rounded-sm p-6 md:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[28px] font-light">verified_user</span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline">
                Sổ bảo hành sản phẩm
              </h3>
              <p className="text-xs text-on-surface-variant/80 mt-1">Quản lý và theo dõi phiếu bảo hành điện tử cho các sản phẩm đã mua của bạn</p>
            </div>
          </div>
        </div>

        {isLoadingWarranties ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary font-light">sync</span>
            <p className="text-xs text-on-surface-variant/70">Đang tải danh sách phiếu bảo hành...</p>
          </div>
        ) : warranties.length === 0 ? (
          <div className="py-16 px-4 border border-dashed border-outline-variant/60 rounded-sm text-center bg-surface-container-low/10 flex flex-col items-center justify-center gap-4">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 font-light">verified_user</span>
            <div>
              <p className="text-sm font-semibold text-on-surface">Bạn chưa có phiếu bảo hành nào</p>
              <p className="text-xs text-on-surface-variant/70 mt-1 max-w-md mx-auto">
                Khi bạn hoàn tất mua sản phẩm tại cửa hàng, phiếu bảo hành điện tử sẽ được tự động kích hoạt và hiển thị tại đây.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {warranties.map((w) => (
              <div
                key={w.id}
                className="border border-outline-variant/50 rounded-sm p-6 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.035)] transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {(() => {
                    let imgSrc = 'https://res.cloudinary.com/dblkv5veh/image/upload/v1784303294/Image-not-found_dm03kv.png';
                    if (w.variant?.image_url) {
                      imgSrc = w.variant.image_url;
                    } else if (w.product?.images && w.product.images.length > 0) {
                      const primary = w.product.images.find((i: any) => i.is_primary);
                      imgSrc = primary ? primary.image_url : w.product.images[0].image_url;
                    } else if ((w.product as any)?.thumbnail) {
                      imgSrc = (w.product as any).thumbnail;
                    } else if ((w.product as any)?.image) {
                      imgSrc = (w.product as any).image;
                    }

                    return (
                      <img
                        src={imgSrc}
                        alt={w.product?.name || 'Sản phẩm'}
                        className="w-16 h-16 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                        onError={(e: any) => {
                          e.target.src = 'https://res.cloudinary.com/dblkv5veh/image/upload/v1784303294/Image-not-found_dm03kv.png';
                        }}
                      />
                    );
                  })()}
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-on-surface truncate">
                      {w.product?.name || `Sản phẩm #${w.product_id}`}
                    </h4>
                    {w.variant && (
                      <p className="text-[10px] text-on-surface-variant/70">Loại: {w.variant.name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                      <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-sm border border-primary/10">
                        Mã BH: {w.code}
                      </span>
                      {w.serial_number && (
                        <span className="text-on-surface-variant/70 font-mono text-[10px]">
                          (Serial: {w.serial_number})
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-on-surface-variant/70 flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      Thời hạn: <span className="font-semibold text-on-surface">{formatDate(w.start_date)} - {formatDate(w.end_date)}</span> ({w.warranty_months} tháng)
                    </p>
                    {w.claim_images && Array.isArray(w.claim_images) && w.claim_images.length > 0 && (
                      <div className="pt-2 flex items-center gap-2">
                        <span className="text-[10px] text-on-surface-variant font-medium">Ảnh sự cố:</span>
                        <div className="flex gap-1.5 overflow-x-auto">
                          {w.claim_images.map((imgUrl: string, idx: number) => (
                            <a key={idx} href={imgUrl} target="_blank" rel="noreferrer" className="block shrink-0">
                              <img
                                src={imgUrl}
                                alt={`Ảnh lỗi ${idx + 1}`}
                                className="w-8 h-8 object-cover rounded-sm border border-outline-variant/30 hover:opacity-80 transition"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-2.5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-outline-variant/20">
                  <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${
                    w.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : w.status === 'expired'
                      ? 'bg-stone-100 text-stone-600 border-stone-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {w.status === 'active' && 'Còn hạn bảo hành'}
                    {w.status === 'expired' && 'Đã hết hạn'}
                    {w.status === 'voided' && 'Thẻ bị hủy / từ chối'}
                  </span>

                  {w.claim_status && w.claim_status !== 'none' && (
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold border flex items-center gap-1 ${
                      w.claim_status === 'claiming'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                        : w.claim_status === 'processing'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : w.claim_status === 'completed'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {w.claim_status === 'claiming' ? 'hourglass_empty' : w.claim_status === 'processing' ? 'build' : w.claim_status === 'completed' ? 'check_circle' : 'cancel'}
                      </span>
                      {w.claim_status === 'claiming' && 'Trạng thái: Đã gửi yêu cầu (Chờ duyệt)'}
                      {w.claim_status === 'processing' && 'Trạng thái: Đang tiếp nhận & sửa chữa'}
                      {w.claim_status === 'completed' && 'Trạng thái: Đã xử lý xong'}
                      {w.claim_status === 'rejected' && 'Trạng thái: Yêu cầu bị từ chối'}
                    </span>
                  )}

                  {w.resolution_note && (
                    <p className="text-[11px] text-purple-800 bg-purple-50 p-2.5 rounded-sm border border-purple-200 max-w-xs text-left md:text-right">
                      <span className="font-bold block text-[10px] uppercase text-purple-600 mb-0.5">Phản hồi kỹ thuật:</span>
                      {w.resolution_note}
                    </p>
                  )}

                  {w.status === 'active' && (
                    <div>
                      {(!w.claim_status || w.claim_status === 'none') && (
                        <button
                          onClick={() => handleOpenClaimModal(w)}
                          className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[15px]">build</span>
                          Yêu cầu bảo hành / sửa chữa
                        </button>
                      )}

                      {w.claim_status === 'completed' && (
                        <button
                          onClick={() => handleOpenClaimModal(w)}
                          className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[15px]">build</span>
                          Yêu cầu bảo hành đợt mới
                        </button>
                      )}

                      {w.claim_status === 'rejected' && (
                        <button
                          onClick={() => handleOpenClaimModal(w)}
                          className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all duration-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[15px]">build</span>
                          Gửi lại yêu cầu / Khiếu nại
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Yêu cầu bảo hành */}
      {isClaimModalOpen && selectedWarranty && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleSendClaim}
            className="bg-white rounded-sm shadow-xl max-w-lg w-full p-6 space-y-5 border border-outline-variant/40"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[22px]">build</span>
                {selectedWarranty.claim_status === 'completed'
                  ? 'Gửi Yêu Cầu Bảo Hành Đợt Mới'
                  : selectedWarranty.claim_status === 'rejected'
                  ? 'Gửi Lại Yêu Cầu Bảo Hành (Khiếu Nại)'
                  : 'Gửi yêu cầu sửa chữa / bảo hành'}
              </h3>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs bg-amber-50 text-amber-800 p-3 rounded-sm border border-amber-200/60 space-y-1">
              <p>Mã bảo hành: <span className="font-mono font-bold">{selectedWarranty.code}</span></p>
              <p>Sản phẩm: <span className="font-semibold">{selectedWarranty.product?.name}</span></p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block">
                Mô tả chi tiết sự cố / Hỏng hóc (*):
              </label>
              <textarea
                rows={4}
                required
                placeholder="Vui lòng mô tả cụ thể hiện trạng của sản phẩm (ví dụ: gãy chân ghế, bong tróc nệm, trầy xước bề mặt gỗ...)"
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                className="w-full text-xs border border-outline-variant rounded-sm p-3 focus:outline-none focus:border-primary font-body-md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block">
                Hình ảnh minh họa sự cố (Tải trực tiếp từ máy):
              </label>
              <div className="grid grid-cols-4 gap-3">
                {claimImages.map((imgUrl, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square border border-outline-variant/40 rounded-sm overflow-hidden bg-surface-container-low group">
                    <img src={imgUrl} alt="Ảnh sự cố" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setClaimImages(prev => prev.filter((_, idx) => idx !== index))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {claimImagePreviews.map((previewUrl, index) => (
                  <div key={`preview-${index}`} className="relative aspect-square border border-outline-variant/40 rounded-sm overflow-hidden bg-surface-container-low group">
                    <img src={previewUrl} alt="Lỗi sản phẩm" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] text-center py-0.5 font-mono">Chờ gửi</div>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(previewUrl);
                        setClaimImagePreviews(prev => prev.filter((_, idx) => idx !== index));
                        setClaimImageFiles(prev => prev.filter((_, idx) => idx !== index));
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(claimImages.length + claimImagePreviews.length) < 4 && (
                  <label className="aspect-square border border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer text-on-surface-variant/70 hover:text-primary">
                    <Camera className="w-5 h-5 font-light" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider">Tải ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadClaimImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high rounded-sm transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingClaim}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmittingClaim ? 'Đang gửi...' : 'Gửi yêu cầu ngay'}
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
