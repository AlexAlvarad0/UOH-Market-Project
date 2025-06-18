export interface ProductImage {
  id: number;
  product: number;
  image: string;
  is_primary: boolean;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  original_price?: number | null;
  is_favorite?: boolean;
  category: number;
  category_name?: string;
  condition: string;
  status?: string;
  created_at: string;
  updated_at: string;
  seller: number;
  seller_name?: string;
  images?: ProductImage[];
}

export interface WeeklyOffer extends Product {
  discount_percentage: number;
}
