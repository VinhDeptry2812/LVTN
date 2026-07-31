import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Wrench,
  Package,
  Calendar,
} from 'lucide-react';
import api from '@/services/api';

interface Warranty {
  id: number;
  code: string;
  serial_number: string | null;
  order_id: number;
  product_id: number;
  variant_id: number | null;
  warranty_months: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'claiming' | 'processing' | 'completed' | 'expired' | 'voided';
  claim_reason: string | null;
  resolution_note: string | null;
  product?: {
    id: number;
    name: string;
    thumbnail?: string;
    images?: Array<{ id?: number; image_url: string; is_primary?: boolean }>;
  };
  variant?: {
    id: number;
    name: string;
    image_url?: string;
  };
  user?: {
    name: string;
    phone: string;
  };
}

export default function WarrantyLookupPage() {
  const [queryStr, setQueryStr] = useState('');
  const [results, setResults] = useState<Warranty[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryStr.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get('/warranties/lookup', {
        params: { q: queryStr.trim() },
      });
      setResults(res.data || []);
    } catch (err) {
      console.error('Lỗi tra cứu phiếu bảo hành:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dStr?: string) => {
    if (!dStr) return '-';
    return new Date(dStr).toLocaleDateString('vi-VN');
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Còn hạn bảo hành
          </span>
        );
      case 'claiming':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Đã tiếp nhận yêu cầu
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Wrench className="w-3.5 h-3.5" /> Đang bảo hành / sửa chữa
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle className="w-3.5 h-3.5" /> Hoàn thành bảo hành
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3.5 h-3.5" /> Đã hết hạn bảo hành
          </span>
        );
      case 'voided':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Từ chối / Hủy bảo hành
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Banner header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 shadow-sm mb-2">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tra Cứu Bảo Hành Điện Tử
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Nhập Mã phiếu bảo hành (VD: <span className="font-mono text-amber-600">BH-12-34...</span>), Số điện thoại người mua hoặc Mã đơn hàng để kiểm tra thời hạn và trạng thái sửa chữa.
          </p>
        </div>

        {/* Search Input Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                required
                placeholder="Nhập Mã phiếu (BH-...), Số điện thoại hoặc Mã đơn hàng..."
                value={queryStr}
                onChange={(e) => setQueryStr(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-2xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? 'Đang tra cứu...' : 'Tra cứu ngay'}
            </button>
          </form>
        </div>

        {/* Results section */}
        {searched && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-800 flex items-center justify-between">
              <span>Kết quả tra cứu ({results.length}):</span>
              {results.length > 0 && (
                <span className="text-xs font-normal text-slate-400">
                  Tìm thấy {results.length} phiếu bảo hành phù hợp
                </span>
              )}
            </h2>

            {loading ? (
              <div className="bg-white p-8 rounded-2xl text-center text-slate-400 shadow-sm border border-slate-100">
                Đang truy vấn hệ thống bảo hành...
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center space-y-2 shadow-sm border border-slate-100">
                <p className="text-slate-700 font-semibold">Không tìm thấy phiếu bảo hành phù hợp</p>
                <p className="text-xs text-slate-400">
                  Vui lòng kiểm tra lại thông tin nhập (Mã phiếu, Số điện thoại hoặc Mã đơn hàng).
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs text-slate-400">Mã phiếu bảo hành:</span>
                        <div className="text-base font-mono font-bold text-slate-900">
                          {w.code}
                        </div>
                        {w.serial_number && (
                          <div className="text-xs text-slate-500">
                            Serial: <span className="font-mono font-medium">{w.serial_number}</span>
                          </div>
                        )}
                      </div>
                      <div>{renderStatusBadge(w.status)}</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                          {(() => {
                            let imgSrc = '';
                            if (w.variant?.image_url) imgSrc = w.variant.image_url;
                            else if (w.product?.images && w.product.images.length > 0) {
                              const primary = w.product.images.find((i: any) => i.is_primary);
                              imgSrc = primary ? primary.image_url : w.product.images[0].image_url;
                            } else if (w.product?.thumbnail) imgSrc = w.product.thumbnail;
                            else if ((w.product as any)?.image) imgSrc = (w.product as any).image;

                            return imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={w.product?.name || 'Sản phẩm'}
                                className="w-full h-full object-cover"
                                onError={(e: any) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-slate-400">Sản phẩm:</p>
                          <p className="font-semibold text-slate-800 text-sm line-clamp-1">
                            {w.product?.name || `Sản phẩm #${w.product_id}`}
                          </p>
                          {w.variant && (
                            <p className="text-slate-500">Phân loại: {w.variant.name}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Thời hạn bảo hành:
                        </p>
                        <p className="font-medium text-slate-800">
                          {formatDate(w.start_date)} đến {formatDate(w.end_date)}
                        </p>
                        <p className="text-slate-500">Gói: {w.warranty_months} tháng</p>
                      </div>
                    </div>

                    {w.resolution_note && (
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs space-y-1">
                        <p className="font-bold text-purple-900">Ghi chú phương án xử lý từ Kỹ thuật:</p>
                        <p className="text-purple-700">{w.resolution_note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
