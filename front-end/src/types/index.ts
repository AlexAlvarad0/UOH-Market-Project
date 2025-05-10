export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category_name: string;
  condition: string;
  images: Array<{ image: string }>;
  is_favorite: boolean;
}

export interface Category {
  id: number;
  name: string;
}
