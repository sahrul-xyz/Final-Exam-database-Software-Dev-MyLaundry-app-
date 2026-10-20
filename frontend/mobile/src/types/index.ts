export type TabName = "beranda" | "pesanan" | "profil";

export type HandoverMethod = "pickup_delivery" | "drop_off";
export type PaymentMethod = "digital" | "cash";
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

export interface Outlet {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: string;
  price: string;
  eta: string;
  photo: string;
  verified: boolean;
  /** Koordinat WGS84 untuk marker Google Maps (null bila outlet belum punya lokasi) */
  latitude?: number | null;
  longitude?: number | null;
}

export interface LaundryServiceItem {
  id: string;
  name: string;
  price: number;
  pricingType: "per_kg" | "per_item";
  durationHours: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: "customer" | "partner";
}

export interface OrderItem {
  id?: string;
  serviceId?: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  lineTotal: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  outletId: string;
  outletName: string;
  status: OrderStatus;
  handoverMethod: HandoverMethod;
  subtotalEstimate: number;
  finalServiceAmount?: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  serviceDate: string;
  createdAt: string;
  items: OrderItem[];
}

export type ServiceCategory = "kiloan" | "express" | "satuan";
