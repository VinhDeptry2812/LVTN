import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Upload, Sparkles, ArrowLeft, Loader2, Plus, Trash2, Star, Eye, Copy, FileText, Settings, Palette, Rocket, Banknote, Tags, ImageIcon, Save, AlertCircle } from 'lucide-react';
import TiptapEditor from '@/components/TiptapEditor';

interface SpecRow { key: string; value: string; }

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1800;
        const MAX_HEIGHT = 1800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

interface VariantInput {
  sku: string;
  attributes: Record<string, string>;
  stock: number | string;
  price_adjustment: number | string;
  image_url?: string;
  local_file?: File;
  preview_url?: string;
}

interface Category {
  id: number;
  name: string;
  children?: Category[];
  level?: number;
}

const flattenCategories = (nodes: Category[], level = 0): Category[] => {
  const result: Category[] = [];
  for (const node of nodes) {
    result.push({ ...node, level });
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategories(node.children, level + 1));
    }
  }
  return result;
};

const DEFAULT_SPECS: SpecRow[] = [
  { key: 'Kích thước', value: '' },
  { key: 'Chất liệu', value: '' },
  { key: 'Cân nặng', value: '' },
  { key: 'Bảo hành', value: '' },
];

const PRESET_COLORS = [
  { name: 'Trắng', hex: '#ffffff' },
  { name: 'Đen', hex: '#000000' },
  { name: 'Nâu Gỗ', hex: '#8b4513' },
  { name: 'Nâu Nhạt', hex: '#d2b48c' },
  { name: 'Xám', hex: '#808080' },
  { name: 'Xám Nhạt', hex: '#d3d3d3' },
  { name: 'Be', hex: '#f5f5dc' },
  { name: 'Kem', hex: '#fffdd0' },
  { name: 'Xanh Navy', hex: '#000080' },
  { name: 'Xanh Lá', hex: '#2e8b57' },
  { name: 'Đỏ Đô', hex: '#800000' },
];

