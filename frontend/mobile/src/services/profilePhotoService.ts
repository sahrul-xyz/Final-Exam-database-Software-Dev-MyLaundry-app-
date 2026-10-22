import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

const BUCKET = "customer-avatars";
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

type ProfilePhoto = {
  path: string | null;
  url: string | null;
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

async function getPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) {
    throw new Error(`Foto belum bisa ditampilkan: ${error.message}`);
  }

  return data.signedUrl;
}

// Ambil foto profil yang sudah tersimpan.
export async function getProfilePhoto(
  userId: string
): Promise<ProfilePhoto> {
  await checkCurrentUser(userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Gagal mengambil foto profil: ${error.message}`);
  }

  if (!data.avatar_path) {
    return { path: null, url: null };
  }

  const url = await getPhotoUrl(data.avatar_path);

  return {
    path: data.avatar_path,
    url,
  };
}

// Unggah foto JPEG dari hasil base64 Expo Image Picker.
export async function uploadProfilePhoto(
  userId: string,
  base64: string
): Promise<ProfilePhoto> {
  await checkCurrentUser(userId);

  if (!base64) {
    throw new Error("Foto tidak terbaca. Silakan pilih foto lagi.");
  }

  const photoBytes = decode(base64);

  if (photoBytes.byteLength === 0) {
    throw new Error("File foto kosong.");
  }

  if (photoBytes.byteLength > MAX_PHOTO_SIZE) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  // Nama unik supaya foto lama tidak tertimpa saat upload gagal.
  const uniqueName =
    `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const path = `${userId}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, photoBytes, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah foto: ${uploadError.message}`);
  }

  // Siapkan URL sebelum memperbarui referensi foto di profil.
  const url = await getPhotoUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single();

  if (updateError) {
    // Jangan menghapus upload secara otomatis:
    // jika respons jaringan terputus, update bisa saja sudah tersimpan.
    throw new Error(
      "Penyimpanan foto belum dapat dikonfirmasi. " +
      "Buka ulang halaman Profil untuk memeriksa hasilnya. " +
      updateError.message
    );
  }

  return { path, url };
}

// Lepaskan foto dari profil agar kembali menampilkan inisial.
export async function removeProfilePhoto(
  userId: string
): Promise<void> {
  await checkCurrentUser(userId);

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Penghapusan foto belum dapat dikonfirmasi: ${error.message}`
    );
  }
}