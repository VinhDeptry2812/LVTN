import { useState } from 'react';
import toast from 'react-hot-toast';

export interface UseImageUploadOptions {
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    maxFiles = 3,
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  } = options;

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (files.length >= maxFiles) {
      toast.error(`Bạn chỉ được chọn tối đa ${maxFiles} ảnh`);
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file ảnh dạng PNG, JPEG, JPG, WEBP');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Kích thước ảnh tối đa là ${maxSizeMB}MB`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviews((prev) => [...prev, previewUrl]);
    setFiles((prev) => [...prev, file]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setPreviews((prev) => {
      const urlToRemove = prev[index];
      if (urlToRemove) URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== index);
    });
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
  };

  return {
    files,
    previews,
    handleFileSelect,
    removeImage,
    reset,
    setFiles,
    setPreviews,
  };
}
