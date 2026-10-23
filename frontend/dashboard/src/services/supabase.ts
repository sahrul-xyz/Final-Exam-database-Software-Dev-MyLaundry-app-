import { createClient } from "@supabase/supabase-js";
import { Role, Outlet, PartnerOrder, OrderStatus, OrderItem } from "../types";

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey.includes("placeholder");

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
}

// ----------------- AUTH SERVICE -----------------

export async function signUpWithRole(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: Role;
  outletName?: string;
}): Promise<{ user: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    // Simulasi offline jika Supabase belum dikonfigurasi
    return {
      user: {
        id: "mock-user-id",
        email: params.email,
        fullName: params.fullName,
        phone: params.phone,
        role: params.role,
      },
      error: null,
    };
  }

  const dbRole = params.role === "mitra" ? "partner" : "customer";

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          phone: params.phone,
          role: dbRole,
        },
      },
    });

    if (authError) return { user: null, error: authError.message };
    if (!authData.user) return { user: null, error: "Gagal membuat akun." };

    const userId = authData.user.id;

    // Simpan ke tabel public.profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: params.fullName,
      phone: params.phone || null,
      role: dbRole,
    });

    if (profileError) {
      console.warn("Peringatan saat membuat profil:", profileError.message);
    }

    // Jika mitra memasukkan nama outlet, buat record outlet awal
    if (params.role === "mitra" && params.outletName) {
      await supabase.from("laundry_outlets").insert({
        owner_id: userId,
        name: params.outletName,
        address_text: "Belum diatur",
        is_active: false,
      });
    }

    return {
      user: {
        id: userId,
        email: params.email,
        fullName: params.fullName,
        phone: params.phone,
        role: params.role,
      },
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message || "Terjadi kesalahan registrasi" };
  }
}

export async function signIn(params: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    // Fallback jika Supabase belum dikonfigurasi
    const roleGuess: Role = params.email.includes("mitra") ? "mitra" : "pelanggan";
    return {
      user: {
        id: "mock-user-id",
        email: params.email,
        fullName: params.email.split("@")[0],
        role: roleGuess,
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: "Pengguna tidak ditemukan." };

    // Ambil profile dari database
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", data.user.id)
      .maybeSingle();

    const metaRole = data.user.user_metadata?.role;
    const rawRole = profile?.role || metaRole;

    const role: Role =
      rawRole === "partner" || rawRole === "mitra"
        ? "mitra"
        : "pelanggan";

    const fullName =
      profile?.full_name ||
      data.user.user_metadata?.full_name ||
      data.user.email?.split("@")[0] ||
      "Mitra";

    const phone =
      profile?.phone ||
      data.user.user_metadata?.phone;

    // Pastikan record ada di tabel public.profiles jika sebelumnya belum ada
    if (!profile) {
      supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          full_name: fullName,
          phone: phone || null,
          role: role === "mitra" ? "partner" : "customer",
        })
        .then();
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || params.email,
        fullName,
        phone,
        role,
      },
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message || "Gagal masuk" };
  }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

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

    const role: Role =
      rawRole === "partner" || rawRole === "mitra"
        ? "mitra"
        : "pelanggan";

    const fullName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Mitra";

    const phone =
      profile?.phone ||
      user.user_metadata?.phone;

    // Pastikan record ada di tabel public.profiles jika sebelumnya belum ada
    if (!profile) {
      supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          phone: phone || null,
          role: role === "mitra" ? "partner" : "customer",
        })
        .then();
    }

    return {
      id: user.id,
      email: user.email || "",
      fullName,
      phone,
      role,
    };
  } catch {
    return null;
  }
}

// ----------------- OUTLET SERVICE -----------------

export async function fetchLiveOutlets(): Promise<Outlet[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from("laundry_outlets")
      .select(`
        id,
        name,
        address_text,
        service_area,
        operating_hours,
        photo_url,
        is_active,
        laundry_services ( price, pricing_type )
      `)
      .eq("is_active", true);

    if (error || !data || data.length === 0) return null;

    return data.map((item: any) => {
      const minPrice = item.laundry_services?.length
        ? Math.min(...item.laundry_services.map((s: any) => Number(s.price)))
        : 8000;

      return {
        name: item.name,
        address: item.address_text,
        distance: "1,2 km",
        rating: "4,9",
        price: `Rp${minPrice.toLocaleString("id-ID")}`,
        eta: "1-2 hari",
        photo:
          item.photo_url ||
          "https://images.unsplash.com/photo-1790876687829-7b27e0576036?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080",
        verified: true,
      };
    });
  } catch {
    return null;
  }
}

