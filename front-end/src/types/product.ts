export interface ProductImage {
  id: number;
  product: number;
  image: string;
  is_primary: boolean;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  category: ProductCategory | number;
  category_name?: string;
  seller: number;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  image?: string;
  views_count: number;
  is_active: boolean;
}
