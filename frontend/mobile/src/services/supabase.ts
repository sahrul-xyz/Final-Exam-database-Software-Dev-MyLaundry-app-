import { createClient } from "@supabase/supabase-js";
import {
  Outlet,
  UserProfile,
  LaundryServiceItem,
  CustomerOrder,
  HandoverMethod,
  PaymentMethod,
} from "../types";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://fqlxabqejusalxmyxzyx.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbHhhYnFlanVzYWx4bXl4enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODkwMzMsImV4cCI6MjEwNTI2NTAzM30.o85cw5jWpYFUJ8yEIG84YQrXlhuADoC1LmszReWP8BY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey.includes("placeholder");

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

let supabaseReachable: boolean | null = null;

export function isDemoMode(): boolean {
  return supabaseReachable === false;
}

function isInvalidApiKeyError(message?: string | null): boolean {
  return String(message || "")
    .toLowerCase()
    .includes("invalid api key");
}

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    supabaseReachable = false;
    return false;
  }

  if (supabaseReachable !== null) return supabaseReachable;

  try {
    const { error } = await supabase
      .from("laundry_outlets")
      .select("id")
      .limit(1);

    if (error) {
      if (isInvalidApiKeyError(error.message)) {
        supabaseReachable = false;
        return false;
      }
      supabaseReachable = true;
      return true;
    }

    supabaseReachable = true;
    return true;
  } catch {
    supabaseReachable = null;
    return false;
  }
}

function buildDemoUser(
  email: string,
  fullName?: string,
  phone?: string
): UserProfile {
  const nameFromEmail =
    email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "Pelanggan MyLaundry";

  return {
    id: DEMO_USER_ID,
    email,
    fullName: fullName || nameFromEmail,
    phone: phone || "0812-0000-0000",
    role: "customer",
  };
}

function validateDemoCredentials(email: string, password: string): string | null {
  if (!email || !email.includes("@")) return "Format email tidak valid.";
  if (!password || password.length < 6) {
    return "Kata sandi minimal 6 karakter.";
  }
  return null;
}

export const fallbackOutlets: Outlet[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Bersih Laundry Setiabudi",
    address: "Jl. Dr. Setiabudi No. 156, Bandung",
    distance: "0,8 km",
    rating: "4,9",
    price: "Rp8.000 /kg",
    eta: "2 hari",
    photo:
      "https://images.unsplash.com/photo-1790876687829-7b27e0576036?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080",
    verified: true,
    latitude: -6.85843,
    longitude: 107.59003,
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "FreshFold Dago",
    address: "Jl. Ir. H. Djuanda No. 88, Bandung",
    distance: "1,4 km",
    rating: "4,8",
    price: "Rp7.500 /kg",
    eta: "1 hari",
    photo:
      "https://images.unsplash.com/photo-1765163076573-26499e530ec8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=900",
    verified: true,
    latitude: -6.88876,
    longitude: 107.61359,
  },
];

export const fallbackServices: LaundryServiceItem[] = [
  {
    id: "srv-1",
    name: "Cuci + Setrika",
    price: 8000,
    pricingType: "per_kg",
    durationHours: 48,
  },
  {
    id: "srv-2",
    name: "Cuci Kering",
    price: 6000,
    pricingType: "per_kg",
    durationHours: 24,
  },
  {
    id: "srv-3",
    name: "Express 6 Jam",
    price: 14000,
    pricingType: "per_kg",
    durationHours: 6,
  },
];

/**
 * Koordinat cadangan untuk outlet seed, dipakai ketika kolom
 * latitude/longitude belum tersedia di database (migration belum di-push).
 */
const OUTLET_COORDINATE_FALLBACK: Record<string, { latitude: number; longitude: number }> = {
  "a0000000-0000-0000-0000-000000000001": {
    latitude: -6.85843,
    longitude: 107.59003,
  },
  "a0000000-0000-0000-0000-000000000002": {
    latitude: -6.88876,
    longitude: 107.61359,
  },
};

