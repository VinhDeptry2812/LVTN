import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Wrench,
  Calendar,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import api from '@/services/api';
import { formatDate } from '@/utils/format';
import { getProductImage } from '@/utils/image';

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
    name?: string;
    sku?: string;
    attributes?: Record<string, any>;
    image_url?: string;
  };
  user?: {
    name: string;
    phone: string;
  };
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

const WarrantyLookupPage: React.FC = () => {
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
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface">
      <Header />

      <main className="flex-grow pt-[100px] md:pt-[120px] pb-24 animate-in fade-in duration-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Banner header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm mb-2">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">
              Tra Cứu Bảo Hành Điện Tử
            </h1>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
              Nhập Mã phiếu bảo hành (VD: <span className="font-mono text-primary font-bold">BH-12-34...</span>), Số điện thoại người mua hoặc Mã đơn hàng để kiểm tra thời hạn và trạng thái sửa chữa.
            </p>
          </div>

          {/* Search Input Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/40">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  placeholder="Nhập Mã phiếu (BH-...), Số điện thoại hoặc Mã đơn hàng..."
                  value={queryStr}
                  onChange={(e) => setQueryStr(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 text-sm border border-outline-variant/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <Search className="w-5 h-5 text-on-surface-variant/60 absolute left-3.5 top-3.5" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-primary hover:bg-primary/90 text-on-primary font-medium text-sm rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {loading ? 'Đang tra cứu...' : 'Tra cứu ngay'}
              </button>
            </form>
          </div>

          {/* Results section */}
          {searched && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-on-surface flex items-center justify-between">
                <span>Kết quả tra cứu ({results.length}):</span>
                {results.length > 0 && (
                  <span className="text-xs font-normal text-on-surface-variant">
                    Tìm thấy {results.length} phiếu bảo hành phù hợp
                  </span>
                )}
              </h2>

              {loading ? (
                <div className="bg-white p-8 rounded-2xl text-center text-on-surface-variant shadow-sm border border-outline-variant/30">
                  Đang truy vấn hệ thống bảo hành...
                </div>
              ) : results.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center space-y-2 shadow-sm border border-outline-variant/30">
                  <p className="text-on-surface font-semibold">Không tìm thấy phiếu bảo hành phù hợp</p>
                  <p className="text-xs text-on-surface-variant">
                    Vui lòng kiểm tra lại thông tin nhập (Mã phiếu, Số điện thoại hoặc Mã đơn hàng).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((w) => (
                    <div
                      key={w.id}
                      className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4 hover:shadow-md transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                        <div>
                          <span className="text-xs text-on-surface-variant">Mã phiếu bảo hành:</span>
                          <div className="text-base font-mono font-bold text-on-surface">
                            {w.code}
                          </div>
                          {w.serial_number && (
                            <div className="text-xs text-on-surface-variant">
                              Serial: <span className="font-mono font-medium text-on-surface">{w.serial_number}</span>
                            </div>
                          )}
                        </div>
                        <div>{renderStatusBadge(w.status)}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-surface-container rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-outline-variant/20">
                            <img
                              src={getProductImage(w)}
                              alt={w.product?.name || 'Sản phẩm'}
                              className="w-full h-full object-cover"
                              onError={(e: any) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-on-surface-variant">Sản phẩm:</p>
                            <p className="font-semibold text-on-surface text-sm line-clamp-1">
                              {w.product?.name || `Sản phẩm #${w.product_id}`}
                            </p>
                            {getVariantText(w.variant) && (
                              <p className="text-on-surface-variant mt-0.5">
                                Phân loại: <span className="font-medium text-on-surface">{getVariantText(w.variant)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-on-surface-variant flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Thời hạn bảo hành:
                          </p>
                          <p className="font-medium text-on-surface">
                            {formatDate(w.start_date)} đến {formatDate(w.end_date)}
                          </p>
                          <p className="text-on-surface-variant">Gói: {w.warranty_months} tháng</p>
                        </div>
                      </div>

                      {w.resolution_note && (
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs space-y-1">
                          <p className="font-bold text-primary">Ghi chú phương án xử lý từ Kỹ thuật:</p>
                          <p className="text-on-surface">{w.resolution_note}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WarrantyLookupPage;