export interface PartnerOutletData {
  id: string;
  name: string;
  address_text: string;
  operating_hours: string;
  is_active: boolean;
  photo_url?: string;
}

export interface PartnerServiceData {
  id: string;
  name: string;
  price: number;
  pricing_type: string;
  estimated_duration_hours: number;
}

export async function fetchPartnerOutlet(
  partnerId: string,
  partnerName?: string
): Promise<PartnerOutletData | null> {
  if (!isSupabaseConfigured) return null;

  try {
    // 1. Coba cari outlet milik partner
    let { data, error } = await supabase
      .from("laundry_outlets")
      .select("id, name, address_text, operating_hours, is_active, photo_url")
      .eq("owner_id", partnerId)
      .maybeSingle();

    // 2. Jika belum ada, coba cari outlet default yang belum berpemilik
    if (!data) {
      const { data: unowned } = await supabase
        .from("laundry_outlets")
        .select("id, name, address_text, operating_hours, is_active, photo_url")
        .is("owner_id", null)
        .limit(1)
        .maybeSingle();

      if (unowned) {
        // Klaim outlet default tersebut jika ada
        await supabase
          .from("laundry_outlets")
          .update({ owner_id: partnerId })
          .eq("id", unowned.id);

        data = { ...unowned };
      } else {
        // 3. Jika mitra belum memiliki outlet sama sekali, buatkan outlet baru otomatis khusus mitra ini
        const defaultOutletName = partnerName ? `Outlet ${partnerName}` : "Outlet Laundry Baru";
        const { data: newOutlet, error: createError } = await supabase
          .from("laundry_outlets")
          .insert({
            owner_id: partnerId,
            name: defaultOutletName,
            address_text: "Alamat belum diatur",
            operating_hours: "08.00 - 20.00",
            is_active: true,
          })
          .select()
          .single();

        if (!createError && newOutlet) {
          data = newOutlet;

          // Buat template 3 layanan awal untuk outlet baru ini
          await supabase.from("laundry_services").insert([
            {
              outlet_id: newOutlet.id,
              name: "Cuci + Setrika",
              price: 8000,
              pricing_type: "per_kg",
              estimated_duration_hours: 48,
              is_active: true,
            },
            {
              outlet_id: newOutlet.id,
              name: "Cuci Kering",
              price: 6000,
              pricing_type: "per_kg",
              estimated_duration_hours: 24,
              is_active: true,
            },
            {
              outlet_id: newOutlet.id,
              name: "Express 6 Jam",
              price: 14000,
              pricing_type: "per_kg",
              estimated_duration_hours: 6,
              is_active: true,
            },
          ]);
        }
      }
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      address_text: data.address_text || "",
      operating_hours: data.operating_hours || "08.00 - 20.00",
      is_active: data.is_active ?? true,
      photo_url: data.photo_url || "",
    };
  } catch (err) {
    console.error("fetchPartnerOutlet error:", err);
    return null;
  }
}

export async function savePartnerOutlet(params: {
  id?: string;
  owner_id: string;
  name: string;
  address_text: string;
  operating_hours: string;
  is_active: boolean;
  photo_url?: string;
}): Promise<{ success: boolean; id?: string; error: string | null }> {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    const payload: any = {
      name: params.name,
      address_text: params.address_text,
      operating_hours: params.operating_hours,
      is_active: params.is_active,
      owner_id: params.owner_id,
      updated_at: new Date().toISOString(),
    };
    if (params.photo_url !== undefined) {
      payload.photo_url = params.photo_url;
    }

    if (params.id) {
      const { error } = await supabase
        .from("laundry_outlets")
        .update(payload)
        .eq("id", params.id);

      if (error) return { success: false, error: error.message };
      return { success: true, id: params.id, error: null };
    } else {
      const { data, error } = await supabase
        .from("laundry_outlets")
        .insert(payload)
        .select("id")
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, id: data?.id, error: null };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function uploadOutletPhoto(
  outletId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    // 1. Resize & compress image on canvas to max 1200x800, quality 0.82
    const compressedDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // 2. Try Supabase Storage if configured
    if (isSupabaseConfigured && outletId) {
      try {
        const res = await fetch(compressedDataUrl);
        const blob = await res.blob();
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${outletId}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("outlet-photos")
          .upload(fileName, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: publicData } = supabase.storage
            .from("outlet-photos")
            .getPublicUrl(fileName);

          if (publicData?.publicUrl) {
            return { url: publicData.publicUrl, error: null };
          }
        }
      } catch (storageErr) {
        console.warn("Storage upload failed, falling back to data URL:", storageErr);
      }
    }

    // 3. Fallback to compressed Data URL
    return { url: compressedDataUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err.message || "Gagal memproses gambar" };
  }
}

