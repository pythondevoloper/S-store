export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  specs: Record<string, string>;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  customerName: string;
  phone: string;
  address: string;
  items: CartItem[];
  total: number;
}
