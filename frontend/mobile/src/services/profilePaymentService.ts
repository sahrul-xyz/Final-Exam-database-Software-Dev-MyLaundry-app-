import { supabase } from "./supabase";
import { PaymentMethod } from "../types";

async function checkCurrentUser(userId: string) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || data.user.id !== userId) {
    throw new Error("Sesi login tidak valid. Silakan login kembali.");
  }
}

// Ambil metode pembayaran favorit yang sudah tersimpan.
export async function getPreferredPayment(
  userId: string
): Promise<PaymentMethod> {
  await checkCurrentUser(userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_payment")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(
      `Gagal mengambil metode pembayaran: ${error.message}`
    );
  }

  const payment = data.preferred_payment;

  if (payment !== "cash" && payment !== "digital") {
    throw new Error("Metode pembayaran tersimpan tidak valid.");
  }

  return payment;
}

// Simpan metode pembayaran favorit ke akun pengguna.
export async function savePreferredPayment(
  userId: string,
  payment: PaymentMethod
): Promise<PaymentMethod> {
  if (payment !== "cash" && payment !== "digital") {
    throw new Error("Pilih Tunai atau Digital/QRIS.");
  }

  await checkCurrentUser(userId);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      preferred_payment: payment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("preferred_payment")
    .single();

  if (error) {
    throw new Error(
      `Penyimpanan metode pembayaran belum dapat dikonfirmasi: ${error.message}`
    );
  }

  const savedPayment = data.preferred_payment;

  if (savedPayment !== "cash" && savedPayment !== "digital") {
    throw new Error(
      "Hasil penyimpanan tidak valid. Buka ulang halaman Profil."
    );
  }

  return savedPayment;
}