export async function fetchPartnerServices(outletId: string): Promise<PartnerServiceData[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from("laundry_services")
      .select("id, name, price, pricing_type, estimated_duration_hours")
      .eq("outlet_id", outletId)
      .eq("is_active", true);

    if (error || !data || data.length === 0) {
      return [
        { id: "s-1", name: "Cuci + Setrika", price: 8000, pricing_type: "per_kg", estimated_duration_hours: 48 },
        { id: "s-2", name: "Cuci Kering", price: 6000, pricing_type: "per_kg", estimated_duration_hours: 24 },
        { id: "s-3", name: "Express 6 Jam", price: 14000, pricing_type: "per_kg", estimated_duration_hours: 6 },
      ];
    }

    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      price: Number(d.price),
      pricing_type: d.pricing_type,
      estimated_duration_hours: d.estimated_duration_hours,
    }));
  } catch {
    return [];
  }
}

export async function updatePartnerServicePrice(
  serviceId: string,
  newPrice: number
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    const { error } = await supabase
      .from("laundry_services")
      .update({ price: newPrice })
      .eq("id", serviceId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function savePartnerService(service: {
  id?: string;
  outlet_id: string;
  name: string;
  price: number;
  pricing_type: string;
  estimated_duration_hours: number;
  is_active?: boolean;
}): Promise<{ success: boolean; data?: PartnerServiceData; error: string | null }> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      data: {
        id: service.id || `mock-${Date.now()}`,
        name: service.name,
        price: service.price,
        pricing_type: service.pricing_type,
        estimated_duration_hours: service.estimated_duration_hours,
      },
      error: null,
    };
  }

  try {
    if (service.id && !service.id.startsWith("mock-") && !service.id.startsWith("s-")) {
      const { data, error } = await supabase
        .from("laundry_services")
        .update({
          name: service.name,
          price: service.price,
          pricing_type: service.pricing_type,
          estimated_duration_hours: service.estimated_duration_hours,
          is_active: service.is_active ?? true,
        })
        .eq("id", service.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          price: Number(data.price),
          pricing_type: data.pricing_type,
          estimated_duration_hours: data.estimated_duration_hours,
        },
        error: null,
      };
    } else {
      const { data, error } = await supabase
        .from("laundry_services")
        .insert({
          outlet_id: service.outlet_id,
          name: service.name,
          price: service.price,
          pricing_type: service.pricing_type,
          estimated_duration_hours: service.estimated_duration_hours,
          is_active: true,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          price: Number(data.price),
          pricing_type: data.pricing_type,
          estimated_duration_hours: data.estimated_duration_hours,
        },
        error: null,
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePartnerService(
  serviceId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    const { error } = await supabase
      .from("laundry_services")
      .delete()
      .eq("id", serviceId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// ----------------- PARTNER ORDERS SERVICE -----------------

export const fallbackPartnerOrders: PartnerOrder[] = [
  {
    id: "ord-mock-1",
    order_number: "#ML-240521",
    customer_id: "c-1",
    customer_name: "Alya Putri",
    customer_phone: "0812-3456-7890",
    outlet_id: "a0000000-0000-0000-0000-000000000001",
    outlet_name: "Bersih Laundry Setiabudi",
    service_date: new Date().toISOString().split("T")[0],
    status: "pending_partner",
    handover_method: "drop_off",
    payment_method: "cash",
    payment_status: "pending",
    subtotal_estimate: 24000,
    final_service_amount: null,
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-1",
        service_name_snapshot: "Cuci + Setrika",
        unit_price_snapshot: 8000,
        quantity: 3,
        unit: "kg",
        line_total: 24000,
      },
    ],
  },
  {
    id: "ord-mock-2",
    order_number: "#ML-240520",
    customer_id: "c-2",
    customer_name: "Rizky Ananda",
    customer_phone: "0813-9876-5432",
    outlet_id: "a0000000-0000-0000-0000-000000000001",
    outlet_name: "Bersih Laundry Setiabudi",
    service_date: new Date().toISOString().split("T")[0],
    status: "accepted",
    handover_method: "pickup_delivery",
    payment_method: "digital",
    payment_status: "paid",
    subtotal_estimate: 31200,
    final_service_amount: null,
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-2",
        service_name_snapshot: "Cuci Kering",
        unit_price_snapshot: 6000,
        quantity: 5.2,
        unit: "kg",
        line_total: 31200,
      },
    ],
  },
  {
    id: "ord-mock-3",
    order_number: "#ML-240518",
    customer_id: "c-3",
    customer_name: "Nadia Safitri",
    customer_phone: "0821-4455-6677",
    outlet_id: "a0000000-0000-0000-0000-000000000001",
    outlet_name: "Bersih Laundry Setiabudi",
    service_date: new Date().toISOString().split("T")[0],
    status: "processing",
    handover_method: "drop_off",
    payment_method: "cash",
    payment_status: "pending",
    subtotal_estimate: 39200,
    final_service_amount: 39200,
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-3",
        service_name_snapshot: "Express 6 Jam",
        unit_price_snapshot: 14000,
        quantity: 2.8,
        unit: "kg",
        line_total: 39200,
      },
    ],
  },
  {
    id: "ord-mock-4",
    order_number: "#ML-240516",
    customer_id: "c-4",
    customer_name: "Dimas Pratama",
    customer_phone: "0877-1122-3344",
    outlet_id: "a0000000-0000-0000-0000-000000000001",
    outlet_name: "Bersih Laundry Setiabudi",
    service_date: new Date().toISOString().split("T")[0],
    status: "ready_for_pickup",
    handover_method: "pickup_delivery",
    payment_method: "digital",
    payment_status: "paid",
    subtotal_estimate: 36800,
    final_service_amount: 36800,
    created_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-4",
        service_name_snapshot: "Cuci + Setrika",
        unit_price_snapshot: 8000,
        quantity: 4.6,
        unit: "kg",
        line_total: 36800,
      },
    ],
  },
];

