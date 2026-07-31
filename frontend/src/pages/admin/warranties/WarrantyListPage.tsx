import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Wrench,
  Package,
  User,
  Calendar,
  Image as ImageIcon,
  X,
  Phone,
  ClipboardList,
} from 'lucide-react';
import api from '@/services/api';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import toast from 'react-hot-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface Warranty {
  id: number;
  code: string;
  serial_number: string | null;
  order_id: number;
  product_id: number;
  variant_id: number | null;
  user_id: number | null;
  warranty_months: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'voided';
  claim_status: 'none' | 'claiming' | 'processing' | 'completed' | 'rejected';
  claim_reason: string | null;
  claim_images: string[] | null;
  resolution_note: string | null;
  created_at: string;
  product?: {
    id: number;
    name: string;
    thumbnail?: string;
    images?: Array<{ id?: number; image_url: string; is_primary?: boolean }>;
  };
  variant?: {
    id: number;
    name: string;
    sku?: string;
    image_url?: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  order?: {
    id: number;
    created_at: string;
    shipping_address: string;
    phone: string;
  };
}

export default function WarrantyListPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Thống kê tổng quan
  const [stats, setStats] = useState({
    total: 0,
    claiming: 0,
    processing: 0,
    completed: 0,
    active: 0,
  });

  // Modal xử lý
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardStatus, setCardStatus] = useState<'active' | 'expired' | 'voided'>('active');
  const [decision, setDecision] = useState<'accept' | 'reject'>('accept');
  const [claimStatus, setClaimStatus] = useState<'none' | 'claiming' | 'processing' | 'completed' | 'rejected'>('processing');
  const [resolutionNote, setResolutionNote] = useState('');
  const [processingSubmit, setProcessingSubmit] = useState(false);

  // Xem ảnh phóng to
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchOverallStats = async () => {
    try {
      const res = await api.get('/warranties/admin/list', {
        params: { limit: 1000 },
      });
      const items: Warranty[] = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStats({
        total: res.data?.meta?.totalItems || items.length,
        claiming: items.filter((w) => w.claim_status === 'claiming').length,
        processing: items.filter((w) => w.claim_status === 'processing').length,
        completed: items.filter((w) => w.claim_status === 'completed').length,
        active: items.filter((w) => w.status === 'active').length,
      });
    } catch {
      // silent
    }
  };

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const isClaimStatus = ['claiming', 'processing', 'completed', 'rejected'].includes(statusFilter);
      const isCardStatus = ['active', 'expired', 'voided'].includes(statusFilter);

      const params: any = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (isClaimStatus) params.claim_status = statusFilter;
      if (isCardStatus) params.status = statusFilter;

      const res = await api.get('/warranties/admin/list', { params });

      if (res.data && res.data.data) {
        setWarranties(res.data.data);
        setTotalItems(res.data.meta?.totalItems || res.data.data.length);
      } else if (Array.isArray(res.data)) {
        setWarranties(res.data);
        setTotalItems(res.data.length);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách bảo hành:', err);
      toast.error('Không thể tải danh sách phiếu bảo hành');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverallStats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchWarranties();
  }, [page, statusFilter, debouncedSearch]);

  const handleOpenProcessModal = (w: Warranty) => {
    setSelectedWarranty(w);
    setCardStatus(w.status);
    if (w.claim_status === 'rejected') {
      setDecision('reject');
      setClaimStatus('rejected');
    } else if (w.claim_status === 'claiming') {
      setDecision('accept');
      setClaimStatus('processing'); // Chấp nhận yêu cầu mới -> tự động chuyển sang Processing
    } else if (w.claim_status === 'processing') {
      setDecision('accept');
      setClaimStatus('processing');
    } else if (w.claim_status === 'completed') {
      setDecision('accept');
      setClaimStatus('completed');
    } else {
      setDecision('accept');
      setClaimStatus('none');
    }
    setResolutionNote(w.resolution_note || '');
    setIsModalOpen(true);
  };

  const handleSaveProcess = async () => {
    if (!selectedWarranty) return;

    if (decision === 'reject' && !resolutionNote.trim()) {
      toast.error('Vui lòng nhập lý do từ chối bảo hành');
      return;
    }

    setProcessingSubmit(true);
    let targetClaimStatus = claimStatus;
    if (decision === 'reject') {
      targetClaimStatus = 'rejected';
    } else if (selectedWarranty.claim_status === 'claiming') {
      targetClaimStatus = 'processing'; // Tự động chuyển từ claiming -> processing
    }

    try {
      await api.patch(`/warranties/admin/${selectedWarranty.id}/process`, {
        status: cardStatus,
        claim_status: targetClaimStatus,
        resolution_note: resolutionNote || undefined,
      });

      toast.success('Cập nhật tiến độ bảo hành thành công!');
      setIsModalOpen(false);
      fetchWarranties();
      fetchOverallStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật bảo hành.');
    } finally {
      setProcessingSubmit(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Còn hạn
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3.5 h-3.5" /> Hết hạn
          </span>
        );
      case 'voided':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Bị hủy
          </span>
        );
      default:
        return null;
    }
  };

  const renderClaimBadge = (claimStatus: string) => {
    switch (claimStatus) {
      case 'claiming':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> Khách yêu cầu
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Wrench className="w-3.5 h-3.5" /> Đang sửa chữa
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle className="w-3.5 h-3.5" /> Đã xong
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Từ chối đợt này
          </span>
        );
      case 'none':
      default:
        return (
          <span className="text-xs text-slate-400 font-medium italic">Không có yêu cầu</span>
        );
    }
  };

  const formatDate = (dStr?: string) => {
    if (!dStr) return '-';
    return new Date(dStr).toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Quản lý Phiếu Bảo Hành"
        subtitle="Theo dõi hiệu lực bảo hành sản phẩm và quản lý các đợt yêu cầu sửa chữa của khách hàng."
        icon={ShieldCheck}
      />

      {/* Thẻ thống kê tổng quan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          title="Tổng phiếu bảo hành"
          value={stats.total}
          icon={ClipboardList}
          iconColorClass="text-slate-600"
          iconBgClass="bg-slate-50"
        />
        <StatCard
          title="Khách gửi yêu cầu"
          value={stats.claiming}
          icon={AlertTriangle}
          iconColorClass="text-amber-600"
          iconBgClass="bg-amber-50"
        />
        <StatCard
          title="Đang sửa chữa"
          value={stats.processing}
          icon={Wrench}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-50"
        />
        <StatCard
          title="Thẻ còn hạn"
          value={stats.active}
          icon={CheckCircle}
          iconColorClass="text-emerald-600"
          iconBgClass="bg-emerald-50"
        />
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-100 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-50 p-1">
            {[
              { label: 'Tất cả phiếu', value: 'all' },
              { label: 'Khách yêu cầu', value: 'claiming' },
              { label: 'Đang sửa chữa', value: 'processing' },
              { label: 'Còn hạn', value: 'active' },
              { label: 'Đã xử lý xong đợt này', value: 'completed' },
              { label: 'Hết hạn / Từ chối', value: 'expired' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === tab.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm theo Mã phiếu, SĐT, KH..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <TableLoader message="Đang tải dữ liệu phiếu bảo hành..." />
          ) : warranties.length === 0 ? (
            <div className="text-center py-20">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600 mt-3">Không tìm thấy phiếu bảo hành nào</p>
              <p className="text-xs text-slate-400 mt-1">Các phiếu bảo hành của khách hàng sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Mã bảo hành</th>
                  <th className="py-3.5 px-6">Sản phẩm</th>
                  <th className="py-3.5 px-6">Khách hàng</th>
                  <th className="py-3.5 px-6">Thời hạn</th>
                  <th className="py-3.5 px-6">Trạng thái phiếu</th>
                  <th className="py-3.5 px-6">Tiến độ yêu cầu</th>
                  <th className="py-3.5 px-6 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warranties.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-800">
                      <div>{w.code}</div>
                      <div className="text-[11px] text-amber-600 font-medium mt-0.5">
                        Đơn #{w.order_id}
                      </div>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-bold text-slate-700 line-clamp-1">
                        {w.product?.name || `Sản phẩm #${w.product_id}`}
                      </div>
                      {w.variant && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Phân loại: {w.variant.name}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {w.user ? (
                        <div>
                          <p className="font-bold text-slate-700">{w.user.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{w.user.phone || w.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Khách vãng lai</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div>
                        {formatDate(w.start_date)} - {formatDate(w.end_date)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">({w.warranty_months} tháng)</div>
                    </td>
                    <td className="py-4 px-6">{renderStatusBadge(w.status)}</td>
                    <td className="py-4 px-6">{renderClaimBadge(w.claim_status)}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenProcessModal(w)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-amber-600 transition-all cursor-pointer"
                      >
                        <Eye size={13} />
                        Xử lí
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {warranties.length > 0 && (
          <AdminPagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={limit}
            onPageChange={setPage}
            itemLabel="phiếu bảo hành"
          />
        )}
      </div>

      {/* Modal Xử lý Bảo hành */}
      {isModalOpen && selectedWarranty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  Chi tiết Phiếu Bảo Hành: {selectedWarranty.code}
                </h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                  Khởi tạo ngày: {formatDate(selectedWarranty.created_at)}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Thông tin chính */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-100 p-4 space-y-2">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Thông tin sản phẩm
                  </h3>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Package size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-700">
                      {selectedWarranty.product?.name || `Sản phẩm #${selectedWarranty.product_id}`}
                    </span>
                  </p>
                  {selectedWarranty.variant && (
                    <p className="text-slate-500 pl-5">
                      Phân loại: <span className="font-medium text-slate-700">{selectedWarranty.variant.name}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-slate-600 mt-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span>
                      Hạn bảo hành: <strong className="text-slate-700">{formatDate(selectedWarranty.start_date)}</strong> đến <strong className="text-slate-700">{formatDate(selectedWarranty.end_date)}</strong> ({selectedWarranty.warranty_months} tháng)
                    </span>
                  </p>
                </div>

                <div className="border border-slate-100 p-4 space-y-2">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Thông tin khách hàng & Đơn hàng
                  </h3>
                  <p className="flex items-center gap-2 text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-700">
                      {selectedWarranty.user?.name || 'Khách vãng lai'}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>{selectedWarranty.user?.phone || selectedWarranty.order?.phone || 'Chưa cập nhật SĐT'}</span>
                  </p>
                  <p className="text-slate-600 pl-5">
                    Mã đơn gốc: <strong className="text-amber-600">Đơn hàng #{selectedWarranty.order_id}</strong>
                  </p>
                </div>
              </div>

              {/* Thông tin yêu cầu bảo hành từ khách hàng nếu có */}
              {selectedWarranty.claim_reason && (
                <div className="bg-amber-50/60 border border-amber-200/60 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold border-b border-amber-200/50 pb-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Lý do khai báo sự cố từ khách hàng</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{selectedWarranty.claim_reason}</p>

                  {selectedWarranty.claim_images && selectedWarranty.claim_images.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ImageIcon size={13} /> Hình ảnh minh họa sự cố:
                      </p>
                      <div className="grid grid-cols-4 gap-3">
                        {selectedWarranty.claim_images.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewImage(img)}
                            className="aspect-square bg-white border border-slate-200 overflow-hidden hover:opacity-85 transition-opacity cursor-pointer group relative"
                          >
                            <img
                              src={img}
                              alt={`Sự cố ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ImageIcon className="text-white" size={16} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Cập nhật cho Admin */}
              <div className="border border-slate-100 p-4 space-y-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Wrench size={14} className="text-amber-600" /> Cập nhật Tiến độ & Phương án kỹ thuật
                </h3>

                {/* Thông báo nếu chưa có yêu cầu từ khách hàng */}
                {selectedWarranty.claim_status === 'none' && (
                  <div className="bg-amber-50/70 border border-amber-200 text-amber-800 p-3 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <span>Phiếu bảo hành này hiện <strong>chưa có yêu cầu sửa chữa/bảo hành</strong> từ khách hàng. Bạn không thể cập nhật tiến độ khi chưa có đợt yêu cầu.</span>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Trạng thái Thẻ bảo hành:
                  </label>
                  <div className="pt-0.5">
                    {renderStatusBadge(cardStatus)}
                  </div>
                </div>

                {/* Quyết định xử lý Yêu cầu */}
                {selectedWarranty.claim_status !== 'none' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Quyết định xử lý Yêu cầu:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setDecision('accept');
                            if (claimStatus === 'rejected') setClaimStatus('processing');
                          }}
                          className={`p-3 border text-left flex items-start gap-3 transition-all cursor-pointer ${
                            decision === 'accept'
                              ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-full mt-0.5 ${decision === 'accept' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <CheckCircle size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-800">Chấp nhận bảo hành</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Tiếp nhận sửa chữa hoặc hoàn thành thay thế linh kiện</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDecision('reject');
                            setClaimStatus('rejected');
                          }}
                          className={`p-3 border text-left flex items-start gap-3 transition-all cursor-pointer ${
                            decision === 'reject'
                              ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-full mt-0.5 ${decision === 'reject' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <XCircle size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-800">Từ chối bảo hành</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Yêu cầu không hợp lệ hoặc vi phạm chính sách</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Tiến độ nếu Chấp nhận */}
                    {decision === 'accept' && (
                      <div>
                        {selectedWarranty.claim_status === 'claiming' ? (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-xs flex items-center gap-2">
                            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                            <span>Khi chấp nhận yêu cầu mới, hệ thống sẽ <strong>tự động chuyển sang trạng thái Đang tiếp nhận & sửa chữa (Processing)</strong>.</span>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                              Cập nhật tiến độ xử lý:
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3 text-xs">
                              <label className={`flex items-center gap-2 p-2.5 border cursor-pointer font-medium transition ${claimStatus === 'processing' ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                                <input
                                  type="radio"
                                  name="claim_progress"
                                  value="processing"
                                  checked={claimStatus === 'processing'}
                                  onChange={() => setClaimStatus('processing')}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>Đang tiếp nhận & sửa chữa (Processing)</span>
                              </label>
                              <label className={`flex items-center gap-2 p-2.5 border cursor-pointer font-medium transition ${claimStatus === 'completed' ? 'bg-purple-50 border-purple-400 text-purple-800 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                                <input
                                  type="radio"
                                  name="claim_progress"
                                  value="completed"
                                  checked={claimStatus === 'completed'}
                                  onChange={() => setClaimStatus('completed')}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span>Đã xử lý xong (Completed)</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ghi chú kỹ thuật / Lý do từ chối */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {decision === 'reject' ? (
                          <span className="text-rose-600 font-bold">Lý do từ chối bảo hành (Bắt buộc):</span>
                        ) : (
                          'Phương án kỹ thuật / Ghi chú xử lý:'
                        )}
                      </label>
                      <textarea
                        rows={3}
                        placeholder={
                          decision === 'reject'
                            ? 'Ví dụ: Sản phẩm bị ngâm nước / Đã hết thời hạn bảo hành / Hỏng hóc do va đập ngoại lực...'
                            : 'Ví dụ: Đã thay thế linh kiện nệm ghế mới / Đổi mới sản phẩm 1:1 cho khách hàng...'
                        }
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        className={`w-full text-xs border p-2.5 focus:outline-none transition-colors ${
                          decision === 'reject'
                            ? 'border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-slate-200 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={processingSubmit || selectedWarranty.claim_status === 'none'}
                onClick={handleSaveProcess}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                {processingSubmit ? 'Đang cập nhật...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Xem ảnh sự cố lớn */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Hình ảnh sự cố lớn"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-white text-slate-800 rounded-full p-1.5 shadow-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
