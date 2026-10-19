export type Role = "pelanggan" | "mitra";
export type PartnerPage = "dashboard" | "pesanan" | "keuangan" | "outlet";

export type IconName =
  | "arrow"
  | "bell"
  | "camera"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "home"
  | "image"
  | "location"
  | "orders"
  | "profile"
  | "search"
  | "star"
  | "store"
  | "users"
  | "wallet";

export interface Outlet {
  id?: string;
  name: string;
  address: string;
  distance: string;
  rating: string;
  price: string;
  eta: string;
  photo: string;
  verified: boolean;
}

export type OrderStatus =
  | "pending_payment"
  | "pending_partner"
  | "accepted"
  | "rejected"
  | "awaiting_customer_approval"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "expired";

export interface OrderItem {
  id: string;
  service_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  unit: string;
  line_total: number;
}

export interface PartnerOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  outlet_id: string;
  outlet_name?: string;
  service_date: string;
  status: OrderStatus;
  handover_method: "pickup_delivery" | "drop_off";
  payment_method: "digital" | "cash";
  payment_status: string;
  subtotal_estimate: number;
  final_service_amount: number | null;
  created_at: string;
  items: OrderItem[];
}

