export interface Staff {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "staff" | "viewer";
  isActive: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  staff: Staff;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  category?: Category;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  isPrimary: boolean;
  createdAt: string;
}

export type CustomerTier = "standard" | "silver" | "gold" | "vip";

export interface Customer {
  id: string;
  zaloUserId: string | null;
  phone: string | null;
  email?: string | null;
  name: string | null;
  address: string | null;
  note: string | null;
  role?: string;
  tier?: CustomerTier;
  skus: string[];
  createdAt: string;
  updatedAt: string | null;
}

export type ConversationStatus = "ai_handling" | "human_handling" | "closed";

export interface Conversation {
  id: string;
  customerId: string | null;
  customer?: Customer;
  zaloUserId: string;
  status: ConversationStatus;
  isHumanMode: boolean;
  assignedTo: string | null;
  assignedStaff?: Staff;
  createdAt: string;
  updatedAt: string | null;
  lastMessage?: Message;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "staff";
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "done"
  | "cancelled";

export interface Order {
  id: string;
  customerId: string | null;
  customer?: Customer;
  conversationId: string | null;
  status: OrderStatus;
  note: string | null;
  totalAmount: number;
  assignedTo: string | null;
  assignedStaff?: Staff;
  createdAt: string;
  updatedAt: string | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  variant?: ProductVariant & { product?: Product };
  quantity: number;
  unitPrice: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  pendingOrders: number;
  activeConversations: number;
  lowStockCount: number;
  totalCustomers: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  orders: number;
}