export async function getLiveOutlets(): Promise<Outlet[]> {
  try {
    // 1. Coba query lengkap (dengan koordinat) — dipakai bila migration
    //    20261020000002_outlet_geolocation.sql sudah di-push.
    let { data, error } = await supabase
      .from("laundry_outlets")
      .select(`
        id,
        name,
        address_text,
        is_active,
        photo_url,
        latitude,
        longitude,
        created_at,
        laundry_services ( price )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // 2. Kolom latitude/longitude belum ada -> query tanpa koordinat,
    //    lalu pasangkan dengan koordinat cadangan.
    if (error) {
      const retry = await supabase
        .from("laundry_outlets")
        .select(`
          id,
          name,
          address_text,
          is_active,
          photo_url,
          created_at,
          laundry_services ( price )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (retry.error || !retry.data || retry.data.length === 0) {
        return fallbackOutlets;
      }

      data = retry.data.map((item: any) => {
        const coord = OUTLET_COORDINATE_FALLBACK[item.id];
        return { ...item, latitude: coord?.latitude ?? null, longitude: coord?.longitude ?? null };
      });
    }

    if (!data || data.length === 0) {
      return fallbackOutlets;
    }

    return data.map((item: any, idx: number) => {
      const services = item.laundry_services || [];
      const minPrice = services.length
        ? Math.min(...services.map((s: any) => Number(s.price)))
        : 8000;

      return {
        id: item.id,
        name: item.name,
        address: item.address_text || "Bandung",
        distance: `${(0.8 + idx * 0.6).toFixed(1)} km`,
        rating: "4.9",
        price: `Mulai Rp${minPrice.toLocaleString("id-ID")} /kg`,
        eta: "1-2 hari",
        photo:
          item.photo_url ||
          "https://images.unsplash.com/photo-1790876687829-7b27e0576036?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080",
        verified: true,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
      };
    });
  } catch {
    return fallbackOutlets;
  }
}

// ----------------- SERVICES CATALOG -----------------

export async function fetchOutletServices(
  outletId: string
): Promise<LaundryServiceItem[]> {
  try {
    const { data, error } = await supabase
      .from("laundry_services")
      .select("id, name, price, pricing_type, estimated_duration_hours")
      .eq("outlet_id", outletId)
      .eq("is_active", true);

    if (error || !data || data.length === 0) {
      return fallbackServices;
    }

    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price),
      pricingType: s.pricing_type,
      durationHours: s.estimated_duration_hours,
    }));
  } catch {
    return fallbackServices;
  }
}

// ----------------- ORDERS SERVICE -----------------

export async function createCustomerOrder(params: {
  customerId: string;
  outletId: string;
  outletName: string;
  service: LaundryServiceItem;
  quantity: number;
  handoverMethod: HandoverMethod;
  paymentMethod: PaymentMethod;
}): Promise<{ order: CustomerOrder | null; error: string | null }> {
  try {
    const totalEstimate = params.service.price * params.quantity;
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `#ML-${dateCode}-${randomSuffix}`;
    const serviceDate = new Date().toISOString().split("T")[0];

    const initialStatus =
      params.paymentMethod === "digital"
        ? "pending_payment"
        : "pending_partner";

    const serviceUuid = params.service.id.startsWith("srv-")
      ? null
      : params.service.id;
    const unit = params.service.pricingType === "per_kg" ? "kg" : "item";

    // Coba eksekusi transaksi atomik via PostgreSQL Stored Procedure (IK301 Transaksi)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "create_order_atomic",
      {
        p_customer_id: params.customerId,
        p_outlet_id: params.outletId,
        p_service_date: serviceDate,
        p_handover_method: params.handoverMethod,
        p_payment_method: params.paymentMethod,
        p_service_id: serviceUuid,
        p_service_name: params.service.name,
        p_unit_price: params.service.price,
        p_quantity: params.quantity,
        p_unit: unit,
        p_subtotal: totalEstimate,
      }
    );

    let orderId: string;
    let finalOrderNumber: string = orderNumber;
    let finalCreatedAt: string = new Date().toISOString();

    if (!rpcError && rpcData?.order_id) {
      orderId = rpcData.order_id;
      finalOrderNumber = rpcData.order_number || orderNumber;
      finalCreatedAt = rpcData.created_at || finalCreatedAt;
    } else {
      // Fallback transaksi klien jika RPC belum dieksekusi di database
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: params.customerId,
          outlet_id: params.outletId,
          service_date: serviceDate,
          status: initialStatus,
          handover_method: params.handoverMethod,
          subtotal_estimate: totalEstimate,
          payment_method: params.paymentMethod,
          payment_status: "pending",
          payment_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          partner_response_deadline: new Date(
            Date.now() + 30 * 60 * 1000
          ).toISOString(),
        })
        .select("id, order_number, status, created_at")
        .single();

      if (orderError) {
        console.error("Order error:", orderError);
        return { order: null, error: orderError.message };
      }

      orderId = orderData.id;
      finalCreatedAt = orderData.created_at || finalCreatedAt;

      // Insert ke order_items
      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: orderId,
        service_id: serviceUuid,
        service_name_snapshot: params.service.name,
        unit_price_snapshot: params.service.price,
        quantity: params.quantity,
        unit,
        line_total: totalEstimate,
      });

      if (itemError) {
        console.warn("Item error:", itemError.message);
      }

      // Catat audit history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        old_status: null,
        new_status: initialStatus,
        changed_by: params.customerId,
        note: "Pesanan dibuat oleh pelanggan",
      });
    }

    const newOrder: CustomerOrder = {
      id: orderId,
      orderNumber: finalOrderNumber,
      outletId: params.outletId,
      outletName: params.outletName,
      status: initialStatus,
      handoverMethod: params.handoverMethod,
      subtotalEstimate: totalEstimate,
      paymentMethod: params.paymentMethod,
      paymentStatus: "pending",
      serviceDate,
      createdAt: finalCreatedAt,
      items: [
        {
          serviceName: params.service.name,
          unitPrice: params.service.price,
          quantity: params.quantity,
          unit: params.service.pricingType === "per_kg" ? "kg" : "item",
          lineTotal: totalEstimate,
        },
      ],
    };

    return { order: newOrder, error: null };
  } catch (err: any) {
    return { order: null, error: err.message || "Gagal membuat pesanan" };
  }
}

