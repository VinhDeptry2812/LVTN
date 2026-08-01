import { useState, useEffect } from 'react';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { AxiosError } from 'axios';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';

import toast from 'react-hot-toast';
import { Trash2, MessageSquare, Loader2, Star, Search, Calendar, User, Package, ChevronRight, Eye, X } from 'lucide-react';

interface Review {
  id: number;
  rating: number;
  comment: string;
  images?: string[];
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  product: {
    id: number;
    name: string;
    image?: string;
    images?: { image_url: string; is_primary: boolean }[];
  };
}

const getProductImage = (product: any) => {
  if (product?.images && product.images.length > 0) {
    const primaryImg = product.images.find((img: any) => img.is_primary);
    if (primaryImg) return primaryImg.image_url;
    return product.images[0].image_url;
  }
  return product?.image || 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
};

export default function ReviewListPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | string>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, ratingFilter]);


  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews');
      setReviews(res.data);
    } catch {
      toast.error('Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = (id: number) => {
    openConfirm({
      title: 'Xóa đánh giá của khách hàng',
      message: 'Bạn có chắc chắn muốn xóa đánh giá này? Hành động này sẽ gỡ bỏ hoàn toàn bình luận và điểm số của khách hàng đối với sản phẩm.',
      confirmText: 'Xóa đánh giá',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/reviews/${id}`);
          toast.success('Đã xóa đánh giá thành công');
          fetchReviews();
        } catch (err) {
          const axiosError = err as AxiosError<{ message?: string }>;
          const errMsg = axiosError.response?.data?.message || 'Xóa thất bại';
          toast.error(errMsg);
        }
      }
    });
  };

  // Filter reviews based on search term and rating stars
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.comment?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating =
      ratingFilter === 'all' || r.rating === Number(ratingFilter);

    return matchesSearch && matchesRating;
  });
  
  const paginatedReviews = filteredReviews.slice((page - 1) * limit, page * limit);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý Đánh giá sản phẩm"
        subtitle="Theo dõi, phản hồi và kiểm duyệt các đánh giá từ người mua hàng"
        icon={MessageSquare}
      />

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo sản phẩm, user, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-900 outline-none transition-all text-sm rounded-none"
          />
        </div>

        {/* Rating Filter Select */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
          <span className="text-sm font-medium text-slate-500 shrink-0">Lọc theo số sao:</span>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-900 outline-none transition-all text-sm rounded-none bg-white min-w-[120px]"
          >
            <option value="all">Tất cả số sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <TableLoader />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-semibold text-slate-600 w-16">ID</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600 w-64">Sản phẩm</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600 w-48">Khách hàng</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600 w-32">Số sao</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600 w-32">Ảnh đính kèm</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Bình luận</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600 w-44">Thời gian</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600 w-24">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReviews.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                        Không tìm thấy đánh giá nào.
                      </td>
                    </tr>
                  ) : (
                    paginatedReviews.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-500">#{r.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProductImage(r.product)}
                              alt={r.product?.name || 'Product'}
                              className="w-10 h-10 object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 line-clamp-1 block text-xs">
                                {r.product?.name || 'Sản phẩm đã xóa'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: #{r.product?.id || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center rounded-none shrink-0">
                              {r.user?.name ? r.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-700 block truncate">
                                {r.user?.name || 'Ẩn danh'}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {r.user?.email || '-'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{renderStars(r.rating)}</td>
                        <td className="px-6 py-4">
                          {r.images && r.images.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <div className="relative w-8 h-8 border border-slate-200 overflow-hidden">
                                <img src={r.images[0]} alt="Review thumb" className="w-full h-full object-cover" />
                              </div>
                              {r.images.length > 1 && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 border border-slate-200">
                                  +{r.images.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Không có</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-xs text-slate-700 line-clamp-2">{r.comment || <span className="italic text-slate-400">Không có nhận xét</span>}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            <span>{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedReview(r)}
                              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer rounded-none"
                              title="Xem chi tiết đánh giá"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer rounded-none"
                              title="Xóa đánh giá vi phạm"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={page}
              totalItems={filteredReviews.length}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="đánh giá"
            />
          </>
        )}
      </div>


      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Modal Chi tiết đánh giá */}
      {selectedReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col scale-100 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-slate-800" size={18} />
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                  Chi tiết đánh giá #{selectedReview.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Product & User Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Section */}
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sản phẩm đánh giá</span>
                  <div className="flex items-start gap-3">
                    <img
                      src={getProductImage(selectedReview.product)}
                      alt={selectedReview.product?.name}
                      className="w-12 h-12 object-cover bg-white border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 text-xs block leading-normal line-clamp-2">
                        {selectedReview.product?.name || 'Sản phẩm không tồn tại'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1 font-mono">ID sản phẩm: #{selectedReview.product?.id}</span>
                    </div>
                  </div>
                </div>

                {/* User Section */}
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Khách hàng</span>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <User size={12} className="text-slate-400" />
                      <span>{selectedReview.user?.name || 'Khách vãng lai'}</span>
                    </div>
                    <div className="text-xs text-slate-600 break-all">{selectedReview.user?.email || 'N/A'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID tài khoản: #{selectedReview.user?.id || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Rating and Date */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Điểm đánh giá:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={i < selectedReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                      />
                    ))}
                    <span className="ml-1 text-sm font-bold text-slate-800">{selectedReview.rating} / 5</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={14} className="text-slate-400" />
                  <span>Thời gian: {new Date(selectedReview.created_at).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Comment Content */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Nội dung nhận xét</span>
                <div className="bg-slate-50/50 p-4 border border-slate-100 text-slate-700 text-xs leading-relaxed whitespace-pre-line rounded-none">
                  {selectedReview.comment || <span className="text-slate-400 italic">Khách hàng không để lại nhận xét bằng lời.</span>}
                </div>
              </div>

              {/* Attached Images */}
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hình ảnh thực tế ({selectedReview.images.length})</span>
                  <div className="flex flex-wrap gap-3">
                    {selectedReview.images.map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-28 h-28 border border-slate-200 overflow-hidden hover:opacity-90 transition-opacity shrink-0 bg-slate-50 flex items-center justify-center group"
                      >
                        <img
                          src={img}
                          alt={`review-attached-${idx}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={16} className="text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedReview(null);
                  handleDelete(selectedReview.id);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Xóa đánh giá
              </button>
              <button
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
