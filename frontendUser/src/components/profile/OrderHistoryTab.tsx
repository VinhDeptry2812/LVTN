import React from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { useOrderHistory } from './order-history/useOrderHistory';
import { OrderFilterTabs } from './order-history/OrderFilterTabs';
import { OrderCard } from './order-history/OrderCard';
import { OrderDetailModal } from './order-history/OrderDetailModal';
import { ProductReviewModal } from './order-history/ProductReviewModal';
import { OrderCancelModal } from './order-history/OrderCancelModal';
import { OrderReturnModal } from './order-history/OrderReturnModal';
import { OrderReturnSuccessModal } from './order-history/OrderReturnSuccessModal';

interface OrderHistoryTabProps {
  user?: any;
}

export const OrderHistoryTab: React.FC<OrderHistoryTabProps> = ({ user }) => {
  const {
    // Data & status
    isLoadingOrders,
    orders,
    filteredOrders,
    orderSearchQuery,
    setOrderSearchQuery,
    selectedStatus,
    setSelectedStatus,
    isRepaying,

    // Modal state
    selectedOrder,
    setSelectedOrder,
    reviewOrder,
    setReviewOrder,
    selectedProductToReview,
    setSelectedProductToReview,
    reviewProductImage,
    modalRating,
    setModalRating,
    hoverRating,
    setHoverRating,
    modalComment,
    setModalComment,
    modalImages,
    setModalImages,
    modalImagePreviews,
    setModalImagePreviews,
    setModalImageFiles,
    modalIsAnonymous,
    setModalIsAnonymous,
    submittingReview,
    editingReviewId,

    returnOrder,
    setReturnOrder,
    selectedReturnItems,
    returnQuantities,
    returnReason,
    setReturnReason,
    returnActionType,
    setReturnActionType,
    returnDescription,
    setReturnDescription,
    returnImagePreviews,
    setReturnImagePreviews,
    setReturnImageFiles,
    submittingReturn,
    showReturnSuccess,
    setShowReturnSuccess,
    submittedReturnInfo,

    cancelModalOrderId,
    setCancelModalOrderId,
    cancelReasonOption,
    setCancelReasonOption,
    customCancelReason,
    setCustomCancelReason,
    isSubmittingCancel,

    confirmModal,
    closeConfirm,

    // Handlers
    handleCompleteOrder,
    handleCancelOrder,
    handleConfirmCancelOrder,
    handleRepay,
    handleReorder,
    handleOpenReview,
    handleUploadReviewImage,
    handleSubmitModalReview,
    getExistingReview,
    handleOpenReturnModal,
    handleToggleReturnItem,
    handleToggleAllReturnItems,
    handleUpdateReturnQuantity,
    handleUploadReturnImage,
    handleSubmitReturnRequest,
    handleDownloadInvoice,
  } = useOrderHistory(user);

  if (isLoadingOrders) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-on-surface-variant">Đang tải lịch sử đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-on-surface uppercase tracking-wider font-headline">
          Lịch sử đơn hàng
        </h2>
        <p className="text-xs text-on-surface-variant/80 mt-1">
          Quản lý và theo dõi trạng thái các đơn hàng của bạn ({orders.length} đơn hàng)
        </p>
      </div>

      {/* Tabs & Search Filter */}
      <OrderFilterTabs
        orders={orders}
        orderSearchQuery={orderSearchQuery}
        setOrderSearchQuery={setOrderSearchQuery}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      {/* List đơn hàng */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center bg-surface-container-low/20 border border-outline-variant/30 rounded-sm space-y-3">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
              local_shipping
            </span>
            <p className="text-sm text-on-surface-variant font-medium">
              Không tìm thấy đơn hàng phù hợp.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onSelectOrder={setSelectedOrder}
              onCompleteOrder={handleCompleteOrder}
              onCancelOrder={handleCancelOrder}
              onRepayOrder={handleRepay}
              onReorder={handleReorder}
              onOpenReview={handleOpenReview}
              getExistingReview={getExistingReview}
              isRepaying={isRepaying}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <OrderDetailModal
        selectedOrder={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onCompleteOrder={handleCompleteOrder}
        onCancelOrder={handleCancelOrder}
        onOpenReturnModal={handleOpenReturnModal}
        onDownloadInvoice={handleDownloadInvoice}
        onOpenReview={handleOpenReview}
        getExistingReview={getExistingReview}
      />

      <ProductReviewModal
        reviewOrder={reviewOrder}
        selectedProductToReview={selectedProductToReview}
        reviewProductImage={reviewProductImage}
        modalRating={modalRating}
        setModalRating={setModalRating}
        hoverRating={hoverRating}
        setHoverRating={setHoverRating}
        modalComment={modalComment}
        setModalComment={setModalComment}
        modalImages={modalImages}
        setModalImages={setModalImages}
        modalImagePreviews={modalImagePreviews}
        setModalImagePreviews={setModalImagePreviews}
        setModalImageFiles={setModalImageFiles}
        modalIsAnonymous={modalIsAnonymous}
        setModalIsAnonymous={setModalIsAnonymous}
        submittingReview={submittingReview}
        editingReviewId={editingReviewId}
        onClose={() => {
          setReviewOrder(null);
          setSelectedProductToReview(null);
        }}
        onSubmit={handleSubmitModalReview}
        onUploadImage={handleUploadReviewImage}
      />

      <OrderReturnModal
        returnOrder={returnOrder}
        onClose={() => setReturnOrder(null)}
        selectedReturnItems={selectedReturnItems}
        handleToggleReturnItem={handleToggleReturnItem}
        handleToggleAllReturnItems={handleToggleAllReturnItems}
        returnQuantities={returnQuantities}
        handleUpdateReturnQuantity={handleUpdateReturnQuantity}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        returnActionType={returnActionType}
        setReturnActionType={setReturnActionType}
        returnDescription={returnDescription}
        setReturnDescription={setReturnDescription}
        returnImagePreviews={returnImagePreviews}
        setReturnImagePreviews={setReturnImagePreviews}
        setReturnImageFiles={setReturnImageFiles}
        handleUploadReturnImage={handleUploadReturnImage}
        submittingReturn={submittingReturn}
        onSubmitReturnRequest={handleSubmitReturnRequest}
      />

      <OrderCancelModal
        cancelModalOrderId={cancelModalOrderId}
        onClose={() => setCancelModalOrderId(null)}
        cancelReasonOption={cancelReasonOption}
        setCancelReasonOption={setCancelReasonOption}
        customCancelReason={customCancelReason}
        setCustomCancelReason={setCustomCancelReason}
        isSubmittingCancel={isSubmittingCancel}
        onConfirmCancel={handleConfirmCancelOrder}
      />

      <OrderReturnSuccessModal
        showReturnSuccess={showReturnSuccess}
        submittedReturnInfo={submittedReturnInfo}
        onClose={() => setShowReturnSuccess(false)}
      />

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
};

export default OrderHistoryTab;
