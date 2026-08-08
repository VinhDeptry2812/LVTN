import React from 'react';
import { ArrowLeft, Save, FileText, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import UploadProgressWidget from '@/components/UploadProgressWidget';
import { useProductForm } from './hooks/useProductForm';
import { ProductBasicInfoForm } from './components/ProductBasicInfoForm';
import { ProductImageUploader } from './components/ProductImageUploader';
import { ProductAttributeSelector } from './components/ProductAttributeSelector';
import { ProductVariantMatrixTable } from './components/ProductVariantMatrixTable';

export default function ProductCreatePage() {
  const {
    navigate,
    categories,
    collections,
    submitting,
    aiLoading,
    uploadingImage,
    uploadProgress,
    descTab,
    setDescTab,
    skuManuallyEdited,
    isFileDragOver,
    draggedImageIndex,
    showAddAttr,
    setShowAddAttr,
    newAttrKey,
    setNewAttrKey,
    form,
    setForm,
    specs,
    productImages,
    variants,
    variantAttrKeys,
    selectedCollectionIds,
    simpleStock,
    setSimpleStock,
    simpleImportPrice,
    setSimpleImportPrice,
    hasDraft,
    draftSavedAt,
    validationErrors,
    validateField,
    handleResetAutoSku,
    handleChange,
    handleRestoreDraft,
    handleDiscardDraft,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleImagesUpload,
    handleFileDragOver,
    handleFileDragLeave,
    handleFileDrop,
    setPrimaryImage,
    setHoverImage,
    removeImage,
    handleImageVariantMultiSelect,
    handleSelectImageFromLibraryForVariant,
    addSpec,
    removeSpec,
    handleSpecChange,
    handleAddAttr,
    removeVariantAttrKey,
    addVariant,
    duplicateVariant,
    removeVariant,
    handleAutoSyncAllVariantSkus,
    handleAutoSyncVariantSku,
    handleVariantFieldChange,
    handleVariantImageUpload,
    removeVariantImage,
    handleVariantAttrChange,
    handleCollectionToggle,
    handleAiGenerate,
    handleSubmit,
  } = useProductForm();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="p-2 border border-slate-300 hover:bg-slate-100 rounded-none transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Thêm sản phẩm mới</h1>
            <p className="text-xs text-slate-500">
              Nhập thông tin sản phẩm, cấu hình biến thể và hình ảnh để hiển thị trên cửa hàng.
            </p>
          </div>
        </div>

        {draftSavedAt && (
          <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-3 py-1.5 border border-slate-200">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Đã tự động lưu nháp lúc {draftSavedAt}</span>
          </div>
        )}
      </div>

      {/* Thông báo bản nháp nếu tìm thấy bản nháp cũ trong localStorage */}
      {hasDraft && (
        <div className="bg-amber-50 border border-amber-200 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Phát hiện dữ liệu bản nháp chưa hoàn tất!</h4>
              <p className="text-xs text-amber-700">
                Hệ thống tìm thấy thông tin sản phẩm dở dang từ phiên làm việc trước. Bạn có muốn khôi phục không?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-none flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} /> Khôi phục bản nháp
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold rounded-none transition-colors cursor-pointer"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress Widget */}
      {uploadProgress && <UploadProgressWidget progress={uploadProgress} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Component 1: Basic Info, Tiptap Description, Specs */}
        <ProductBasicInfoForm
          form={form}
          validationErrors={validationErrors}
          skuManuallyEdited={skuManuallyEdited}
          categories={categories}
          collections={collections}
          selectedCollectionIds={selectedCollectionIds}
          specs={specs}
          descTab={descTab}
          aiLoading={aiLoading}
          setDescTab={setDescTab}
          handleChange={handleChange}
          setForm={setForm}
          validateField={validateField}
          handleResetAutoSku={handleResetAutoSku}
          handleCollectionToggle={handleCollectionToggle}
          handleAiGenerate={handleAiGenerate}
          addSpec={addSpec}
          removeSpec={removeSpec}
          handleSpecChange={handleSpecChange}
        />

        {/* Component 2: Product Image Uploader */}
        <ProductImageUploader
          productImages={productImages}
          variants={variants}
          uploadingImage={uploadingImage}
          isFileDragOver={isFileDragOver}
          draggedImageIndex={draggedImageIndex}
          handleImagesUpload={handleImagesUpload}
          handleFileDragOver={handleFileDragOver}
          handleFileDragLeave={handleFileDragLeave}
          handleFileDrop={handleFileDrop}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          setPrimaryImage={setPrimaryImage}
          setHoverImage={setHoverImage}
          removeImage={removeImage}
          handleImageVariantMultiSelect={handleImageVariantMultiSelect}
        />

        {/* Component 3: Attribute Manager */}
        <ProductAttributeSelector
          variantAttrKeys={variantAttrKeys}
          showAddAttr={showAddAttr}
          newAttrKey={newAttrKey}
          setShowAddAttr={setShowAddAttr}
          setNewAttrKey={setNewAttrKey}
          handleAddAttr={handleAddAttr}
          removeVariantAttrKey={removeVariantAttrKey}
        />

        {/* Component 4: Variant Matrix Table */}
        <ProductVariantMatrixTable
          variants={variants}
          variantAttrKeys={variantAttrKeys}
          productImages={productImages}
          simpleStock={simpleStock}
          simpleImportPrice={simpleImportPrice}
          setSimpleStock={setSimpleStock}
          setSimpleImportPrice={setSimpleImportPrice}
          addVariant={addVariant}
          duplicateVariant={duplicateVariant}
          removeVariant={removeVariant}
          handleAutoSyncAllVariantSkus={handleAutoSyncAllVariantSkus}
          handleAutoSyncVariantSku={handleAutoSyncVariantSku}
          handleVariantFieldChange={handleVariantFieldChange}
          handleVariantImageUpload={handleVariantImageUpload}
          removeVariantImage={removeVariantImage}
          handleVariantAttrChange={handleVariantAttrChange}
          handleSelectImageFromLibraryForVariant={handleSelectImageFromLibraryForVariant}
        />

        {/* Sticky Action Footer Bar */}
        <div className="sticky bottom-0 -mx-6 -mb-6 md:-mx-8 md:-mb-8 mt-8 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 md:px-8 shadow-2xl z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save size={16} />
              {submitting ? 'Đang lưu sản phẩm...' : 'Tạo sản phẩm'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
