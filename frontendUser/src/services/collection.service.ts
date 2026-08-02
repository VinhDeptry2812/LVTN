import api from './api';
import { type ProductFrontend } from './product.service';

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string;
  cover_image: string;
  is_active: boolean;
  products?: ProductFrontend[];
}

let cachedCollections: Collection[] | null = null;
let collectionPromise: Promise<Collection[]> | null = null;

export const getActiveCollections = async (): Promise<Collection[]> => {
  if (cachedCollections) return cachedCollections;
  if (collectionPromise) return collectionPromise;

  collectionPromise = api
    .get('/collections')
    .then((response) => {
      cachedCollections = response.data;
      collectionPromise = null;
      return response.data;
    })
    .catch((error) => {
      collectionPromise = null;
      throw error;
    });

  return collectionPromise;
};

export const clearCollectionsCache = () => {
  cachedCollections = null;
};


export const getCollectionBySlug = async (slug: string): Promise<Collection> => {
  const response = await api.get(`/collections/${slug}`);
  return response.data;
};