export async function fetchCustomerOrders(
  customerId: string
): Promise<CustomerOrder[]> {
  try {
    // Evaluasi otomatis pesanan kedaluwarsa lewat Edge Function (PRD Bab 9.7)
    supabase.functions.invoke("expire-orders").catch(() => {});

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        outlet_id,
        status,
        handover_method,
        subtotal_estimate,
        final_service_amount,
        payment_method,
        payment_status,
        service_date,
        created_at,
        laundry_outlets ( name ),
        order_items ( id, service_name_snapshot, unit_price_snapshot, quantity, unit, line_total )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      outletId: o.outlet_id,
      outletName: o.laundry_outlets?.name || "Outlet Laundry",
      status: o.status,
      handoverMethod: o.handover_method,
      subtotalEstimate: Number(o.subtotal_estimate),
      finalServiceAmount: o.final_service_amount ? Number(o.final_service_amount) : null,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      serviceDate: o.service_date,
      createdAt: o.created_at,
      items: (o.order_items || []).map((it: any) => ({
        id: it.id,
        serviceName: it.service_name_snapshot,
        unitPrice: Number(it.unit_price_snapshot),
        quantity: Number(it.quantity),
        unit: it.unit,
        lineTotal: Number(it.line_total),
      })),
    }));
  } catch {
    return [];
  }
}

// ----------------- FITUR PELANGGAN: ULASAN, KOMPLAIN & TRANSAKSI -----------------

