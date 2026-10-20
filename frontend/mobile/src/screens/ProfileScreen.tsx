import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { UserProfile } from "../types";
import { savePersonalData } from "../services/profileService";
import {
  getProfilePhoto,
  uploadProfilePhoto,
  removeProfilePhoto,
} from "../services/profilePhotoService";

type ProfileScreenProps = {
  user: UserProfile;
  onLogout?: () => void;
  onSaved?: (user: UserProfile) => void;
};

type PhotoDraft =
  | { action: "upload"; base64: string; uri: string }
  | { action: "remove" }
  | null;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Periksa koneksi internet lalu coba lagi.";
}

export function ProfileScreen({
  user,
  onLogout,
  onSaved,
}: ProfileScreenProps) {
  const [savedUser, setSavedUser] = useState<UserProfile>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [photoError, setPhotoError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [photoReload, setPhotoReload] = useState(0);

  const [saving, setSaving] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const operationRef = useRef(false);

  const busy = saving || savingPhoto || pickingPhoto;

  // Ambil foto tersimpan setiap halaman profil dibuka.
  useEffect(() => {
    let active = true;

    setLoadingPhoto(true);
    setPhotoError("");
    setImageFailed(false);

    getProfilePhoto(user.id)
      .then((result) => {
        if (!active) return;

        setPhotoUrl(result.url);
        setPhotoPath(result.path);
      })
      .catch((error) => {
        if (!active) return;
        setPhotoError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingPhoto(false);
      });

    return () => {
      active = false;
    };
  }, [user.id, photoReload]);

  const initials =
    savedUser.fullName
      .trim()
      .split(/\s+/)
      .map((name) => Array.from(name)[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const hasChanges =
    fullName.trim() !== savedUser.fullName ||
    email.trim() !== savedUser.email ||
    phone.trim() !== (savedUser.phone || "");

  const displayedPhoto =
    photoDraft?.action === "upload"
      ? photoDraft.uri
      : photoDraft?.action === "remove"
        ? null
        : photoUrl;

  const canRemovePhoto =
    photoDraft?.action === "upload" ||
    (photoDraft?.action !== "remove" && !!photoPath);

  const openEditor = () => {
    setFullName(savedUser.fullName);
    setEmail(savedUser.email);
    setPhone(savedUser.phone || "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    const discard = () => {
      setFullName(savedUser.fullName);
      setEmail(savedUser.email);
      setPhone(savedUser.phone || "");
      setIsEditing(false);
    };

    if (hasChanges) {
      Alert.alert(
        "Batalkan perubahan?",
        "Perubahan data diri yang belum disimpan akan dibuang.",
        [
          { text: "Lanjut edit", style: "cancel" },
          {
            text: "Buang perubahan",
            style: "destructive",
            onPress: discard,
          },
        ]
      );
      return;
    }

    discard();
  };

  const handleSave = async () => {
    if (operationRef.current) return;

    operationRef.current = true;
    setSaving(true);

    try {
      const result = await savePersonalData(savedUser, {
        fullName,
        email,
        phone,
      });

      setSavedUser(result.user);
      setFullName(result.user.fullName);
      setEmail(result.user.email);
      setPhone(result.user.phone || "");

      onSaved?.(result.user);
      setIsEditing(false);

      Alert.alert("Hasil penyimpanan", result.message);
    } catch (error) {
      Alert.alert("Belum berhasil menyimpan", errorMessage(error));
    } finally {
      operationRef.current = false;
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    if (operationRef.current) return;

    operationRef.current = true;
    setPickingPhoto(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset?.base64) {
        throw new Error("Foto tidak terbaca. Silakan pilih foto lain.");
      }

      if (asset.base64.length * 0.75 > 5 * 1024 * 1024) {
        throw new Error("Foto maksimal 5 MB. Pilih foto lebih kecil.");
      }

      setPhotoDraft({
        action: "upload",
        base64: asset.base64,
        uri: asset.uri,
      });

      setImageFailed(false);
    } catch (error) {
      Alert.alert("Foto belum dipilih", errorMessage(error));
    } finally {
      operationRef.current = false;
      setPickingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    if (busy || loadingPhoto || photoError) return;

    Alert.alert(
      "Foto profil",
      "Pilih tindakan. Perubahan diterapkan setelah disimpan.",
      [
        {
          text: "Pilih dari galeri",
          onPress: () => void pickPhoto(),
        },
        ...(canRemovePhoto
          ? [
              {
                text: "Hapus foto",
                style: "destructive" as const,
                onPress: () => {
                  setPhotoDraft({ action: "remove" });
                  setImageFailed(false);
                },
              },
            ]
          : []),
        { text: "Batal", style: "cancel" },
      ]
    );
  };

  const handleSavePhoto = async () => {
    if (!photoDraft || operationRef.current) return;

    operationRef.current = true;
    setSavingPhoto(true);

    try {
      if (photoDraft.action === "upload") {
        const result = await uploadProfilePhoto(
          savedUser.id,
          photoDraft.base64
        );

        setPhotoUrl(result.url);
        setPhotoPath(result.path);
      } else {
        await removeProfilePhoto(savedUser.id);

        setPhotoUrl(null);
        setPhotoPath(null);
      }

      setPhotoDraft(null);
      setImageFailed(false);

      Alert.alert("Berhasil", "Perubahan foto profil berhasil disimpan.");
    } catch (error) {
      Alert.alert(
        "Foto belum berhasil disimpan",
        errorMessage(error)
      );
    } finally {
      operationRef.current = false;
      setSavingPhoto(false);
    }
  };

  const cancelPhoto = () => {
    setPhotoDraft(null);
    setImageFailed(false);
  };

  const handleLogout = () => {
    if (operationRef.current) return;

    if ((isEditing && hasChanges) || photoDraft) {
      Alert.alert(
        "Perubahan belum disimpan",
        "Tetap keluar dan buang perubahan?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Keluar",
            style: "destructive",
            onPress: onLogout,
          },
        ]
      );
      return;
    }

    onLogout?.();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>AKUN SAYA</Text>
          <Text style={styles.title}>Profil</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity
            onPress={showPhotoOptions}
            disabled={busy || loadingPhoto || !!photoError}
            accessibilityRole="button"
            accessibilityLabel="Ubah foto profil"
          >
            <View style={styles.avatar}>
              {loadingPhoto || pickingPhoto ? (
                <ActivityIndicator color="#ffffff" />
              ) : displayedPhoto && !imageFailed ? (
                <Image
                  source={{ uri: displayedPhoto }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>

            <Text style={styles.changePhotoText}>Ubah foto</Text>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{savedUser.fullName}</Text>
            <Text style={styles.userEmail}>{savedUser.email}</Text>
            <Text style={styles.userPhone}>
              {savedUser.phone || "Nomor telepon belum diisi"}
            </Text>
          </View>
        </View>

        {!!photoError && (
          <View style={styles.noticeCard}>
            <Text style={styles.errorText}>{photoError}</Text>

            <TouchableOpacity
              style={styles.smallButton}
              disabled={busy || loadingPhoto}
              onPress={() => setPhotoReload((value) => value + 1)}
            >
              <Text style={styles.linkText}>Coba muat foto lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        {imageFailed && (
          <Text style={styles.helpText}>
            Gambar belum bisa ditampilkan. Coba buka ulang tab Profil.
          </Text>
        )}

        {photoDraft && (
          <View style={styles.photoEditor}>
            <Text style={styles.formTitle}>Perubahan foto</Text>

            <Text style={styles.helpText}>
              {photoDraft.action === "upload"
                ? "Foto baru sudah dipilih. Simpan untuk menerapkannya ke akun."
                : "Foto akan dihapus dari profil dan diganti dengan inisial nama."}
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                busy && styles.disabledButton,
              ]}
              onPress={handleSavePhoto}
              disabled={busy}
            >
              {savingPhoto && (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
              )}

              <Text style={styles.saveText}>
                {savingPhoto
                  ? "Menyimpan foto..."
                  : "Simpan perubahan foto"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelPhoto}
              disabled={busy}
            >
              <Text style={styles.cancelText}>Batal ubah foto</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>PENGATURAN AKUN</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={isEditing ? cancelEditing : openEditor}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ expanded: isEditing }}
          >
            <Text style={styles.menuIcon}>👤</Text>

            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Data diri</Text>
              <Text style={styles.menuSub}>
                Nama, email, dan nomor telepon
              </Text>
            </View>

            <Text style={styles.menuChevron}>
              {isEditing ? "⌄" : "›"}
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Edit data diri</Text>

              <Text style={styles.label}>Nama lengkap</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#94a3b8"
                maxLength={100}
                autoCapitalize="words"
                editable={!busy}
                accessibilityLabel="Nama lengkap"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                editable={!busy}
                accessibilityLabel="Email"
              />

              <Text style={styles.helpText}>
                Jika email diubah, Anda mungkin perlu melakukan konfirmasi
                melalui email lama dan baru.
              </Text>

              <Text style={styles.label}>Nomor telepon</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={20}
                editable={!busy}
                accessibilityLabel="Nomor telepon"
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (busy || !hasChanges) && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={busy || !hasChanges}
                accessibilityRole="button"
              >
                {saving && (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                    style={{ marginRight: 8 }}
                  />
                )}

                <Text style={styles.saveText}>
                  {saving ? "Menyimpan..." : "Simpan perubahan"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelEditing}
                disabled={busy}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>📍</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Alamat tersimpan</Text>
              <Text style={styles.menuSub}>
                Pengaturan alamat belum diaktifkan
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </View>

          <View style={[styles.menuItem, styles.lastMenuItem]}>
            <Text style={styles.menuIcon}>💳</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Metode pembayaran</Text>
              <Text style={styles.menuSub}>
                Pengaturan pembayaran belum diaktifkan
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </View>
        </View>

        <View style={styles.addressCard}>
          <Text style={styles.addressEyebrow}>ALAMAT UTAMA</Text>
          <Text style={styles.addressDesc}>
            Pengaturan alamat utama akan tersedia pada tahap berikutnya.
          </Text>
        </View>

        {(photoDraft || (isEditing && hasChanges)) && (
          <Text style={styles.unsavedText}>
            Simpan perubahan sebelum berpindah tab.
          </Text>
        )}

        {onLogout && (
          <TouchableOpacity
            style={[
              styles.logoutButton,
              busy && styles.disabledButton,
            ]}
            onPress={handleLogout}
            disabled={busy}
          >
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf7ff",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#09234d",
    marginTop: 2,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4eaf1",
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#0878f9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0878f9",
    textAlign: "center",
    marginTop: 8,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#09234d",
  },
  userEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  userPhone: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  noticeCard: {
    padding: 14,
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#9a3412",
    fontSize: 12,
    lineHeight: 18,
  },
  smallButton: {
    paddingVertical: 12,
  },
  linkText: {
    color: "#0878f9",
    fontWeight: "700",
    fontSize: 12,
  },
  photoEditor: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cfe7ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4eaf1",
    overflow: "hidden",
    marginBottom: 18,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#09234d",
  },
  menuSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 20,
    color: "#94a3b8",
    marginLeft: 8,
  },
  form: {
    padding: 16,
    backgroundColor: "#f8fbff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4eaf1",
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#09234d",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#09234d",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#09234d",
  },
  helpText: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 17,
    marginTop: 8,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0878f9",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
  },
  saveText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  addressCard: {
    backgroundColor: "#f1f8ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfe7ff",
    padding: 16,
    marginBottom: 20,
  },
  addressEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.6,
  },
  addressDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 6,
    lineHeight: 17,
  },
  unsavedText: {
    fontSize: 11,
    color: "#b45309",
    marginBottom: 14,
  },
  logoutButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "700",
  },
});