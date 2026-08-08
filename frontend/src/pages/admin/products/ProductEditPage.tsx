import React from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import UploadProgressWidget from '@/components/UploadProgressWidget';
import { useProductEditForm } from './hooks/useProductEditForm';
import { ProductBasicInfoForm } from './components/ProductBasicInfoForm';
import { ProductImageUploader } from './components/ProductImageUploader';
import { ProductAttributeSelector } from './components/ProductAttributeSelector';
import { ProductVariantMatrixTable } from './components/ProductVariantMatrixTable';

export default function ProductEditPage() {
  const {
    navigate,
    categories,
    collections,
    selectedCollectionIds,
    submitting,
    aiLoading,
    uploadingImage,
    uploadProgress,
    loading,
    form,
    specs,
    productImages,
    variants,
    variantAttrKeys,
    simpleStock,
    setSimpleStock,
    simpleImportPrice,
    setSimpleImportPrice,
    descTab,
    draggedImageIndex,
    isFileDragOver,
    showAddAttr,
    setShowAddAttr,
    newAttrKey,
    setNewAttrKey,
    validationErrors,
    skuManuallyEdited,
    setDescTab,
    handleChange,
    setForm,
    validateField,
    handleResetAutoSku,
    handleCollectionToggle,
    addSpec,
    removeSpec,
    handleSpecChange,
    handleAddAttr,
    removeVariantAttrKey,
    addVariant,
    removeVariant,
    duplicateVariant,
    handleVariantAttrChange,
    handleVariantFieldChange,
    handleAutoSyncVariantSku,
    handleAutoSyncAllVariantSkus,
    handleVariantImageUpload,
    removeVariantImage,
    handleSelectImageFromLibraryForVariant,
    handleImagesUpload,
    handleFileDragOver,
    handleFileDragLeave,
    handleFileDrop,
    setPrimaryImage,
    setHoverImage,
    removeImage,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleImageVariantMultiSelect,
    handleAiGenerate,
    handleSubmit,
  } = useProductEditForm();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-slate-900">
              Chỉnh sửa sản phẩm: {form.name || '...'}
            </h1>
            <p className="text-xs text-slate-500">
              Cập nhật thông tin chi tiết, giá bán, danh mục và quản lý ma trận biến thể của sản phẩm.
            </p>
          </div>
        </div>
      </div>

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
          removeVariant={removeVariant}
          duplicateVariant={duplicateVariant}
          handleAutoSyncAllVariantSkus={handleAutoSyncAllVariantSkus}
          handleAutoSyncVariantSku={handleAutoSyncVariantSku}
          handleVariantFieldChange={handleVariantFieldChange}
          handleVariantImageUpload={handleVariantImageUpload}
          removeVariantImage={removeVariantImage}
          handleVariantAttrChange={handleVariantAttrChange}
          handleSelectImageFromLibraryForVariant={handleSelectImageFromLibraryForVariant}
        />

        {/* Sticky Action Footer Bar */}
        <div className="sticky bottom-0 -mx-6 -mb-6 md:-mx-8 md:-mb-8 mt-8 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 shadow-xl z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-none transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-none flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Đang lưu thay đổi...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Lưu thay đổi sản phẩm</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
