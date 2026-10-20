import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { UserProfile } from "../types";
import { savePersonalData } from "../services/profileService";

type ProfileScreenProps = {
  user: UserProfile;
  onLogout?: () => void;
  onSaved?: (user: UserProfile) => void;
};

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
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

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
    if (savingRef.current) return;

    savingRef.current = true;
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
      Alert.alert(
        "Belum berhasil menyimpan",
        error instanceof Error
          ? error.message
          : "Periksa koneksi internet lalu coba lagi."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (savingRef.current) return;

    if (isEditing && hasChanges) {
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{savedUser.fullName}</Text>
            <Text style={styles.userEmail}>{savedUser.email}</Text>
            <Text style={styles.userPhone}>
              {savedUser.phone || "Nomor telepon belum diisi"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>PENGATURAN AKUN</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={isEditing ? cancelEditing : openEditor}
            disabled={saving}
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
                editable={!saving}
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
                editable={!saving}
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
                editable={!saving}
                accessibilityLabel="Nomor telepon"
              />

              <Text style={styles.helpText}>
                Simpan perubahan sebelum berpindah tab.
              </Text>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (saving || !hasChanges) && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={saving || !hasChanges}
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
                disabled={saving}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Fitur alamat akan diaktifkan pada tahap berikutnya. */}
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

          {/* Fitur pembayaran akan diaktifkan pada tahap berikutnya. */}
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

        {onLogout && (
          <TouchableOpacity
            style={[
              styles.logoutButton,
              saving && styles.disabledButton,
            ]}
            onPress={handleLogout}
            disabled={saving}
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
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0878f9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
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