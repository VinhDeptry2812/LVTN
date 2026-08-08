import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatAttributeValue } from '@/utils/format';
import type { UploadProgress } from '@/components/UploadProgressWidget';
import type {
  Category,
  SpecRow,
  VariantInput,
  ProductImageInput,
} from '../types';
import { flattenCategories, compressImage } from '../types';

export function useProductEditForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<{ id: number; name: string }[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [loading, setLoading] = useState(true);

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

  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [productImages, setProductImages] = useState<ProductImageInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [variantAttrKeys, setVariantAttrKeys] = useState<string[]>([]);
  const [simpleStock, setSimpleStock] = useState<string>('0');
  const [simpleImportPrice, setSimpleImportPrice] = useState<string>('0');
  const [defaultVariantId, setDefaultVariantId] = useState<number | null>(null);

  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const originalDataRef = useRef<string | null>(null);

  // Set original data once loading completes
  useEffect(() => {
    if (!loading && !originalDataRef.current) {
      originalDataRef.current = JSON.stringify({
        form,
        specs,
        variants: variants.map((v) => ({
          sku: v.sku,
          attributes: v.attributes,
          stock: v.stock,
          import_price: v.import_price,
          price_adjustment: v.price_adjustment,
        })),
        selectedCollectionIds,
        simpleStock,
        simpleImportPrice,
      });
    }
  }, [loading, form, specs, variants, selectedCollectionIds, simpleStock, simpleImportPrice]);

  // Warn before reload/unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!originalDataRef.current) return;
      const currentData = JSON.stringify({
        form,
        specs,
        variants: variants.map((v) => ({
          sku: v.sku,
          attributes: v.attributes,
          stock: v.stock,
          price_adjustment: v.price_adjustment,
        })),
        selectedCollectionIds,
        simpleStock,
      });

      if (originalDataRef.current !== currentData) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, specs, variants, selectedCollectionIds, simpleStock]);

  // Load product data + categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, colRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get('/categories'),
          api.get('/collections'),
        ]);
        setCategories(flattenCategories(catRes.data));
        setCollections(colRes.data);

        const p = prodRes.data;
        setForm({
          sku: p.sku || '',
          name: p.name || '',
          slug: p.slug || '',
          description: p.description || '',
          base_price: p.base_price?.toString() || '',
          discount_price: p.discount_price?.toString() || '',
          category_id: p.category?.id?.toString() || '',
          is_active: p.is_active ?? true,
          is_bulky: p.is_bulky ?? false,
        });

        if (p.collections && Array.isArray(p.collections)) {
          setSelectedCollectionIds(p.collections.map((col: any) => col.id));
        }

        // Load specifications động
        const specData = p.detail?.specifications;
        if (specData) {
          if (Array.isArray(specData)) {
            setSpecs(specData.map((item: any) => ({ key: item.key || '', value: String(item.value || '') })));
          } else if (typeof specData === 'object') {
            setSpecs(Object.entries(specData).map(([key, value]) => ({ key, value: String(value) })));
          }
        }

        // Load biến thể + xây dựng lại danh sách thuộc tính keys
        let loadedVariants: VariantInput[] = [];
        if (p.variants && p.variants.length > 0) {
          const isSimple =
            p.variants.length === 1 &&
            (!p.variants[0].attributes || Object.keys(p.variants[0].attributes).length === 0);

          if (isSimple) {
            setDefaultVariantId(p.variants[0].id);
            setSimpleStock(String(p.variants[0].stock || 0));
            setSimpleImportPrice(String(p.variants[0].import_price || 0));
            setVariantAttrKeys([]);
            setVariants([]);
          } else {
            const allAttrKeys = new Set<string>();
            loadedVariants = p.variants.map((v: any) => {
              const attrs = v.attributes || {};
              Object.keys(attrs).forEach((k) => allAttrKeys.add(k));
              return {
                id: v.id,
                sku: v.sku || '',
                attributes: attrs,
                stock: v.stock !== null && v.stock !== undefined ? v.stock : '',
                import_price: v.import_price !== null && v.import_price !== undefined ? v.import_price : '',
                price_adjustment:
                  v.price_adjustment !== null && v.price_adjustment !== undefined ? v.price_adjustment : '',
                image_url: v.image_url || '',
              };
            });
            setVariantAttrKeys([...allAttrKeys]);
            setVariants(loadedVariants);
          }
        }

        // Load danh sách ảnh (gộp theo image_url để hiển thị 1:N / N:N)
        if (p.images && p.images.length > 0) {
          const imageMap = new Map<string, any>();
          p.images.forEach((img: any) => {
            const vIdx =
              loadedVariants.length > 0 ? loadedVariants.findIndex((v) => v.id === img.variant_id) : -1;
            if (imageMap.has(img.image_url)) {
              const existing = imageMap.get(img.image_url);
              if (vIdx !== -1 && !existing.variant_indices.includes(vIdx)) {
                existing.variant_indices.push(vIdx);
              }
            } else {
              imageMap.set(img.image_url, {
                image_url: img.image_url,
                is_primary: img.is_primary ?? false,
                is_hover: img.is_hover ?? false,
                variant_id: img.variant_id,
                variant_index: vIdx !== -1 ? vIdx : undefined,
                variant_indices: vIdx !== -1 ? [vIdx] : [],
              });
            }
          });
          setProductImages(Array.from(imageMap.values()));
        }
      } catch {
        toast.error('Không thể tải thông tin sản phẩm');
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

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

  const validateField = (field: string, val: string) => {
    let err = '';
    if (field === 'sku' && !val.trim()) err = 'Mã SKU không được để trống';
    if (field === 'name' && !val.trim()) err = 'Tên sản phẩm không được để trống';
    if (field === 'category_id' && !val) err = 'Vui lòng chọn danh mục';
    if (field === 'base_price') {
      if (!val) err = 'Giá niêm yết không được để trống';
      else if (Number(val) <= 0) err = 'Giá bán phải lớn hơn 0';
    }
    setValidationErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const newVal = type === 'checkbox' ? checked : value;

    setForm((prev) => ({
      ...prev,
      [name]: newVal,
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
    }));

    if (type !== 'checkbox') {
      validateField(name, value);
    }
  };

  const generateAutoSku = (categoryId: string, name: string) => {
    if (!categoryId || !name) return '';
    const selectedCategory = categories.find((c) => c.id === Number(categoryId));
    if (!selectedCategory) return '';

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
    const prodPrefix = getPrefix(name);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `${catPrefix}-${prodPrefix}-${randomSuffix}`;
  };

  const handleResetAutoSku = () => {
    const autoSku = generateAutoSku(form.category_id, form.name);
    if (autoSku) {
      setForm((prev) => ({ ...prev, sku: autoSku }));
      toast.success('Đã làm mới mã SKU tự động!');
    } else {
      toast.error('Vui lòng chọn danh mục và nhập tên sản phẩm trước!');
    }
  };

  // Drag & drop handlers
  const handleDragStart = (idx: number) => {
    setDraggedImageIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

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

  // Specs
  const addSpec = () => setSpecs((prev) => [...prev, { key: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs((prev) => prev.filter((_, idx) => idx !== i));
  const handleSpecChange = (i: number, field: 'key' | 'value', val: string) => {
    setSpecs((prev) => {
      const u = [...prev];
      u[i] = { ...u[i], [field]: val };
      return u;
    });
  };

  // File drag state for image uploader
  const [isFileDragOver, setIsFileDragOver] = useState(false);

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

  const generateVariantSku = (
    mainSku: string,
    attributes: Record<string, string>,
    index: number,
    attrKeys: string[]
  ) => {
    const cleanVal = (val: string) => {
      if (!val) return '';
      const textOnly = formatAttributeValue(val);
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
        sku: source.sku
          ? `${source.sku}-copy`
          : generateVariantSku(form.sku, source.attributes, prev.length, variantAttrKeys),
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

  const handleVariantFieldChange = (
    index: number,
    field: 'sku' | 'stock' | 'import_price' | 'price_adjustment',
    value: string
  ) => {
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
        updated[index] = {
          ...updated[index],
          local_file: compressed,
          preview_url: previewUrl,
          image_url: '',
        };
        return updated;
      });
      toast.success('Đã tải ảnh biến thể (bản xem trước)!');
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
      updated[index] = {
        ...updated[index],
        image_url: '',
        local_file: undefined,
        preview_url: '',
      };
      return updated;
    });
  };

  const handleVariantAttrChange = (index: number, attrKey: string, value: string) => {
    setVariants((prev) => {
      const u = [...prev];
      const updatedAttrs = { ...u[index].attributes, [attrKey]: value };
      u[index] = {
        ...u[index],
        attributes: updatedAttrs,
        sku: generateVariantSku(form.sku, updatedAttrs, index, variantAttrKeys),
      };
      return u;
    });
  };

  const handleSelectImageFromLibraryForVariant = (index: number, imgUrl: string, file?: File) => {
    setVariants((prev) => {
      const updated = [...prev];
      if (updated[index].preview_url && updated[index].preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(updated[index].preview_url!);
      }
      updated[index] = {
        ...updated[index],
        image_url: imgUrl,
        local_file: file,
        preview_url: file ? URL.createObjectURL(file) : imgUrl,
      };
      return updated;
    });

    setProductImages((prev) =>
      prev.map((img) => {
        if (img.image_url === imgUrl) {
          const currentIndices = img.variant_indices || (img.variant_index !== undefined ? [img.variant_index] : []);
          if (!currentIndices.includes(index)) {
            const nextIndices = [...currentIndices, index];
            return {
              ...img,
              variant_indices: nextIndices,
              variant_index: nextIndices[0],
              variant_id: variants[nextIndices[0]]?.id || img.variant_id,
            };
          }
        }
        return img;
      })
    );
    toast.success(`Đã liên kết ảnh thư viện với biến thể #${index + 1}`);
  };

  const handleCollectionToggle = (colId: number) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(colId) ? prev.filter((idItem) => idItem !== colId) : [...prev, colId]
    );
  };

  // Image uploads logic
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

      if (target.is_primary && updated.length > 0) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  const handleImageVariantMultiSelect = (imgIdx: number, newVariantIndices: number[]) => {
    setProductImages((prev) => {
      const updated = [...prev];
      const targetImg = updated[imgIdx];
      if (!targetImg) return prev;

      targetImg.variant_indices = newVariantIndices;
      targetImg.variant_index = newVariantIndices.length > 0 ? newVariantIndices[0] : undefined;
      if (newVariantIndices.length > 0) {
        const firstVariant = variants[newVariantIndices[0]];
        if (firstVariant?.id) {
          targetImg.variant_id = firstVariant.id;
        }
      } else {
        targetImg.variant_id = undefined;
      }
      return updated;
    });
  };

  const handleAiGenerate = async () => {
    if (!form.name) {
      toast.error('Vui lòng nhập tên sản phẩm trước!');
      return;
    }
    setAiLoading(true);
    try {
      const categoryName = categories.find((c) => c.id === Number(form.category_id))?.name || 'Nội thất';
      const attributes = specs.filter((s) => s.key && s.value).map((s) => `${s.key}: ${s.value}`).join(', ');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            variant_id: img.variant_id,
            variant_indices: indices,
          };
        })
      );

      const validProductImages: any[] = [];
      uploadedProductImages.forEach((img) => {
        if (!img.image_url) return;
        const indices = img.variant_indices || [];
        if (indices.length > 0) {
          indices.forEach((vIdx: number) => {
            const vId = variants[vIdx]?.id || img.variant_id;
            validProductImages.push({
              image_url: img.image_url,
              is_primary: img.is_primary ?? false,
              is_hover: img.is_hover ?? false,
              variant_index: vIdx,
              variant_id: vId,
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
            ...(defaultVariantId ? { id: defaultVariantId } : {}),
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
              ...(v.id ? { id: v.id } : {}),
              sku: v.sku || null,
              attributes: Object.fromEntries(
                Object.entries(v.attributes).filter(([, val]) => val.trim())
              ),
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
        base_price: Number(form.base_price),
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
      await api.patch(`/products/${id}`, payload);
      toast.success('Cập nhật sản phẩm thành công!');
      originalDataRef.current = null;
      navigate('/admin/products');
    } catch (error: any) {
      console.error(error);
      const serverMsg = error.response?.data?.message;
      const errorMsg = Array.isArray(serverMsg)
        ? serverMsg.join(', ')
        : serverMsg || error.message || 'Cập nhật thất bại (Lỗi tải ảnh hoặc lưu thông tin)';
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
    id,
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
    skuManuallyEdited: true, // For edit page, SKU editing is standard
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
  };
}
