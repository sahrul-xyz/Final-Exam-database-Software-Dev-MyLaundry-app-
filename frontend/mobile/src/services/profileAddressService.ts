import { supabase } from "./supabase";

export type ProfileAddress = {
  id?: string;
  label: string;
  address_text: string;
  is_default: boolean;
};

async function checkCurrentUser(userId: string) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || data.user.id !== userId) {
    throw new Error("Sesi login tidak valid. Silakan login kembali.");
  }
}

// Ambil daftar alamat milik akun yang sedang login.
export async function getProfileAddresses(
  userId: string
): Promise<ProfileAddress[]> {
  await checkCurrentUser(userId);

  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, address_text, is_default")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil alamat: ${error.message}`);
  }

  const addresses: ProfileAddress[] = (data || []).map((address) => ({
    id: address.id,
    label: address.label,
    address_text: address.address_text,
    is_default: address.is_default === true,
  }));

  return addresses;
}

// Simpan seluruh daftar alamat dalam satu transaksi database.
export async function saveProfileAddresses(
  userId: string,
  addresses: ProfileAddress[]
): Promise<void> {
  if (addresses.length > 10) {
    throw new Error("Maksimal 10 alamat.");
  }

  const cleanedAddresses = addresses.map((address) => ({
    id: address.id || null,
    label: address.label.trim(),
    address_text: address.address_text.trim(),
    is_default: address.is_default === true,
  }));

  for (const address of cleanedAddresses) {
    if (!address.label || address.label.length > 40) {
      throw new Error(
        "Isi label setiap alamat, maksimal 40 karakter. Contoh: Rumah."
      );
    }

    if (
      address.address_text.length < 5 ||
      address.address_text.length > 500
    ) {
      throw new Error("Alamat lengkap harus berisi 5–500 karakter.");
    }
  }

  const defaultCount = cleanedAddresses.filter(
    (address) => address.is_default
  ).length;

  if (cleanedAddresses.length > 0 && defaultCount !== 1) {
    throw new Error("Pilih tepat satu alamat utama.");
  }

  const ids = cleanedAddresses
    .map((address) => address.id)
    .filter((id): id is string => id !== null);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Ada alamat duplikat. Muat ulang daftar alamat.");
  }

  await checkCurrentUser(userId);

  const { error } = await supabase.rpc("save_customer_addresses", {
    p_addresses: cleanedAddresses,
  });

  if (error) {
    throw new Error(
      `Penyimpanan alamat belum berhasil dikonfirmasi: ${error.message}`
    );
  }
}