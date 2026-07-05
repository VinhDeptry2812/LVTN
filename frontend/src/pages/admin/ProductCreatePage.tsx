import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Upload, Sparkles, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import TiptapEditor from '@/components/TiptapEditor';
import { useRef, useMemo, useCallback } from 'react';

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
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
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
          0.8
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



  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedImageIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

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

  const [form, setForm] = useState({
    sku: '', name: '', slug: '', description: '',
    base_price: '', discount_price: '', category_id: '', is_active: true,
  });

  const [specs, setSpecs] = useState<SpecRow[]>([...DEFAULT_SPECS]);
  const [productImages, setProductImages] = useState<ProductImageInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [variantUploadingIndexes, setVariantUploadingIndexes] = useState<number[]>([]);
  const [variantAttrKeys, setVariantAttrKeys] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  // === THÔNG SỐ KỸ THUẬT ===
  const addSpec = () => setSpecs(prev => [...prev, { key: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs(prev => prev.filter((_, idx) => idx !== i));
  const handleSpecChange = (i: number, field: 'key' | 'value', val: string) => {
    setSpecs(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: val }; return u; });
  };

  // === BIẾN THỂ ===
  const addVariantAttrKey = () => {
    const name = prompt('Nhập tên thuộc tính mới (VD: Chất liệu đệm):');
    if (name && name.trim() && !variantAttrKeys.includes(name.trim())) {
      setVariantAttrKeys(prev => [...prev, name.trim()]);
      setVariants(prev => prev.map(v => ({
        ...v, attributes: { ...v.attributes, [name.trim()]: '' }
      })));
    }
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
    setVariants(prev => {
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
    setVariants(prev => {
      const u = [...prev];
      u[index] = { ...u[index], attributes: { ...u[index].attributes, [attrKey]: value } };

      // Auto-generate variant SKU
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
    setSelectedCollectionIds(prev => 
      prev.includes(id) ? prev.filter(colId => colId !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    api.get('/categories').then(res => setCategories(flattenCategories(res.data)));
    api.get('/collections').then(res => setCollections(res.data));
  }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
    }));
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    const newImages: ProductImageInput[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        const isPrimary = productImages.length === 0 && newImages.length === 0;
        newImages.push({
          image_url: previewUrl,
          is_primary: isPrimary,
          is_hover: false, // We don't auto-set hover initially
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
      toast.success(`Đã chọn và nén thành công ${newImages.length} ảnh!`);
    }
    setUploadingImage(false);
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
        name: form.name, category: categoryName,
        attributes: attributes || 'Sản phẩm nội thất cao cấp',
      });
      setForm(prev => ({ ...prev, description: res.data.data }));
      toast.success('AI đã sinh mô tả thành công!');
    } catch { toast.error('Không thể sinh mô tả lúc này'); }
    finally { setAiLoading(false); }
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
      const uploadedVariants = await Promise.all(
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


      const specsObj: Record<string, string> = {};
      specs.forEach(s => { if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim(); });

      const payload: Record<string, unknown> = {
        sku: form.sku, name: form.name, slug: form.slug, description: processedDescription,
        base_price: Number(form.base_price),
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        is_active: form.is_active, category_id: Number(form.category_id),
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
      navigate('/admin/products');
    } catch {
      toast.dismiss('submit-upload');
      toast.error('Thêm sản phẩm thất bại (Lỗi tải ảnh hoặc lưu thông tin)');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm';
  const smallInputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

  return (
    <div className="max-w-4xl mx-auto">
      <datalist id="preset-colors">
        {PRESET_COLORS.map(c => <option key={c.hex} value={c.hex}>{c.name}</option>)}
      </datalist>
      <button onClick={() => navigate('/admin/products')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors cursor-pointer">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-8">Thêm sản phẩm mới</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* THÔNG TIN CƠ BẢN */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">Thông tin cơ bản</h2>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Mã SKU *</label>
              <input name="sku" value={form.sku} onChange={handleChange} required className={inputCls} placeholder="VD: SOFA-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Danh mục *</label>
              <select name="category_id" value={form.category_id} onChange={handleChange} required className={inputCls}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{'— '.repeat(c.level || 0)}{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên sản phẩm *</label>
              <input name="name" value={form.name} onChange={handleChange} required className={inputCls} placeholder="VD: Sofa Văng Da Bò Thật Milano" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Slug (tự động)</label>
              <input name="slug" value={form.slug} onChange={handleChange} className={`${inputCls} bg-slate-50 text-slate-500`} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Giá cơ bản (VNĐ) *</label>
              <input name="base_price" type="number" value={form.base_price} onChange={handleChange} required className={inputCls} placeholder="VD: 15000000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Giá khuyến mãi (VNĐ)</label>
              <input name="discount_price" type="number" value={form.discount_price} onChange={handleChange} className={inputCls} placeholder="VD: 12000000 (Để trống nếu không giảm giá)" />
            </div>
          </div>
          <div className="mt-5">
            <label className="block text-sm font-medium text-slate-600 mb-2">Bộ sưu tập</label>
            <div className="flex flex-wrap gap-3">
              {collections.map(col => (
                <label key={col.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedCollectionIds.includes(col.id)}
                    onChange={() => handleCollectionToggle(col.id)}
                  />
                  <span className="text-sm text-slate-700">{col.name}</span>
                </label>
              ))}
              {collections.length === 0 && <span className="text-sm text-slate-500 italic">Chưa có bộ sưu tập nào.</span>}
            </div>
          </div>
        </section>

        {/* MÔ TẢ + AI */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-700">Mô tả sản phẩm</h2>
            <div className="flex items-center gap-2">
              {/* Tab Toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-1 mr-2">
                <button type="button" onClick={() => setDescTab('edit')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    descTab === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  ✏️ Soạn thảo
                </button>
                <button type="button" onClick={() => setDescTab('preview')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    descTab === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  👁️ Xem trước
                </button>
              </div>
              <button type="button" onClick={handleAiGenerate} disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer">
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {aiLoading ? 'AI đang viết...' : '✨ Sinh mô tả bằng AI'}
              </button>
            </div>
          </div>
          {descTab === 'edit' ? (
            <TiptapEditor
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
              placeholder="Nhập mô tả sản phẩm (hỗ trợ chèn ảnh, in đậm, list...)"
            />
          ) : (
            <div className="min-h-[300px] border border-slate-200 rounded-xl p-6 bg-slate-50">
              {form.description && form.description !== '<p><br></p>' ? (
                <div className="tiptap">
                  <style>{`
                    .tiptap { max-width: 100%; word-break: normal; overflow-wrap: break-word; word-wrap: break-word; }
                    .tiptap p { margin-bottom: 0.75rem; line-height: 1.625; color: #334155; }
                    .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #1e293b; }
                    .tiptap h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b; }
                    .tiptap h3 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; color: #1e293b; }
                    .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                    .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                    .tiptap blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; font-style: italic; color: #475569; margin: 0.75rem 0; }
                    .tiptap code { background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
                    .tiptap img { max-width: 100%; height: auto; display: block; margin: 1.5rem auto; border-radius: 8px; }
                    
                    /* Table styles */
                    .tiptap table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; overflow: hidden; }
                    .tiptap th, .tiptap td { border: 1px solid #cbd5e1; padding: 0.5rem; text-align: left; }
                    .tiptap th { background-color: #f1f5f9; font-weight: 600; }
                    .tiptap mark { background-color: #fef08a; padding: 0.1rem 0.25rem; border-radius: 4px; color: #1e293b; }
                    .tiptap hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.5rem 0; }
                    .tiptap pre { background-color: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 1rem 0; }
                  `}</style>
                  <div dangerouslySetInnerHTML={{ __html: form.description }} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <span className="text-4xl mb-3">📝</span>
                  <p className="text-sm">Chưa có nội dung để xem trước.</p>
                  <p className="text-xs mt-1">Hãy soạn thảo nội dung ở tab "Soạn thảo" trước.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* CHI TIẾT KỸ THUẬT - ĐỘNG */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-700">Thông số kỹ thuật</h2>
            <button type="button" onClick={addSpec}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer">
              <Plus size={16} /> Thêm thông số
            </button>
          </div>
          {specs.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-sm">Chưa có thông số nào. Bấm "Thêm thông số" để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {specs.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input value={s.key} onChange={e => handleSpecChange(i, 'key', e.target.value)}
                    className={`${smallInputCls} flex-[2]`} placeholder="Tên thông số (VD: Chất liệu)" />
                  <input value={s.value} onChange={e => handleSpecChange(i, 'value', e.target.value)}
                    className={`${smallInputCls} flex-[3]`} placeholder="Giá trị (VD: Da bò thật, khung gỗ sồi)" />
                  <button type="button" onClick={() => removeSpec(i)}
                    className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Xóa">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}


        </section>

        {/* BIẾN THỂ - ĐỘNG */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-700">Biến thể sản phẩm</h2>
            <div className="flex gap-2">
              <button type="button" onClick={addVariantAttrKey}
                className="flex items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-all cursor-pointer border border-blue-200">
                <Plus size={14} /> Thêm thuộc tính
              </button>
              <button type="button" onClick={addVariant}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer">
                <Plus size={16} /> Thêm biến thể
              </button>
            </div>
          </div>

          {/* Hiển thị danh sách thuộc tính đang dùng */}
          {variantAttrKeys.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {variantAttrKeys.map(key => (
                <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                  {key}
                  <button type="button" onClick={() => removeVariantAttrKey(key)}
                    className="hover:text-red-600 transition-colors cursor-pointer" title={`Xóa thuộc tính "${key}"`}>✕</button>
                </span>
              ))}
            </div>
          )}

          {variants.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-sm">Chưa có biến thể nào. Bấm "Thêm biến thể" để bắt đầu.</p>
              <p className="text-xs mt-1">Biến thể giúp quản lý nhiều phiên bản của cùng một sản phẩm.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((v, idx) => (
                <div key={idx} className="relative p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Biến thể #{idx + 1}</span>
                    <button type="button" onClick={() => removeVariant(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Xóa biến thể">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    {/* Cột ảnh biến thể */}
                    <div className="flex-shrink-0">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ảnh</label>
                      <div className="relative w-16 h-16 border border-slate-200 rounded-lg bg-white overflow-hidden flex items-center justify-center group/var-img shadow-sm">
                        {v.preview_url || v.image_url ? (
                          <>
                            <img src={v.preview_url || v.image_url} alt="Variant" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeVariantImage(idx)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover/var-img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                              Xóa
                            </button>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-slate-50 transition-colors cursor-pointer">
                            <input type="file" accept="image/*" onChange={e => handleVariantImageUpload(idx, e)} className="hidden" />
                            <Upload size={14} />
                            <span className="text-[10px] mt-0.5 font-medium">Tải lên</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Phần input thông tin */}
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
                                    placeholder={`Tên (VD: Trắng)`} 
                                  />
                                  <input 
                                    type="color" 
                                    value={colorVal} 
                                    list="preset-colors"
                                    onChange={e => handleVariantAttrChange(idx, attrKey, `${textVal}|${e.target.value}`)}
                                    className="w-8 h-8 p-0 border border-slate-300 rounded-full cursor-pointer flex-shrink-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full overflow-hidden" 
                                    title="Chọn mã màu"
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
                          <input type="number" value={v.stock} onChange={e => handleVariantFieldChange(idx, 'stock', e.target.value)}
                            className={smallInputCls} min={0} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Phụ giá (VNĐ)</label>
                          <input type="number" value={v.price_adjustment} onChange={e => handleVariantFieldChange(idx, 'price_adjustment', e.target.value)}
                            className={smallInputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">SKU biến thể</label>
                          <input value={v.sku} onChange={e => handleVariantFieldChange(idx, 'sku', e.target.value)}
                            className={smallInputCls} placeholder="Tự động / nhập tay" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* HÌNH ẢNH */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">Hình ảnh sản phẩm</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
              <input type="file" accept="image/*" multiple onChange={handleImagesUpload} className="hidden" />
              {uploadingImage ? (
                <Loader2 size={24} className="text-blue-500 animate-spin" />
              ) : (
                <>
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <span className="text-xs text-slate-400 font-medium">Tải ảnh lên</span>
                </>
              )}
            </label>

            {productImages.map((img, idx) => (
              <div 
                key={idx} 
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
                className={`relative group h-32 rounded-xl border overflow-hidden transition-all shadow-sm cursor-move ${img.is_primary ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'} ${draggedImageIndex === idx ? 'opacity-50' : ''}`}
              >
                <img src={img.image_url} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                
                {/* Overlay hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => removeImage(idx)}
                      className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer" title="Xóa ảnh">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <select
                      value={img.variant_index ?? ''}
                      onChange={e => handleImageVariantSelect(idx, e.target.value)}
                      className="w-full mb-1 text-[10px] p-1 rounded border border-slate-300 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                    <button type="button" onClick={() => setPrimaryImage(idx)}
                      className={`w-full py-1 text-center text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${img.is_primary ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'}`}>
                      {img.is_primary ? 'Ảnh chính' : 'Đặt làm ảnh chính'}
                    </button>
                    <button type="button" onClick={() => setHoverImage(idx)}
                      className={`w-full py-1 text-center text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${img.is_hover ? 'bg-amber-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'}`}>
                      {img.is_hover ? 'Ảnh Hover' : 'Đặt làm Hover'}
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {img.is_primary && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-sm w-fit">
                      Ảnh chính
                    </span>
                  )}
                  {img.is_hover && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow-sm w-fit">
                      Hover
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* NÚT SUBMIT */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-slate-600">Hiển thị bán ngay</span>
          </label>
          <button type="submit" disabled={submitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer">
            {submitting ? 'Đang lưu...' : 'Tạo sản phẩm'}
          </button>
        </div>
      </form>
    </div>
  );
}
