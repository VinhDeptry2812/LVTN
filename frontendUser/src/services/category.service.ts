import api from './api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  is_featured?: boolean;
  sort_order?: number;
  children?: Category[];
}

let cachedCategories: Category[] | null = null;
let categoryPromise: Promise<Category[]> | null = null;

export const getCategories = async (): Promise<Category[]> => {
  if (cachedCategories) return cachedCategories;
  if (categoryPromise) return categoryPromise;

  categoryPromise = api
    .get('/categories')
    .then((response) => {
      cachedCategories = response.data;
      categoryPromise = null;
      return response.data;
    })
    .catch((error) => {
      categoryPromise = null;
      throw error;
    });

  return categoryPromise;
};

export const clearCategoriesCache = () => {
  cachedCategories = null;
};

