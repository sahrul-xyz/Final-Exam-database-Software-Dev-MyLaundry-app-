import { supabase } from "./supabase";
import { UserProfile } from "../types";

type ProfileInput = {
  fullName: string;
  email: string;
  phone: string;
};

export async function savePersonalData(
  currentUser: UserProfile,
  input: ProfileInput
): Promise<{ user: UserProfile; message: string }> {
  const fullName = input.fullName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();

  // Validasi sebelum menyimpan.
  if (!fullName || fullName.length > 100) {
    throw new Error("Nama wajib diisi, maksimal 100 karakter.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Masukkan alamat email yang valid.");
  }

  if (phone && !/^\+?[0-9 ()-]{8,20}$/.test(phone)) {
    throw new Error("Masukkan nomor telepon yang valid.");
  }

  // Pastikan akun yang sedang login sesuai.
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user || authData.user.id !== currentUser.id) {
    throw new Error("Sesi login tidak valid. Silakan login kembali.");
  }

  // Simpan nama dan nomor telepon ke tabel profiles.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authData.user.id)
    .select("id, full_name, phone")
    .single();

  if (profileError) {
    throw new Error(
      `Data diri belum tersimpan: ${profileError.message}`
    );
  }

  const updatedUser: UserProfile = {
    ...currentUser,
    fullName: profile.full_name,
    phone: profile.phone || "",
    email: authData.user.email || currentUser.email,
  };

  let message = "Nama dan nomor telepon berhasil disimpan.";

  // Email login dikelola oleh Supabase Auth.
  if (email.toLowerCase() !== updatedUser.email.toLowerCase()) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email,
      });

      if (error) {
        throw new Error(error.message);
      }

      updatedUser.email = data.user?.email || updatedUser.email;

      if (updatedUser.email.toLowerCase() === email.toLowerCase()) {
        message += "\nEmail berhasil diperbarui.";
      } else {
        message +=
          "\nPermintaan perubahan email sudah dikirim. " +
          "Periksa email lama dan baru untuk konfirmasi. " +
          "Email login tetap yang lama sampai konfirmasi selesai.";
      }
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : "Periksa koneksi internet Anda.";

      // Nama dan telepon sudah tersimpan meskipun perubahan email gagal.
      message +=
        `\nNamun email belum berhasil diubah: ${detail}` +
        "\nSilakan coba perubahan email kembali.";
    }
  }

  return {
    user: updatedUser,
    message,
  };
}