export async function submitCustomerReview(params: {
  orderId: string;
  customerId: string;
  outletId: string;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("reviews").insert({
      order_id: params.orderId,
      customer_id: params.customerId,
      outlet_id: params.outletId,
      rating: params.rating,
      comment: params.comment || null,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal mengirim ulasan" };
  }
}

export async function submitCustomerComplaint(params: {
  orderId: string;
  customerId: string;
  reason: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("complaints").insert({
      order_id: params.orderId,
      customer_id: params.customerId,
      reason: params.reason,
      status: "open",
    });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal mengajukan komplain" };
  }
}

export async function respondToPriceAdjustment(params: {
  orderId: string;
  customerId: string;
  approved: boolean;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const newStatus = params.approved ? "processing" : "cancelled";
    const note = params.approved
      ? "Pelanggan menyetujui penyesuaian biaya aktual."
      : "Pelanggan menolak penyesuaian biaya, pesanan dibatalkan.";

    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", params.orderId);

    if (orderError) return { success: false, error: orderError.message };

    await supabase.from("order_status_history").insert({
      order_id: params.orderId,
      new_status: newStatus,
      changed_by: params.customerId,
      note,
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memproses persetujuan harga" };
  }
}

export async function confirmDigitalPaymentSimulation(params: {
  orderId: string;
  customerId: string;
  amount?: number;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "pending_partner",
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.orderId);

    if (error) return { success: false, error: error.message };

    // Catat record pembayaran di tabel payments (PRD Bab 9.3)
    if (params.amount) {
      await supabase.from("payments").insert({
        order_id: params.orderId,
        method: "digital_qris",
        amount: params.amount,
        status: "paid",
        reference: `PAY-SIM-${Date.now()}`,
        verified_at: new Date().toISOString(),
      });
    }

    await supabase.from("order_status_history").insert({
      order_id: params.orderId,
      new_status: "pending_partner",
      changed_by: params.customerId,
      note: "Pembayaran digital simulasi berhasil diselesaikan oleh pelanggan.",
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memproses pembayaran" };
  }
}

export function subscribeToCustomerOrders(onUpdate: () => void) {
  const channel = supabase
    .channel("customer_orders_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ----------------- AUTHENTICATION -----------------

export async function signUpCustomer(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<{ user: UserProfile | null; error: string | null }> {
  const reachable = await checkSupabaseConnection();

  if (!reachable) {
    const invalid = validateDemoCredentials(params.email, params.password);
    if (invalid) return { user: null, error: invalid };
    return {
      user: buildDemoUser(params.email, params.fullName, params.phone),
      error: null,
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          phone: params.phone,
          role: "customer",
        },
      },
    });

    if (authError) {
      if (isInvalidApiKeyError(authError.message)) {
        supabaseReachable = false;
        const invalid = validateDemoCredentials(params.email, params.password);
        if (invalid) return { user: null, error: invalid };
        return {
          user: buildDemoUser(params.email, params.fullName, params.phone),
          error: null,
        };
      }
      return { user: null, error: authError.message };
    }
    if (!authData.user) return { user: null, error: "Gagal membuat akun." };

    const userId = authData.user.id;

    // Simpan ke tabel public.profiles
    await supabase.from("profiles").upsert({
      id: userId,
      full_name: params.fullName,
      phone: params.phone || null,
      role: "customer",
    });

    return {
      user: {
        id: userId,
        email: params.email,
        fullName: params.fullName,
        phone: params.phone,
        role: "customer",
      },
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message || "Gagal registrasi akun" };
  }
}

export async function signInCustomer(params: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile | null; error: string | null }> {
  const reachable = await checkSupabaseConnection();

  if (!reachable) {
    const invalid = validateDemoCredentials(params.email, params.password);
    if (invalid) return { user: null, error: invalid };
    return { user: buildDemoUser(params.email), error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) {
      if (isInvalidApiKeyError(error.message)) {
        supabaseReachable = false;
        const invalid = validateDemoCredentials(params.email, params.password);
        if (invalid) return { user: null, error: invalid };
        return { user: buildDemoUser(params.email), error: null };
      }
      return { user: null, error: error.message };
    }
    if (!data.user) return { user: null, error: "Pengguna tidak ditemukan." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", data.user.id)
      .maybeSingle();

    const metaRole = data.user.user_metadata?.role;
    const rawRole = profile?.role || metaRole;

    const fullName =
      profile?.full_name ||
      data.user.user_metadata?.full_name ||
      data.user.email?.split("@")[0] ||
      "Pelanggan";

    const phone = profile?.phone || data.user.user_metadata?.phone;

    return {
      user: {
        id: data.user.id,
        email: data.user.email || params.email,
        fullName,
        phone,
        role: rawRole === "partner" ? "partner" : "customer",
      },
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message || "Gagal masuk" };
  }
}

export async function signOutCustomer(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // fallback
  }
}

export async function getCurrentCustomer(): Promise<UserProfile | null> {
  const reachable = await checkSupabaseConnection();
  if (!reachable) return null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", user.id)
      .maybeSingle();

    const metaRole = user.user_metadata?.role;
    const rawRole = profile?.role || metaRole;

    const fullName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Pelanggan";

    return {
      id: user.id,
      email: user.email || "",
      fullName,
      phone: profile?.phone || user.user_metadata?.phone,
      role: rawRole === "partner" ? "partner" : "customer",
    };
  } catch {
    return null;
  }
}