export async function fetchPartnerOrders(partnerId?: string): Promise<PartnerOrder[]> {
  if (!isSupabaseConfigured) return fallbackPartnerOrders;

  try {
    // Evaluasi otomatis pesanan kedaluwarsa lewat Edge Function (PRD Bab 9.7)
    supabase.functions.invoke("expire-orders").catch(() => {});

    // Dapatkan daftar ID outlet milik mitra ini agar pesanan terisolasi
    let outletIds: string[] | null = null;
    if (partnerId) {
      const { data: partnerOutlets, error: outError } = await supabase
        .from("laundry_outlets")
        .select("id")
        .eq("owner_id", partnerId);

      if (outError) {
        console.warn("fetchPartnerOrders outError:", outError.message);
      }

      if (!partnerOutlets || partnerOutlets.length === 0) {
        // Mitra ini belum memiliki outlet -> pasti belum memiliki pesanan
        return [];
      }

      outletIds = partnerOutlets.map((o: any) => o.id);
    }

    let query = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        outlet_id,
        service_date,
        status,
        handover_method,
        payment_method,
        payment_status,
        subtotal_estimate,
        final_service_amount,
        notes,
        created_at,
        order_items (
          id,
          service_name_snapshot,
          unit_price_snapshot,
          quantity,
          unit,
          line_total
        ),
        profiles:customer_id (
          id,
          full_name,
          phone
        ),
        laundry_outlets:outlet_id (
          id,
          name
        ),
        reviews (
          id,
          rating,
          comment,
          created_at
        ),
        complaints (
          id,
          reason,
          status,
          created_at
        )
      `);

    // Terapkan filter outlet jika partnerId ada
    if (outletIds && outletIds.length > 0) {
      query = query.in("outlet_id", outletIds);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.warn("fetchPartnerOrders query warning:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Ambil customer ID unik untuk memastikan data profil & alamat terambil optimal
    const customerIds = Array.from(
      new Set(data.map((item: any) => item.customer_id).filter(Boolean))
    );

    const profileMap = new Map<string, { full_name: string; phone: string }>();
    const addressMap = new Map<string, string>();

    if (customerIds.length > 0) {
      try {
        const { data: profRows } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", customerIds);
        if (profRows) {
          profRows.forEach((p: any) => profileMap.set(p.id, p));
        }
      } catch (e) {
        console.warn("fetchPartnerOrders fallback profiles:", e);
      }

      try {
        const { data: addrRows } = await supabase
          .from("addresses")
          .select("user_id, label, address_text, is_default")
          .in("user_id", customerIds);
        if (addrRows && addrRows.length > 0) {
          for (const addr of addrRows) {
            const formatted = addr.label
              ? `${addr.address_text} (${addr.label})`
              : addr.address_text;
            if (!addressMap.has(addr.user_id) || addr.is_default) {
              addressMap.set(addr.user_id, formatted);
            }
          }
        }
      } catch (e) {
        console.warn("fetchPartnerOrders fallback addresses:", e);
      }
    }

    return data.map((item: any) => {
      const customer = Array.isArray(item.profiles)
        ? item.profiles[0]
        : item.profiles;
      const outlet = Array.isArray(item.laundry_outlets)
        ? item.laundry_outlets[0]
        : item.laundry_outlets;

      const profFallback = profileMap.get(item.customer_id);
      const customerName =
        customer?.full_name || profFallback?.full_name || "Pelanggan MyLaundry";
      const customerPhone = customer?.phone || profFallback?.phone || "-";

      // Ekstraksi alamat dari catatan jika disertakan saat pemesanan
      let addressFromNotes: string | null = null;
      if (item.notes) {
        const match = item.notes.match(/\[Alamat:\s*([^\]]+)\]/i);
        if (match) addressFromNotes = match[1].trim();
      }

      const customerAddress =
        addressFromNotes ||
        addressMap.get(item.customer_id) ||
        (item.handover_method === "drop_off"
          ? "Drop-off langsung ke outlet"
          : "Alamat belum diatur pelanggan");

      const rawReview = Array.isArray(item.reviews)
        ? item.reviews[0]
        : item.reviews;

      const review =
        rawReview && rawReview.rating
          ? {
              id: rawReview.id,
              rating: Number(rawReview.rating),
              comment: rawReview.comment || null,
              created_at: rawReview.created_at,
            }
          : null;

      const rawComplaint = Array.isArray(item.complaints)
        ? item.complaints[0]
        : item.complaints;

      const complaint =
        rawComplaint && rawComplaint.reason
          ? {
              id: rawComplaint.id,
              reason: rawComplaint.reason,
              status: (rawComplaint.status === "resolved" ? "resolved" : "open") as "open" | "resolved",
              created_at: rawComplaint.created_at,
            }
          : null;

      return {
        id: item.id,
        order_number: item.order_number,
        customer_id: item.customer_id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        outlet_id: item.outlet_id,
        outlet_name: outlet?.name || "Bersih Laundry Setiabudi",
        service_date: item.service_date,
        status: item.status as OrderStatus,
        handover_method: item.handover_method,
        payment_method: item.payment_method,
        payment_status: item.payment_status,
        subtotal_estimate: Number(item.subtotal_estimate),
        final_service_amount: item.final_service_amount
          ? Number(item.final_service_amount)
          : null,
        created_at: item.created_at,
        notes: item.notes || null,
        review,
        complaint,
        items: (item.order_items || []).map((o: any) => ({
          id: o.id,
          service_name_snapshot: o.service_name_snapshot,
          unit_price_snapshot: Number(o.unit_price_snapshot),
          quantity: Number(o.quantity),
          unit: o.unit,
          line_total: Number(o.line_total),
        })),
      };
    });
  } catch (err: any) {
    console.error("fetchPartnerOrders exception:", err);
    return [];
  }
}

export async function fetchPartnerComplaints(): Promise<
  {
    id: string;
    orderId: string;
    orderNumber: string;
    customer: string;
    reason: string;
    status: "open" | "resolved";
    date: string;
  }[]
> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("complaints")
      .select(`
        id,
        order_id,
        reason,
        status,
        created_at,
        resolved_at,
        orders (
          order_number,
          profiles:customer_id ( full_name )
        )
      `)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((c: any) => {
      const order = Array.isArray(c.orders) ? c.orders[0] : c.orders;
      const profile = Array.isArray(order?.profiles)
        ? order.profiles[0]
        : order?.profiles;

      return {
        id: c.id,
        orderId: c.order_id,
        orderNumber: order?.order_number || "#ML-PESANAN",
        customer: profile?.full_name || "Pelanggan MyLaundry",
        reason: c.reason,
        status: (c.status === "resolved" ? "resolved" : "open") as
          | "open"
          | "resolved",
        date: new Date(c.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
  } catch (e) {
    console.error("fetchPartnerComplaints err:", e);
    return [];
  }
}

export async function resolvePartnerComplaint(
  complaintId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from("complaints")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", complaintId);
    return !error;
  } catch {
    return false;
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
      updates.payment_status = "paid";
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (updateError) {
      console.error("updateOrderStatus error:", updateError);
      return { success: false, error: updateError.message };
    }

    // Catat histori perubahan status
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      old_status: null,
      new_status: newStatus,
      changed_by: user?.id || null,
      note: note || `Status diperbarui menjadi: ${newStatus}`,
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memperbarui status" };
  }
}

export async function updateOrderActualWeight(
  orderId: string,
  actualKg: number,
  unitPrice: number,
  note?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const finalAmount = Math.round(actualKg * unitPrice);

    // 1. Update order item quantity & line total
    const { data: items } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .limit(1);

    if (items && items.length > 0) {
      await supabase
        .from("order_items")
        .update({
          quantity: actualKg,
          line_total: finalAmount,
        })
        .eq("id", items[0].id);
    }

    // 2. Update status order menjadi 'processing' dan set final_service_amount
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        final_service_amount: finalAmount,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderError) {
      return { success: false, error: orderError.message };
    }

    // 3. Catat di order_status_history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      new_status: "processing",
      changed_by: user?.id || null,
      note:
        note ||
        `Timbangan aktual dikonfirmasi mitra: ${actualKg} kg (Total: Rp${finalAmount.toLocaleString(
          "id-ID"
        )}). Laundry mulai diproses.`,
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menyimpan berat aktual" };
  }
}

export function subscribeToOrders(onUpdate: () => void) {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel("partner_orders_realtime")
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

export async function claimDefaultOutletIfUnowned(partnerId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    // Cek apakah mitra sudah punya outlet
    const { data: ownOutlets } = await supabase
      .from("laundry_outlets")
      .select("id")
      .eq("owner_id", partnerId)
      .limit(1);

    if (ownOutlets && ownOutlets.length > 0) return;

    // Jika belum punya, klaim outlet default utama jika belum berpemilik
    await supabase
      .from("laundry_outlets")
      .update({ owner_id: partnerId })
      .eq("id", "a0000000-0000-0000-0000-000000000001")
      .is("owner_id", null);
  } catch {
    // Abaikan jika permission RLS membatasi sebelum patch dijalankan
  }
}

// -------------------------------------------------------
// IK301: QUERY ANALITIK DATABASE (JOIN & AGREGASI)
// -------------------------------------------------------

export interface PartnerAnalyticsReport {
  outlet_id: string;
  outlet_name: string;
  service_area: string;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  processing_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  avg_order_value: number;
  avg_rating: number;
  total_reviews: number;
}

export async function fetchPartnerDatabaseAnalytics(
  outletId?: string
): Promise<PartnerAnalyticsReport | null> {
  if (!isSupabaseConfigured) return null;

  try {
    let query = supabase.from("v_partner_analytics").select("*");
    if (outletId) {
      query = query.eq("outlet_id", outletId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn("fetchPartnerDatabaseAnalytics warning:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("fetchPartnerDatabaseAnalytics error:", err);
    return null;
  }
}

export async function fetchServiceSalesReport(outletId?: string) {
  if (!isSupabaseConfigured) return [];

  try {
    let query = supabase.from("v_service_sales_report").select("*");
    if (outletId) {
      query = query.eq("outlet_id", outletId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("fetchServiceSalesReport warning:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("fetchServiceSalesReport error:", err);
    return [];
  }
}


