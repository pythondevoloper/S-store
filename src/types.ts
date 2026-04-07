export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  reviewImage?: string;
  videoUrl?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  dynamicPrice?: number;
  groupPrice?: number;
  isTrending?: boolean;
  viewCount?: number;
  image: string;
  description: string;
  specs: Record<string, string>;
  reviews?: Review[];
  "3dModelUrl"?: string;
  stockQuantity: number;
}

export interface GroupBuySession {
  id: string;
  productId: string;
  creatorEmail: string;
  participants: string[]; // Emails
  createdAt: string;
  expiresAt: string;
  status: "active" | "completed" | "expired";
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  items: CartItem[];
  total: number;
  status: "Pending" | "Paid" | "Processing" | "Shipped" | "Delivered";
  createdAt: string;
  ref?: string;
  giftWrapping?: boolean;
  greetingCard?: string;
  warrantyId?: string;
  warrantyExpiry?: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  email: string;
  alertPrice: number;
  createdAt: string;
}