export default function ProductCreatePage() {
  interface ProductImageInput {
    image_url: string;
    is_primary: boolean;
    is_hover: boolean;
    file?: File;
    is_local?: boolean;
    variant_index?: number;
  }

  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  // Inline UI add variant attribute state
  const [showAddAttr, setShowAddAttr] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');

  const [form, setForm] = useState({
    sku: '', name: '', slug: '', description: '',
    base_price: '', discount_price: '', category_id: '', is_active: true, is_bulky: false,
  });

  const [specs, setSpecs] = useState<SpecRow[]>([...DEFAULT_SPECS]);
  const [productImages, setProductImages] = useState<ProductImageInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [variantAttrKeys, setVariantAttrKeys] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [simpleStock, setSimpleStock] = useState<string>('0');

  const [hasDraft, setHasDraft] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);

  // Auto-save indicator state
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Inline validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate field on blur
  const validateField = useCallback((fieldName: string, value: string) => {
    setValidationErrors(prev => {
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
        case 'base_price':
          if (!value.trim() || Number(value) <= 0) next.base_price = 'Giá bán gốc phải lớn hơn 0';
          else delete next.base_price;
          break;
        case 'discount_price':
          if (value && Number(value) >= Number(form.base_price) && Number(form.base_price) > 0) {
            next.discount_price = 'Giá khuyến mãi phải nhỏ hơn giá gốc';
          } else {
            delete next.discount_price;
          }
          break;
        case 'category_id':
          if (!value) next.category_id = 'Vui lòng chọn danh mục';
          else delete next.category_id;
          break;
      }
      return next;
    });
  }, [form.base_price]);

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
      form.base_price.trim() !== '' ||
      specs.some(s => s.value.trim() !== '') ||
      variants.length > 0;

    if (isDirty) {
      const draftData = {
        form,
        specs,
        variants: variants.map(v => ({
          sku: v.sku,
          attributes: v.attributes,
          stock: v.stock,
          price_adjustment: v.price_adjustment
        })),
        variantAttrKeys,
        selectedCollectionIds,
        simpleStock,
        skuManuallyEdited
      };
      localStorage.setItem('product_create_draft', JSON.stringify(draftData));
      setDraftSavedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } else {
      localStorage.removeItem('product_create_draft');
    }
  }, [form, specs, variants, variantAttrKeys, selectedCollectionIds, simpleStock, skuManuallyEdited, draftChecked, hasDraft]);

  // Warn before reload/unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty =
        form.name.trim() !== '' ||
        form.sku.trim() !== '' ||
        (form.description && form.description.trim() !== '' && form.description !== '<p><br></p>') ||
        form.base_price.trim() !== '' ||
        specs.some(s => s.value.trim() !== '') ||
        variants.length > 0;

      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, specs, variants]);

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

  const handleDragStart = (idx: number) => setDraggedImageIndex(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (draggedImageIndex === null || draggedImageIndex === targetIdx) return;
    setProductImages(prev => {
      const newArr = [...prev];
      const [draggedItem] = newArr.splice(draggedImageIndex, 1);
      newArr.splice(targetIdx, 0, draggedItem);
      return newArr;
    });
    setDraggedImageIndex(null);
  };

  const addSpec = () => setSpecs(prev => [...prev, { key: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs(prev => prev.filter((_, idx) => idx !== i));
  const handleSpecChange = (i: number, field: 'key' | 'value', val: string) => {
    setSpecs(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: val }; return u; });
  };

  const handleAddAttr = () => {
    const name = newAttrKey.trim();
    if (!name) return;
    if (variantAttrKeys.includes(name)) {
      toast.error('Thuộc tính này đã tồn tại!');
      return;
    }
    setVariantAttrKeys(prev => [...prev, name]);
    setVariants(prev => prev.map(v => ({
      ...v, attributes: { ...v.attributes, [name]: '' }
    })));
    setNewAttrKey('');
    setShowAddAttr(false);
    toast.success(`Đã thêm thuộc tính "${name}"`);
  };

  const removeVariantAttrKey = (key: string) => {
    setVariantAttrKeys(prev => prev.filter(k => k !== key));
    setVariants(prev => prev.map(v => {
      const attrs = { ...v.attributes };
      delete attrs[key];
      return { ...v, attributes: attrs };
    }));
  };

  const addVariant = () => {
    const attrs: Record<string, string> = {};
    variantAttrKeys.forEach(k => attrs[k] = '');
    setVariants(prev => [...prev, { sku: '', attributes: attrs, stock: '', price_adjustment: '', image_url: '', preview_url: '' }]);
  };

  const removeVariant = (index: number) => setVariants(prev => prev.filter((_, i) => i !== index));

  const duplicateVariant = (index: number) => {
    setVariants(prev => {
      const source = prev[index];
      const duplicated: VariantInput = {
        sku: source.sku ? `${source.sku}-copy` : '',
        attributes: { ...source.attributes },
        stock: source.stock,
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

  const handleVariantFieldChange = (index: number, field: 'sku' | 'stock' | 'price_adjustment', value: string) => {
    setVariants(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  };

  const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setVariants(prev => {
        const updated = [...prev];
        if (updated[index].preview_url && updated[index].preview_url?.startsWith('blob:')) {
          URL.revokeObjectURL(updated[index].preview_url!);
        }
        updated[index] = { ...updated[index], local_file: compressed, preview_url: previewUrl, image_url: '' };
        return updated;
      });
      toast.success('Đã tải ảnh biến thể!');
    } catch { toast.error('Xử lý ảnh biến thể thất bại'); }
  };

  const removeVariantImage = (index: number) => {
    setVariants(prev => {
      const updated = [...prev];
      if (updated[index].preview_url && updated[index].preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(updated[index].preview_url!);
      }
      updated[index] = { ...updated[index], image_url: '', local_file: undefined, preview_url: '' };
      return updated;
    });
  };

  const handleVariantAttrChange = (index: number, attrKey: string, value: string) => {
    setVariants(prev => {
      const u = [...prev];
      u[index] = { ...u[index], attributes: { ...u[index].attributes, [attrKey]: value } };

      const cleanVal = (val: string) => val.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      const suffix = variantAttrKeys.map(k => cleanVal(u[index].attributes[k] || '')).filter(Boolean).join('-');
      if (form.sku) {
        u[index].sku = suffix ? `${form.sku.toUpperCase()}-${suffix}` : form.sku.toUpperCase();
      }
      return u;
    });
  };

  const handleCollectionToggle = (id: number) => {
    setSelectedCollectionIds(prev => prev.includes(id) ? prev.filter(colId => colId !== id) : [...prev, id]);
  };

  useEffect(() => {
    api.get('/categories').then(res => setCategories(flattenCategories(res.data)));
    api.get('/collections').then(res => setCollections(res.data));
  }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  useEffect(() => {
    if (!skuManuallyEdited && form.category_id && form.name) {
      const selectedCategory = categories.find(c => c.id === Number(form.category_id));
      if (selectedCategory) {
        const getPrefix = (str: string) => {
          return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase();
        };
        const catPrefix = getPrefix(selectedCategory.name);
        const prodPrefix = getPrefix(form.name);
        if (catPrefix && prodPrefix) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setForm(prev => ({
            ...prev,
            sku: `${catPrefix}-${prodPrefix}`
          }));
        }
      }
    }
  }, [form.name, form.category_id, categories, skuManuallyEdited]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'sku') {
      setSkuManuallyEdited(true);
    }
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
    }));
  };

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
      setProductImages(prev => {
        const updated = [...prev, ...newImages];
        const hasPrimary = updated.some(img => img.is_primary);
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
    setProductImages(prev =>
      prev.map((img, idx) => ({ ...img, is_primary: idx === index }))
    );
  };

  const setHoverImage = (index: number) => {
    setProductImages(prev =>
      prev.map((img, idx) => ({ ...img, is_hover: idx === index }))
    );
  };

  const removeImage = (index: number) => {
    setProductImages(prev => {
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

  const handleImageVariantSelect = (imgIndex: number, variantIndexStr: string) => {
    setProductImages(prev => {
      const updated = [...prev];
      if (variantIndexStr === '') {
        updated[imgIndex] = { ...updated[imgIndex], variant_index: undefined };
      } else {
        updated[imgIndex] = { ...updated[imgIndex], variant_index: Number(variantIndexStr) };
      }
      return updated;
    });
  };

  const handleAiGenerate = async () => {
    if (!form.name) { toast.error('Vui lòng nhập tên sản phẩm trước!'); return; }
    setAiLoading(true);
    try {
      const categoryName = categories.find(c => c.id === Number(form.category_id))?.name || 'Nội thất';
      const attributes = specs.filter(s => s.key && s.value).map(s => `${s.key}: ${s.value}`).join(', ');
      const res = await api.post('/ai/generate-product-description', {
        name: form.name,
        category: categoryName,
        attributes: attributes || 'Sản phẩm nội thất cao cấp',
      });
      setForm(prev => ({ ...prev, description: res.data.data }));
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
    const basePrice = Number(form.base_price);
    if (isNaN(basePrice) || basePrice <= 0) {
      toast.error('Giá bán cơ bản phải là số lớn hơn 0.');
      return false;
    }
    if (form.discount_price) {
      const discountPrice = Number(form.discount_price);
      if (isNaN(discountPrice) || discountPrice <= 0) {
        toast.error('Giá khuyến mãi phải là số lớn hơn 0.');
        return false;
      }
      if (discountPrice >= basePrice) {
        toast.error('Giá khuyến mãi phải nhỏ hơn giá cơ bản.');
        return false;
      }
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
      toast.loading('Đang xử lý nén và tải lên hình ảnh...', { id: 'submit-upload' });

      const processedDescription = await processDescriptionImages(form.description);

      // 1. Upload ảnh chính sản phẩm song song
      const uploadedProductImages = await Promise.all(
        productImages.map(async (img) => {
          if (img.is_local && img.file) {
            const formData = new FormData();
            formData.append('file', img.file);
            const res = await api.post('/upload/image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            return {
              image_url: res.data.url,
              is_primary: img.is_primary,
              is_hover: img.is_hover,
              variant_index: img.variant_index,
            };
          }
          return {
            image_url: img.image_url,
            is_primary: img.is_primary,
            is_hover: img.is_hover,
            variant_index: img.variant_index,
          };
        })
      );

      // 2. Upload ảnh của biến thể song song
      let uploadedVariants = [];
      if (variants.length === 0) {
        uploadedVariants = [{
          sku: form.sku.trim().toUpperCase(),
          attributes: {},
          stock: Number(simpleStock) || 0,
          price_adjustment: 0,
          image_url: null
        }];
      } else {
        uploadedVariants = await Promise.all(
          variants.map(async (v) => {
            let imageUrl = v.image_url;
            if (v.local_file) {
              const formData = new FormData();
              formData.append('file', v.local_file);
              const res = await api.post('/upload/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              imageUrl = res.data.url;
            }
            return {
              sku: v.sku || null,
              attributes: Object.fromEntries(Object.entries(v.attributes).filter(([, val]) => val.trim())),
              stock: Number(v.stock) || 0,
              price_adjustment: Number(v.price_adjustment) || 0,
              image_url: imageUrl || null,
            };
          })
        );
      }

      const specsObj: Record<string, string> = {};
      specs.forEach(s => { if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim(); });

      const payload: Record<string, unknown> = {
        sku: form.sku, name: form.name, slug: form.slug, description: processedDescription,
        base_price: Number(form.base_price),
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        is_active: form.is_active,
        is_bulky: form.is_bulky,
        category_id: Number(form.category_id),
        detail: {
          specifications: Object.keys(specsObj).length > 0 ? specsObj : null,
        },
        variants: uploadedVariants,
        images: uploadedProductImages,
        collection_ids: selectedCollectionIds,
      };

      await api.post('/products', payload);
      toast.dismiss('submit-upload');
      toast.success('Thêm sản phẩm thành công!');
      localStorage.removeItem('product_create_draft');
      navigate('/admin/products');
    } catch {
      toast.dismiss('submit-upload');
      toast.error('Thêm sản phẩm thất bại (Lỗi tải ảnh hoặc lưu thông tin)');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm';
  const smallInputCls = 'w-full px-3 py-2 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

  return (
    <div className="max-w-6xl mx-auto px-4">
      <datalist id="preset-colors">
        {PRESET_COLORS.map(c => <option key={c.hex} value={c.hex}>{c.name}</option>)}
      </datalist>
      <button onClick={() => navigate('/admin/products')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors cursor-pointer">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Thêm sản phẩm mới</h1>
        {/* Auto-save draft indicator */}
        {draftSavedAt && !hasDraft && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-fadeIn">
            <Save size={13} className="text-emerald-600" />
            <span>Đã lưu nháp lúc {draftSavedAt}</span>
          </div>
        )}
      </div>

      {hasDraft && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5 sm:mt-0">📝</span>
            <div>
              <h4 className="text-sm font-bold text-amber-800">Phát hiện bản nháp chưa lưu</h4>
              <p className="text-xs text-amber-600 mt-0.5">Bạn có một bản nháp sản phẩm chưa hoàn tất trước đó. Bạn có muốn khôi phục không?</p>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Khôi phục
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-none text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      <form id="product-create-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        {/* CỘT TRÁI (2/3): Tên, Mô tả, Thông số, Biến thể */}
        <div className="lg:col-span-2 space-y-6">

          {/* TÊN VÀ MÔ TẢ */}
          <section className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Chi tiết sản phẩm
            </h2>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên sản phẩm *</label>
              <input name="name" value={form.name} onChange={handleChange} onBlur={() => validateField('name', form.name)} required className={`${inputCls} ${validationErrors.name ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="VD: Sofa Văng Da Bò Thật Milano" />
              {validationErrors.name && (
                <p className="flex items-center gap-1 mt-1.5 text-xs text-red-500 font-medium"><AlertCircle size={12} />{validationErrors.name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-600">Mô tả chi tiết</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 rounded-none p-1 mr-2">
                    <button type="button" onClick={() => setDescTab('edit')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-none transition-all ${descTab === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                      ✏️ Sửa
                    </button>
                    <button type="button" onClick={() => setDescTab('preview')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-none transition-all ${descTab === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                      👁️ Xem trước
                    </button>
                  </div>
                  <button type="button" onClick={handleAiGenerate} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-none text-xs font-semibold transition-all shadow-md cursor-pointer">
                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiLoading ? 'AI đang viết...' : '✨ Viết bằng AI'}
                  </button>
                </div>
              </div>

              {descTab === 'edit' ? (
                <TiptapEditor
                  value={form.description}
                  onChange={(value) => setForm({ ...form, description: value })}
                  placeholder="Nhập mô tả sản phẩm (hỗ trợ chèn ảnh, in đậm, bảng...)"
                />
              ) : (
                <div className="min-h-[300px] border border-slate-200 rounded-none p-6 bg-slate-50">
                  {form.description && form.description !== '<p><br></p>' ? (
                    <div className="tiptap">
                      <style>{`
                        .tiptap { max-width: 100%; word-break: normal; overflow-wrap: break-word; }
                        .tiptap p { margin-bottom: 0.75rem; line-height: 1.625; color: #334155; }
                        .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #1e293b; }
                        .tiptap h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b; }
                        .tiptap h3 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; color: #1e293b; }
                        .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                        .tiptap blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; font-style: italic; color: #475569; margin: 0.75rem 0; }
                        .tiptap code { background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
                        .tiptap img { max-width: 100%; height: auto; display: block; margin: 1.5rem auto; border-radius: 8px; }
                        .tiptap table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; }
                        .tiptap th, .tiptap td { border: 1px solid #cbd5e1; padding: 0.5rem; text-align: left; }
                        .tiptap th { background-color: #f1f5f9; font-weight: 600; }
                        .tiptap hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.5rem 0; }
                      `}</style>
                      <div dangerouslySetInnerHTML={{ __html: form.description }} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <span className="text-3xl mb-2">📝</span>
                      <p className="text-sm">Chưa có nội dung để xem trước.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* CHI TIẾT KỸ THUẬT */}
          <section className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2"><Settings size={18} className="text-emerald-600" />Thông số kỹ thuật</h2>
              <button type="button" onClick={addSpec}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs font-semibold transition-all cursor-pointer">
                <Plus size={14} /> Thêm thông số
              </button>
            </div>
            {specs.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">Chưa có thông số nào.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {specs.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <input value={s.key} onChange={e => handleSpecChange(i, 'key', e.target.value)}
                      className={`${smallInputCls} flex-[2] mt-0.5`} placeholder="Tên (VD: Bảo hành)" />
                    <textarea
                      value={s.value}
                      onChange={e => handleSpecChange(i, 'value', e.target.value)}
                      onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                        const target = e.currentTarget;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      rows={1}
                      className={`${smallInputCls} flex-[3] resize-none overflow-y-hidden py-2 min-h-[38px]`}
                      placeholder={"Giá trị (VD:\n- Dài 120cm\n- Rộng 80cm)"}
                    />
                    <button type="button" onClick={() => removeSpec(i)}
                      className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none transition-all cursor-pointer mt-0.5">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {specs.length > 0 && (
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <span>💡</span> <span>Mẹo: Bạn có thể nhấn <strong>Enter</strong> để xuống dòng đối với các thông số có nhiều chi tiết.</span>
              </p>
            )}
          </section>

          {/* BIẾN THỂ */}
          <section className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2"><Palette size={18} className="text-purple-600" />Biến thể sản phẩm</h2>
                {variants.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Sản phẩm này hiện tại là sản phẩm đơn giản (không có thuộc tính màu sắc/kích thước).</p>
                )}
              </div>
              <div className="flex gap-2 items-center">
                {showAddAttr ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-none border border-slate-200">
                    <input
                      type="text"
                      value={newAttrKey}
                      onChange={e => setNewAttrKey(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAttr();
                        }
                      }}
                      placeholder="Tên thuộc tính (VD: Màu sắc)"
                      className="px-2.5 py-1 text-xs rounded-none border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500 w-44"
                      autoFocus
                    />
                    <button type="button" onClick={handleAddAttr} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs font-semibold cursor-pointer">
                      Thêm
                    </button>
                    <button type="button" onClick={() => { setShowAddAttr(false); setNewAttrKey(''); }} className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-none text-xs font-semibold cursor-pointer">
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddAttr(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-none text-xs font-semibold transition-all cursor-pointer border border-blue-200">
                    <Plus size={14} /> Thêm thuộc tính
                  </button>
                )}
                <button type="button" onClick={addVariant}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs font-semibold transition-all cursor-pointer">
                  <Plus size={14} /> Thêm biến thể
                </button>
              </div>
            </div>

            {variantAttrKeys.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-3 rounded-none border border-slate-100">
                <span className="text-xs text-slate-500 font-medium mr-1 my-auto">Thuộc tính hoạt động:</span>
                {variantAttrKeys.map(key => (
                  <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-55 text-blue-700 bg-blue-50 rounded-none text-xs font-medium border border-blue-150 border-blue-200">
                    {key}
                    <button type="button" onClick={() => removeVariantAttrKey(key)} className="hover:text-red-650 font-bold ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}

            {variants.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-none text-slate-400">
                <p className="text-sm">Chưa có cấu hình biến thể nào.</p>
                <p className="text-xs mt-1">Biến thể được cấu hình khi sản phẩm có nhiều lựa chọn về màu sắc, kích thước...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {variants.map((v, idx) => (
                  <div key={idx} className="relative p-4 bg-slate-50 rounded-none border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-blue-600">Biến thể #{idx + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => duplicateVariant(idx)}
                          title="Nhân bản biến thể"
                          className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-none transition-all cursor-pointer text-xs">
                          <Copy size={13} />
                          <span className="text-[10px] font-semibold">Nhân bản</span>
                        </button>
                        <button type="button" onClick={() => removeVariant(idx)}
                          title="Xóa biến thể"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none transition-all cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      {/* Ảnh biến thể */}
                      <div className="flex-shrink-0">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Ảnh</label>
                        <div className="relative w-16 h-16 border border-slate-200 rounded-none bg-white overflow-hidden flex items-center justify-center group/var-img shadow-sm">
                          {v.preview_url ? (
                            <>
                              <img src={v.preview_url} alt="Variant" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeVariantImage(idx)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/var-img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">
                                Xóa
                              </button>
                            </>
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-slate-50 transition-colors cursor-pointer">
                              <input type="file" accept="image/*" onChange={e => handleVariantImageUpload(idx, e)} className="hidden" />
                              <Upload size={14} />
                              <span className="text-[9px] mt-0.5 font-bold">Upload</span>
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="flex-grow space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {variantAttrKeys.map(attrKey => {
                            const isColorAttr = attrKey.toLowerCase().includes('màu');
                            const currentVal = v.attributes[attrKey] || '';
                            const textVal = isColorAttr && currentVal.includes('|') ? currentVal.split('|')[0] : currentVal;
                            const colorVal = isColorAttr && currentVal.includes('|') ? currentVal.split('|')[1] : '#ffffff';

                            return (
                              <div key={attrKey}>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{attrKey}</label>
                                {isColorAttr ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      value={textVal}
                                      onChange={e => handleVariantAttrChange(idx, attrKey, `${e.target.value}|${colorVal}`)}
                                      className={`${smallInputCls} flex-1`}
                                      placeholder="Màu (VD: Kem)"
                                    />
                                    <input
                                      type="color"
                                      value={colorVal}
                                      list="preset-colors"
                                      onChange={e => handleVariantAttrChange(idx, attrKey, `${textVal}|${e.target.value}`)}
                                      className="w-8 h-8 p-0 border border-slate-300 rounded-none cursor-pointer flex-shrink-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-none overflow-hidden"
                                    />
                                  </div>
                                ) : (
                                  <input value={currentVal} onChange={e => handleVariantAttrChange(idx, attrKey, e.target.value)}
                                    className={smallInputCls} placeholder={`Nhập ${attrKey.toLowerCase()}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tồn kho</label>
                            <input type="number" value={0} disabled
                              className={`${smallInputCls} bg-slate-100 text-slate-500 cursor-not-allowed`} placeholder="0" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Phụ giá (VNĐ)</label>
                            <input type="number" value={v.price_adjustment} onChange={e => handleVariantFieldChange(idx, 'price_adjustment', e.target.value)}
                              className={smallInputCls} placeholder="0" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Mã SKU</label>
                            <input value={v.sku} onChange={e => handleVariantFieldChange(idx, 'sku', e.target.value)}
                              className={smallInputCls} placeholder="Tự sinh/Tự nhập" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* CỘT PHẢI (1/3): Trạng thái, Cấu hình SKU/Giá, Phân loại, Hình ảnh sản phẩm */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">

          {/* PHÁT HÀNH VÀ SKU */}
          <section className="bg-white rounded-none shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2"><Rocket size={16} className="text-indigo-600" />Phát hành & SKU</h2>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-none border border-slate-150">
              <span className="text-sm font-semibold text-slate-700">Trạng thái đăng bán</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-none border border-slate-150">
              <span className="text-sm font-semibold text-slate-700">Hàng cồng kềnh</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_bulky" checked={form.is_bulky} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mã SKU chính *</label>
              <input name="sku" value={form.sku} onChange={handleChange} onBlur={() => validateField('sku', form.sku)} required className={`${inputCls} ${validationErrors.sku ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="VD: SOFA-MILANO" />
              {validationErrors.sku && (
                <p className="flex items-center gap-1 mt-1.5 text-xs text-red-500 font-medium"><AlertCircle size={12} />{validationErrors.sku}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Slug URL (Tự động)</label>
              <input name="slug" value={form.slug} className={`${inputCls} bg-slate-50 text-slate-500`} readOnly />
            </div>
          </section>

          {/* ĐỊNH GIÁ */}
          <section className="bg-white rounded-none shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2"><Banknote size={16} className="text-amber-600" />Định giá cơ bản</h2>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Giá bán gốc (VNĐ) *</label>
              <input disabled name="base_price" type="number" value={form.base_price} onChange={handleChange} onBlur={() => validateField('base_price', form.base_price)} required className={`${inputCls} ${validationErrors.base_price ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="VD: 15000000" />
              {validationErrors.base_price && (
                <p className="flex items-center gap-1 mt-1.5 text-xs text-red-500 font-medium"><AlertCircle size={12} />{validationErrors.base_price}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Giá khuyến mãi (VNĐ)</label>
              <input disabled name="discount_price" type="number" value={form.discount_price} onChange={handleChange} onBlur={() => validateField('discount_price', form.discount_price)} className={`${inputCls} ${validationErrors.discount_price ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="VD: 12000000" />
              {validationErrors.discount_price && (
                <p className="flex items-center gap-1 mt-1.5 text-xs text-red-500 font-medium"><AlertCircle size={12} />{validationErrors.discount_price}</p>
              )}
              {form.base_price && form.discount_price && Number(form.discount_price) < Number(form.base_price) && (
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                  Đã cấu hình giảm giá {Math.round((1 - Number(form.discount_price) / Number(form.base_price)) * 100)}%
                </div>
              )}
            </div>

            {variants.length === 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Số lượng tồn kho ban đầu</label>
                <input
                  type="number"
                  value={0}
                  disabled
                  className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`}
                  placeholder="0"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 Số lượng tồn kho mặc định bằng 0. Cần tạo phiếu Nhập kho hoặc Kiểm kho để cập nhật số lượng tồn.
                </p>
              </div>
            )}
          </section>

          {/* DANH MỤC & BỘ SƯU TẬP */}
          <section className="bg-white rounded-none shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2"><Tags size={16} className="text-teal-600" />Phân loại sản phẩm</h2>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Danh mục sản phẩm *</label>
              <select name="category_id" value={form.category_id} onChange={handleChange} onBlur={() => validateField('category_id', form.category_id)} required className={`${inputCls} ${validationErrors.category_id ? 'border-red-400 ring-1 ring-red-200' : ''}`}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{'— '.repeat(c.level || 0)}{c.name}</option>)}
              </select>
              {validationErrors.category_id && (
                <p className="flex items-center gap-1 mt-1.5 text-xs text-red-500 font-medium"><AlertCircle size={12} />{validationErrors.category_id}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Bộ sưu tập</label>
              <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-none">
                {collections.map(col => (
                  <label key={col.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-none transition-colors text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      className="rounded-none border-slate-350 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      checked={selectedCollectionIds.includes(col.id)}
                      onChange={() => handleCollectionToggle(col.id)}
                    />
                    <span>{col.name}</span>
                  </label>
                ))}
                {collections.length === 0 && <span className="text-xs text-slate-400 italic p-1">Chưa có bộ sưu tập nào.</span>}
              </div>
            </div>
          </section>

          {/* HÌNH ẢNH SẢN PHẨM */}
          <section className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><ImageIcon size={16} className="text-rose-600" />Hình ảnh sản phẩm</h2>

            {/* Vùng Drag & Drop Tải ảnh */}
            <div
              onDragOver={handleFileDragOver}
              onDragLeave={handleFileDragLeave}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-none p-4 text-center cursor-pointer transition-all ${isFileDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
                }`}
            >
              <label className="block cursor-pointer w-full h-full">
                <input type="file" accept="image/*" multiple onChange={handleImagesUpload} className="hidden" />
                {uploadingImage ? (
                  <Loader2 size={24} className="text-blue-500 animate-spin mx-auto mb-2" />
                ) : (
                  <>
                    <Upload size={24} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-bold mb-0.5">Kéo thả ảnh vào đây</p>
                    <p className="text-[10px] text-slate-400 font-medium">Hoặc nhấp để chọn file từ máy</p>
                  </>
                )}
              </label>
            </div>

            {/* Danh sách ảnh lưới phẳng */}
            {productImages.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {productImages.map((img, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    className={`group relative flex flex-col rounded-none border bg-slate-50 overflow-hidden transition-all shadow-sm hover:shadow-md cursor-move ${img.is_primary ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/5' : 'border-slate-200 hover:border-slate-350'
                      } ${draggedImageIndex === idx ? 'opacity-40' : ''}`}
                  >
                    {/* Phần hiển thị ảnh */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white flex items-center justify-center border-b border-slate-100">
                      <img src={img.image_url} alt={`Product ${idx}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                      {/* Nhãn trạng thái (Góc trên trái) */}
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 pointer-events-none z-10">
                        {img.is_primary && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/90 backdrop-blur-sm text-white text-[8px] font-bold rounded-none shadow-sm">
                            <Star size={8} className="fill-white" />
                            Ảnh chính
                          </span>
                        )}
                        {img.is_hover && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/90 backdrop-blur-sm text-white text-[8px] font-bold rounded-none shadow-sm">
                            <Eye size={8} className="fill-white" />
                            Hover
                          </span>
                        )}
                      </div>

                      {/* Overlay điều khiển khi hover */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-[1px] z-20">
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(idx)}
                          className={`p-1.5 rounded-none transition-all duration-200 shadow-sm cursor-pointer border ${img.is_primary
                            ? 'bg-amber-500 text-white border-amber-400 hover:bg-amber-600'
                            : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white hover:text-amber-500 hover:scale-110'
                            }`}
                          title={img.is_primary ? 'Đang là ảnh chính' : 'Đặt làm ảnh chính'}
                        >
                          <Star size={12} className={img.is_primary ? 'fill-white' : ''} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setHoverImage(idx)}
                          className={`p-1.5 rounded-none transition-all duration-200 shadow-sm cursor-pointer border ${img.is_hover
                            ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                            : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white hover:text-blue-600 hover:scale-110'
                            }`}
                          title={img.is_hover ? 'Đang là ảnh hover' : 'Đặt làm ảnh hover'}
                        >
                          <Eye size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="p-1.5 bg-white/90 text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-650 rounded-none transition-all duration-200 hover:scale-110 shadow-sm cursor-pointer"
                          title="Xóa ảnh"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Phần dropdown chọn biến thể bên dưới */}
                    <div className="p-1.5 bg-white flex flex-col gap-0.5">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-0.5">Liên kết biến thể</label>
                      <select
                        value={img.variant_index ?? ''}
                        onChange={e => handleImageVariantSelect(idx, e.target.value)}
                        className="w-full text-[9px] py-0.5 px-1 rounded-none border border-slate-200 text-slate-600 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 cursor-pointer outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                        title="Chọn biến thể cho ảnh này"
                      >
                        <option value="">-- Dùng chung --</option>
                        {variants.map((v, vIdx) => {
                          const attrValues = Object.values(v.attributes || {}).map(val => String(val).split('|')[0]).filter(val => val.trim()).join(', ');
                          return (
                            <option key={vIdx} value={vIdx}>#{vIdx + 1}: {attrValues || 'Chưa đặt tên'}</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* MINI PREVIEW CARD */}
          {(form.name || productImages.length > 0 || form.base_price) && (
            <section className="bg-white rounded-none shadow-sm border border-slate-200 p-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Eye size={13} />
                Xem trước sản phẩm
              </h2>
              <div className="border border-slate-200 bg-slate-50 overflow-hidden">
                {/* Product image preview */}
                <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {productImages.length > 0 ? (
                    <img
                      src={productImages.find(img => img.is_primary)?.image_url || productImages[0]?.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={32} className="mx-auto mb-1 opacity-30" />
                      <p className="text-[10px] font-medium">Chưa có ảnh</p>
                    </div>
                  )}
                </div>
                {/* Product info preview */}
                <div className="p-3 space-y-1.5">
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                    {form.name || 'Tên sản phẩm...'}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    {form.discount_price && Number(form.discount_price) > 0 && Number(form.discount_price) < Number(form.base_price) ? (
                      <>
                        <span className="text-sm font-extrabold text-red-600">
                          {Number(form.discount_price).toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          {Number(form.base_price).toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5">
                          -{Math.round((1 - Number(form.discount_price) / Number(form.base_price)) * 100)}%
                        </span>
                      </>
                    ) : form.base_price ? (
                      <span className="text-sm font-extrabold text-slate-800">
                        {Number(form.base_price).toLocaleString('vi-VN')}đ
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chưa nhập giá</span>
                    )}
                  </div>
                  {form.is_active ? (
                    <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 uppercase">Sẵn sàng bán</span>
                  ) : (
                    <span className="inline-block text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 uppercase">Bản nháp</span>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </form>

      {/* STICKY ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-8 py-3 flex items-center justify-between z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="text-xs text-slate-400 font-medium">
          {draftSavedAt && !hasDraft && (
            <span className="flex items-center gap-1.5"><Save size={12} className="text-emerald-500" />Lưu nháp tự động lúc {draftSavedAt}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-none text-sm transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="product-create-form"
            disabled={submitting}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-none text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? 'Đang xử lý...' : 'Thêm sản phẩm'}
          </button>
        </div>
      </div>
    </div>
  );
}
