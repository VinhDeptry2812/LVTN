import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { UploadProgress } from '@/components/UploadProgressWidget';
import {
  type SpecRow,
  type VariantInput,
  type ProductImageInput,
  type Category,
  DEFAULT_SPECS,
  flattenCategories,
  compressImage,
} from '../types';

export function useProductForm() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  // Inline UI add variant attribute state
  const [showAddAttr, setShowAddAttr] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');

  const [form, setForm] = useState({
    sku: '',
    name: '',
    slug: '',
    description: '',
    base_price: '',
    discount_price: '',
    category_id: '',
    is_active: true,
    is_bulky: false,
  });

  const [specs, setSpecs] = useState<SpecRow[]>([...DEFAULT_SPECS]);
  const [productImages, setProductImages] = useState<ProductImageInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [variantAttrKeys, setVariantAttrKeys] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [simpleStock, setSimpleStock] = useState<string>('0');
  const [simpleImportPrice, setSimpleImportPrice] = useState<string>('0');

  const [hasDraft, setHasDraft] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Inline validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate field on blur
  const validateField = useCallback((fieldName: string, value: string) => {
    setValidationErrors((prev) => {
      const next = { ...prev };
      switch (fieldName) {
        case 'name':
          if (!value.trim()) next.name = 'Tên sản phẩm không được để trống';
          else delete next.name;
          break;
        case 'sku':
          if (!value.trim()) next.sku = 'Mã SKU không được để trống';
          else delete next.sku;
          break;
        case 'category_id':
          if (!value) next.category_id = 'Vui lòng chọn danh mục';
          else delete next.category_id;
          break;
        case 'base_price':
          if (!value || Number(value) <= 0) next.base_price = 'Giá bán niêm yết phải lớn hơn 0';
          else delete next.base_price;
          break;
      }
      return next;
    });
  }, []);

  // Fetch initial data
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(flattenCategories(res.data)));
    api.get('/collections').then((res) => setCollections(res.data));
  }, []);

  // Check draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('product_create_draft');
    if (savedDraft) {
      setHasDraft(true);
    }
    setDraftChecked(true);
  }, []);

  // Auto-save draft to LocalStorage
  useEffect(() => {
    if (!draftChecked || hasDraft) return;

    const isDirty =
      form.name.trim() !== '' ||
      form.sku.trim() !== '' ||
      (form.description && form.description.trim() !== '' && form.description !== '<p><br></p>') ||
      specs.some((s) => s.value.trim() !== '') ||
      variants.length > 0;

    if (isDirty) {
      const draftData = {
        form,
        specs,
        variants: variants.map((v) => ({
          sku: v.sku,
          attributes: v.attributes,
          stock: v.stock,
          import_price: v.import_price,
          price_adjustment: v.price_adjustment,
        })),
        variantAttrKeys,
        selectedCollectionIds,
        simpleStock,
        simpleImportPrice,
        skuManuallyEdited,
      };
      localStorage.setItem('product_create_draft', JSON.stringify(draftData));
      setDraftSavedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } else {
      localStorage.removeItem('product_create_draft');
    }
  }, [form, specs, variants, variantAttrKeys, selectedCollectionIds, simpleStock, simpleImportPrice, skuManuallyEdited, draftChecked, hasDraft]);

  // Warn before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty =
        form.name.trim() !== '' ||
        form.sku.trim() !== '' ||
        (form.description && form.description.trim() !== '' && form.description !== '<p><br></p>') ||
        specs.some((s) => s.value.trim() !== '') ||
        variants.length > 0;

      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, specs, variants]);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

  // Auto SKU generator effect
  useEffect(() => {
    if (!skuManuallyEdited && form.category_id && form.name) {
      const selectedCategory = categories.find((c) => c.id === Number(form.category_id));
      if (selectedCategory) {
        const getPrefix = (str: string) =>
          str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .map((word) => word.charAt(0))
            .join('')
            .toUpperCase();
        const catPrefix = getPrefix(selectedCategory.name);
        const prodPrefix = getPrefix(form.name);
        if (catPrefix && prodPrefix) {
          setForm((prev) => ({
            ...prev,
            sku: `${catPrefix}-${prodPrefix}`,
          }));
        }
      }
    }
  }, [form.name, form.category_id, categories, skuManuallyEdited]);

  const handleResetAutoSku = () => {
    setSkuManuallyEdited(false);
    if (form.category_id && form.name) {
      const selectedCategory = categories.find((c) => c.id === Number(form.category_id));
      if (selectedCategory) {
        const getPrefix = (str: string) =>
          str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .map((word) => word.charAt(0))
            .join('')
            .toUpperCase();
        const catPrefix = getPrefix(selectedCategory.name);
        const prodPrefix = getPrefix(form.name);
        if (catPrefix && prodPrefix) {
          setForm((prev) => ({
            ...prev,
            sku: `${catPrefix}-${prodPrefix}`,
          }));
          toast.success('Đã khôi phục tự động sinh mã SKU');
          return;
        }
      }
    }
    toast.success('Đã bật lại tự động sinh mã SKU. Hãy nhập Tên và chọn Danh mục sản phẩm.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'sku') {
      if (!value.trim()) {
        setSkuManuallyEdited(false);
      } else {
        setSkuManuallyEdited(true);
      }
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
    }));
  };

  const handleRestoreDraft = () => {
    const savedDraft = localStorage.getItem('product_create_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.form) setForm(draft.form);
        if (draft.specs) setSpecs(draft.specs);
        if (draft.variants) setVariants(draft.variants);
        if (draft.variantAttrKeys) setVariantAttrKeys(draft.variantAttrKeys);
        if (draft.selectedCollectionIds) setSelectedCollectionIds(draft.selectedCollectionIds);
        if (draft.simpleStock) setSimpleStock(draft.simpleStock);
        if (draft.skuManuallyEdited) setSkuManuallyEdited(draft.skuManuallyEdited);
        toast.success('Đã khôi phục dữ liệu bản nháp thành công!');
      } catch (err) {
        console.error('Không thể khôi phục bản nháp', err);
        toast.error('Lỗi khi khôi phục bản nháp');
      }
    }
    setHasDraft(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('product_create_draft');
    setHasDraft(false);
    toast.success('Đã xóa bản nháp');
  };

  // Drag & drop images logic
  const handleDragStart = (idx: number) => setDraggedImageIndex(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (draggedImageIndex === null || draggedImageIndex === targetIdx) return;
    setProductImages((prev) => {
      const newArr = [...prev];
      const [draggedItem] = newArr.splice(draggedImageIndex, 1);
      newArr.splice(targetIdx, 0, draggedItem);
      return newArr;
    });
    setDraggedImageIndex(null);
  };

  // Image uploads
  const processAndAddImages = async (files: FileList) => {
    setUploadingImage(true);
    const newImages: ProductImageInput[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast.error(`Tệp ${file.name} không phải là định dạng hình ảnh hợp lệ.`);
        continue;
      }
      try {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        const isPrimary = productImages.length === 0 && newImages.length === 0;
        newImages.push({
          image_url: previewUrl,
          is_primary: isPrimary,
          is_hover: false,
          file: compressed,
          is_local: true,
        });
      } catch {
        toast.error(`Xử lý ảnh ${file.name} thất bại`);
      }
    }

    if (newImages.length > 0) {
      setProductImages((prev) => {
        const updated = [...prev, ...newImages];
        const hasPrimary = updated.some((img) => img.is_primary);
        if (!hasPrimary && updated.length > 0) {
          updated[0].is_primary = true;
        }
        return updated;
      });
      toast.success(`Đã nhận thành công ${newImages.length} ảnh!`);
    }
    setUploadingImage(false);
  };

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processAndAddImages(e.target.files);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragOver(true);
  };

  const handleFileDragLeave = () => {
    setIsFileDragOver(false);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragOver(false);
    if (e.dataTransfer.files) {
      await processAndAddImages(e.dataTransfer.files);
    }
  };

  const setPrimaryImage = (index: number) => {
    setProductImages((prev) =>
      prev.map((img, idx) => ({ ...img, is_primary: idx === index }))
    );
  };

  const setHoverImage = (index: number) => {
    setProductImages((prev) =>
      prev.map((img, idx) => ({ ...img, is_hover: idx === index }))
    );
  };

  const removeImage = (index: number) => {
    setProductImages((prev) => {
      const target = prev[index];
      if (target.is_local && target.image_url.startsWith('blob:')) {
        URL.revokeObjectURL(target.image_url);
      }
      const updated = prev.filter((_, idx) => idx !== index);
      const wasPrimary = prev[index]?.is_primary;
      if (wasPrimary && updated.length > 0) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  const handleImageVariantMultiSelect = (imgIndex: number, newIndices: number[]) => {
    setProductImages((prev) => {
      const updated = [...prev];
      updated[imgIndex] = {
        ...updated[imgIndex],
        variant_indices: newIndices,
        variant_index: newIndices.length > 0 ? newIndices[0] : undefined,
      };
      return updated;
    });
  };

  const handleSelectImageFromLibraryForVariant = (vIdx: number, url: string, file?: File) => {
    setVariants((prev) => {
      const u = [...prev];
      u[vIdx] = { ...u[vIdx], image_url: url, preview_url: url, local_file: file };
      return u;
    });
    setProductImages((prev) =>
      prev.map((img) => {
        if (img.image_url === url || (img.file && URL.createObjectURL(img.file) === url)) {
          const currentIndices = img.variant_indices || (img.variant_index !== undefined ? [img.variant_index] : []);
          if (!currentIndices.includes(vIdx)) {
            const nextIndices = [...currentIndices, vIdx];
            return {
              ...img,
              variant_indices: nextIndices,
              variant_index: nextIndices[0],
            };
          }
        }
        return img;
      })
    );
    toast.success(`Đã liên kết ảnh thư viện với biến thể #${vIdx + 1}`);
  };

  // Specs logic
  const addSpec = () => setSpecs((prev) => [...prev, { key: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs((prev) => prev.filter((_, idx) => idx !== i));
  const handleSpecChange = (i: number, field: 'key' | 'value', val: string) => {
    setSpecs((prev) => {
      const u = [...prev];
      u[i] = { ...u[i], [field]: val };
      return u;
    });
  };

  // Variant Attr keys logic
  const handleAddAttr = () => {
    const name = newAttrKey.trim();
    if (!name) return;
    if (variantAttrKeys.includes(name)) {
      toast.error('Thuộc tính này đã tồn tại!');
      return;
    }
    setVariantAttrKeys((prev) => [...prev, name]);
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        attributes: { ...v.attributes, [name]: '' },
      }))
    );
    setNewAttrKey('');
    setShowAddAttr(false);
    toast.success(`Đã thêm thuộc tính "${name}"`);
  };

  const removeVariantAttrKey = (key: string) => {
    setVariantAttrKeys((prev) => prev.filter((k) => k !== key));
    setVariants((prev) =>
      prev.map((v) => {
        const attrs = { ...v.attributes };
        delete attrs[key];
        return { ...v, attributes: attrs };
      })
    );
  };

  // Generate Variant SKU
  const generateVariantSku = (mainSku: string, attributes: Record<string, string>, index: number, attrKeys: string[]) => {
    const cleanVal = (val: string) => {
      if (!val) return '';
      const textOnly = val.includes('|') ? val.split('|')[0] : val;
      return textOnly
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
    };

    let basePrefix = mainSku ? mainSku.toUpperCase() : '';
    if (!basePrefix && form.category_id && form.name) {
      const selectedCategory = categories.find((c) => c.id === Number(form.category_id));
      if (selectedCategory) {
        const getPrefix = (str: string) =>
          str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .map((w) => w.charAt(0))
            .join('')
            .toUpperCase();
        const catPrefix = getPrefix(selectedCategory.name);
        const prodPrefix = getPrefix(form.name);
        if (catPrefix && prodPrefix) {
          basePrefix = `${catPrefix}-${prodPrefix}`;
        }
      }
    }
    if (!basePrefix) basePrefix = 'SKU';

    const suffix = attrKeys
      .map((k) => cleanVal(attributes[k] || ''))
      .filter(Boolean)
      .join('-');
    return suffix ? `${basePrefix}-${suffix}` : `${basePrefix}-V${index + 1}`;
  };

  const addVariant = () => {
    const attrs: Record<string, string> = {};
    variantAttrKeys.forEach((k) => (attrs[k] = ''));
    const newIndex = variants.length;
    const autoSku = generateVariantSku(form.sku, attrs, newIndex, variantAttrKeys);
    setVariants((prev) => [
      ...prev,
      {
        sku: autoSku,
        attributes: attrs,
        stock: '0',
        import_price: '0',
        price_adjustment: '',
        image_url: '',
        preview_url: '',
      },
    ]);
  };

  const handleAutoSyncAllVariantSkus = () => {
    if (variants.length === 0) return;
    setVariants((prev) =>
      prev.map((v, idx) => ({
        ...v,
        sku: generateVariantSku(form.sku, v.attributes, idx, variantAttrKeys),
      }))
    );
    toast.success('Đã tự động tạo lại mã SKU cho tất cả biến thể');
  };

  const handleAutoSyncVariantSku = (index: number) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        sku: generateVariantSku(form.sku, updated[index].attributes, index, variantAttrKeys),
      };
      return updated;
    });
    toast.success(`Đã cập nhật SKU biến thể #${index + 1}`);
  };

  const removeVariant = (index: number) => setVariants((prev) => prev.filter((_, i) => i !== index));

  const duplicateVariant = (index: number) => {
    setVariants((prev) => {
      const source = prev[index];
      const duplicated: VariantInput = {
        sku: source.sku ? `${source.sku}-copy` : generateVariantSku(form.sku, source.attributes, prev.length, variantAttrKeys),
        attributes: { ...source.attributes },
        stock: source.stock,
        import_price: source.import_price,
        price_adjustment: source.price_adjustment,
        image_url: source.image_url,
        local_file: source.local_file,
        preview_url: source.preview_url,
      };
      const newVariants = [...prev];
      newVariants.splice(index + 1, 0, duplicated);
      return newVariants;
    });
    toast.success(`Đã nhân bản biến thể #${index + 1}`);
  };

  const handleVariantFieldChange = (index: number, field: 'sku' | 'stock' | 'import_price' | 'price_adjustment', value: string) => {
    setVariants((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: value };
      return u;
    });
  };

  const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setVariants((prev) => {
        const updated = [...prev];
        if (updated[index].preview_url && updated[index].preview_url?.startsWith('blob:')) {
          URL.revokeObjectURL(updated[index].preview_url!);
        }
        updated[index] = { ...updated[index], local_file: compressed, preview_url: previewUrl, image_url: '' };
        return updated;
      });
      toast.success('Đã tải ảnh biến thể!');
    } catch {
      toast.error('Xử lý ảnh biến thể thất bại');
    }
  };

  const removeVariantImage = (index: number) => {
    setVariants((prev) => {
      const updated = [...prev];
      if (updated[index].preview_url && updated[index].preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(updated[index].preview_url!);
      }
      updated[index] = { ...updated[index], image_url: '', local_file: undefined, preview_url: '' };
      return updated;
    });
  };

  const handleVariantAttrChange = (index: number, attrKey: string, value: string) => {
    setVariants((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], attributes: { ...u[index].attributes, [attrKey]: value } };

      const cleanVal = (val: string) =>
        val
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase();

      const suffix = variantAttrKeys
        .map((k) => cleanVal(u[index].attributes[k] || ''))
        .filter(Boolean)
        .join('-');
      if (form.sku) {
        u[index].sku = suffix ? `${form.sku.toUpperCase()}-${suffix}` : form.sku.toUpperCase();
      }
      return u;
    });
  };

  const handleCollectionToggle = (id: number) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(id) ? prev.filter((colId) => colId !== id) : [...prev, id]
    );
  };

  const handleAiGenerate = async () => {
    if (!form.name) {
      toast.error('Vui lòng nhập tên sản phẩm trước!');
      return;
    }
    setAiLoading(true);
    try {
      const categoryName = categories.find((c) => c.id === Number(form.category_id))?.name || 'Nội thất';
      const attributes = specs
        .filter((s) => s.key && s.value)
        .map((s) => `${s.key}: ${s.value}`)
        .join(', ');
      const res = await api.post('/ai/generate-product-description', {
        name: form.name,
        category: categoryName,
        attributes: attributes || 'Sản phẩm nội thất cao cấp',
      });
      setForm((prev) => ({ ...prev, description: res.data.data }));
      toast.success('AI đã sinh mô tả thành công!');
    } catch (error: any) {
      console.error('Lỗi khi sinh mô tả bằng AI:', error);
      const serverMessage = error.response?.data?.message || error.message;
      toast.error(serverMessage ? `Lỗi: ${serverMessage}` : 'Không thể sinh mô tả lúc này');
    } finally {
      setAiLoading(false);
    }
  };

  const processDescriptionImages = async (html: string): Promise<string> => {
    if (!html.includes('data:image/')) return html;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = img.getAttribute('src');
      if (src && src.startsWith('data:image/')) {
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          const file = new File([blob], `desc-img-${Date.now()}-${i}.png`, { type: blob.type });

          const compressed = await compressImage(file);
          const formData = new FormData();
          formData.append('file', compressed);

          const uploadRes = await api.post('/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          img.setAttribute('src', uploadRes.data.url);
        } catch (error) {
          console.error('Error processing description image:', error);
        }
      }
    }
    return doc.body.innerHTML;
  };

  const validateForm = () => {
    if (!form.sku.trim()) {
      toast.error('Vui lòng nhập mã SKU sản phẩm.');
      return false;
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(form.sku.trim())) {
      toast.error('Mã SKU chỉ được chứa ký tự chữ, số, dấu gạch ngang (-) và gạch dưới (_).');
      return false;
    }
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm.');
      return false;
    }
    if (!form.category_id) {
      toast.error('Vui lòng chọn danh mục sản phẩm.');
      return false;
    }
    if (!form.base_price || Number(form.base_price) <= 0) {
      toast.error('Vui lòng nhập giá bán niêm yết hợp lệ (> 0).');
      return false;
    }
    if (productImages.length === 0) {
      toast.error('Vui lòng tải lên ít nhất 1 hình ảnh sản phẩm.');
      return false;
    }

    // Validate biến thể
    const variantSkus = new Set<string>();
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku.trim()) {
        toast.error(`Biến thể #${i + 1} chưa có mã SKU.`);
        return false;
      }
      if (!/^[a-zA-Z0-9-_]+$/.test(v.sku.trim())) {
        toast.error(`SKU của biến thể #${i + 1} không hợp lệ (chỉ chứa chữ, số, - và _).`);
        return false;
      }
      if (variantSkus.has(v.sku.trim())) {
        toast.error(`Mã SKU "${v.sku.trim()}" bị trùng lặp giữa các biến thể.`);
        return false;
      }
      variantSkus.add(v.sku.trim());

      for (const key of variantAttrKeys) {
        if (!v.attributes[key]?.trim()) {
          toast.error(`Vui lòng nhập giá trị thuộc tính "${key}" cho biến thể #${i + 1}.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const localProductImages = productImages.filter((img) => img.is_local && img.file);
      const localVariantImages = variants.filter((v) => v.local_file);
      const totalToUpload = localProductImages.length + localVariantImages.length;
      let completedUploads = 0;
      let failedUploads = 0;

      if (totalToUpload > 0) {
        setUploadProgress({ total: totalToUpload, completed: 0, failed: 0, percent: 0 });
      }

      const incrementProgress = (fileName?: string, isSuccess = true) => {
        if (totalToUpload <= 0) return;
        completedUploads++;
        if (!isSuccess) failedUploads++;
        const percent = Math.round((completedUploads / totalToUpload) * 100);
        setUploadProgress({
          total: totalToUpload,
          completed: completedUploads,
          failed: failedUploads,
          percent,
          currentFileName: fileName,
          isError: failedUploads > 0,
        });
      };

      const processedDescription = await processDescriptionImages(form.description);

      // 1. Upload ảnh chính sản phẩm song song
      const uploadedProductImages = await Promise.all(
        productImages.map(async (img) => {
          let url = img.image_url;
          if (img.is_local && img.file) {
            try {
              const formData = new FormData();
              formData.append('file', img.file);
              const res = await api.post('/upload/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              incrementProgress(img.file.name, true);
              url = res.data.url;
            } catch (err) {
              console.error(`Lỗi khi tải ảnh ${img.file.name}:`, err);
              incrementProgress(img.file.name, false);
              url = '';
            }
          }
          const indices = img.variant_indices || (img.variant_index !== undefined ? [img.variant_index] : []);
          return {
            image_url: url,
            is_primary: img.is_primary,
            is_hover: img.is_hover,
            variant_indices: indices,
          };
        })
      );

      // Phẳng hóa danh sách ảnh theo từng variant_index được chọn
      const validProductImages: any[] = [];
      uploadedProductImages.forEach((img) => {
        if (!img.image_url) return;
        const indices = img.variant_indices || [];
        if (indices.length > 0) {
          indices.forEach((vIdx: number) => {
            validProductImages.push({
              image_url: img.image_url,
              is_primary: img.is_primary ?? false,
              is_hover: img.is_hover ?? false,
              variant_index: vIdx,
            });
          });
        } else {
          validProductImages.push({
            image_url: img.image_url,
            is_primary: img.is_primary ?? false,
            is_hover: img.is_hover ?? false,
          });
        }
      });

      if (failedUploads > 0) {
        throw new Error(`Có ${failedUploads} ảnh tải lên thất bại. Vui lòng kiểm tra lại.`);
      }

      // 2. Upload ảnh của biến thể song song
      let uploadedVariants = [];
      if (variants.length === 0) {
        uploadedVariants = [
          {
            sku: form.sku.trim().toUpperCase(),
            attributes: {},
            stock: Number(simpleStock) || 0,
            import_price: Number(simpleImportPrice) || 0,
            price_adjustment: 0,
            image_url: null,
          },
        ];
      } else {
        uploadedVariants = await Promise.all(
          variants.map(async (v) => {
            let imageUrl = v.image_url;
            if (v.local_file) {
              try {
                const formData = new FormData();
                formData.append('file', v.local_file);
                const res = await api.post('/upload/image', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
                incrementProgress(v.local_file.name, true);
                imageUrl = res.data.url;
              } catch (err) {
                console.error(`Lỗi khi tải ảnh biến thể ${v.local_file.name}:`, err);
                incrementProgress(v.local_file.name, false);
              }
            }
            return {
              sku: v.sku || null,
              attributes: Object.fromEntries(Object.entries(v.attributes).filter(([, val]) => val.trim())),
              stock: Number(v.stock) || 0,
              import_price: Number(v.import_price) || 0,
              price_adjustment: Number(v.price_adjustment) || 0,
              image_url: imageUrl || null,
            };
          })
        );
      }

      const validSpecs = specs
        .filter((s) => s.key.trim() && s.value.trim())
        .map((s) => ({ key: s.key.trim(), value: s.value.trim() }));

      const payload: Record<string, unknown> = {
        sku: form.sku,
        name: form.name,
        slug: form.slug,
        description: processedDescription,
        base_price: Number(form.base_price) || 0,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        is_active: form.is_active,
        is_bulky: form.is_bulky,
        category_id: Number(form.category_id),
        detail: {
          specifications: validSpecs.length > 0 ? validSpecs : null,
        },
        variants: uploadedVariants,
        images: validProductImages,
        collection_ids: selectedCollectionIds,
      };

      await api.post('/products', payload);
      toast.success('Thêm sản phẩm thành công!');
      localStorage.removeItem('product_create_draft');
      navigate('/admin/products');
    } catch (error: any) {
      console.error(error);
      const serverMsg = error.response?.data?.message;
      const errorMsg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || error.message || 'Thêm sản phẩm thất bại (Lỗi tải ảnh hoặc lưu thông tin)';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        setUploadProgress(null);
      }, 2500);
    }
  };

  return {
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
  };
}
