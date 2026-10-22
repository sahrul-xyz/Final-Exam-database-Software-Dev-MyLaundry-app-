import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { UserProfile } from "../types";
import {
  checkSupabaseConnection,
  signInCustomer,
  signUpCustomer,
} from "../services/supabase";
import { BrandMark } from "../components/Brand";

export function AuthScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: UserProfile) => void;
}) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    checkSupabaseConnection().then((reachable) => setDemoMode(!reachable));
  }, []);

  const handleSubmit = async () => {
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Mohon isi email dan kata sandi.");
      return;
    }

    if (isRegister && !fullName) {
      setErrorMsg("Mohon masukkan nama lengkap.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const { user, error } = await signUpCustomer({
          email,
          password,
          fullName,
          phone,
        });

        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onLoginSuccess(user);
        }
      } else {
        const { user, error } = await signInCustomer({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onLoginSuccess(user);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandContainer}>
          <BrandMark size={68} style={styles.brandLogo} />
          <Text style={styles.brandTitle}>
            <Text style={styles.brandHighlight}>My</Text>Laundry
          </Text>
          <Text style={styles.brandSubtitle}>
            {isRegister
              ? "Daftar akun untuk mulai pesan laundry antar-jemput"
              : "Masuk ke akun pelanggan MyLaundry"}
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, !isRegister && styles.tabButtonActive]}
            onPress={() => {
              setIsRegister(false);
              setErrorMsg("");
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>
              Masuk
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, isRegister && styles.tabButtonActive]}
            onPress={() => {
              setIsRegister(true);
              setErrorMsg("");
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>
              Daftar Baru
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error message */}
        {errorMsg !== "" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {demoMode && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Mode demo aktif: Supabase belum terhubung (API key belum diisi atau
              tidak valid). Daftar outlet & peta memakai data contoh, login tetap
              bisa dilakukan untuk demo.
            </Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.formCard}>
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Alya Putri"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          )}

          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor WhatsApp / HP</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: 081234567890"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="nama@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kata Sandi</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isRegister ? "Buat Akun Pelanggan" : "Masuk Sekarang"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsRegister(!isRegister);
              setErrorMsg("");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              {isRegister
                ? "Sudah punya akun? Masuk"
                : "Belum punya akun? Daftar gratis"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Mitra Laundry? Kelola outlet Anda melalui Web Dashboard Mitra.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf7ff",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  brandLogo: {
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#09234d",
    letterSpacing: -0.5,
  },
  brandHighlight: {
    color: "#0878f9",
  },
  brandSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#e2ecf7",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#09234d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#075ecf",
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  noticeBox: {
    backgroundColor: "#eaf4ff",
    borderWidth: 1,
    borderColor: "#cfe6fb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    color: "#0b4f8f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e2ecf7",
    shadowColor: "#09234d",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#09234d",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 13,
    color: "#10213d",
  },
  submitButton: {
    backgroundColor: "#0878f9",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0878f9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  switchButton: {
    marginTop: 18,
    alignItems: "center",
  },
  switchText: {
    fontSize: 12,
    color: "#0878f9",
    fontWeight: "600",
  },
  footerNote: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 11,
    color: "#8393a8",
    lineHeight: 16,
  },
});
