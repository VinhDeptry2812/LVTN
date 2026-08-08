export interface SpecRow {
  key: string;
  value: string;
}

export interface VariantInput {
  id?: number;
  sku: string;
  attributes: Record<string, string>;
  stock: number | string;
  import_price?: number | string;
  price_adjustment: number | string;
  image_url?: string;
  local_file?: File;
  preview_url?: string;
}

export interface ProductImageInput {
  image_url: string;
  is_primary: boolean;
  is_hover: boolean;
  file?: File;
  is_local?: boolean;
  variant_index?: number;
  variant_indices?: number[];
  variant_id?: number;
}

export interface Category {
  id: number;
  name: string;
  children?: Category[];
  level?: number;
}

export const flattenCategories = (nodes: Category[], level = 0): Category[] => {
  const result: Category[] = [];
  for (const node of nodes) {
    result.push({ ...node, level });
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategories(node.children, level + 1));
    }
  }
  return result;
};

export const DEFAULT_SPECS: SpecRow[] = [
  { key: 'Kích thước', value: '' },
  { key: 'Chất liệu', value: '' },
  { key: 'Cân nặng', value: '' },
  { key: 'Bảo hành', value: '' },
];

export const PRESET_COLORS = [
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

export const compressImage = (file: File): Promise<File> => {
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
