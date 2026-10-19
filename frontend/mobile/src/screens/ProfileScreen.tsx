import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export function ProfileScreen({
  user,
  onLogout,
}: {
  user?: { fullName: string; email: string };
  onLogout?: () => void;
}) {
  const name = user?.fullName || "Alya Putri";
  const email = user?.email || "alya.putri@email.com";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AKUN SAYA</Text>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Akun terverifikasi</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>PENGATURAN AKUN</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>👤</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuTitle}>Data diri</Text>
            <Text style={styles.menuSub}>Nama, email, dan nomor telepon</Text>
          </View>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>📍</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuTitle}>Alamat tersimpan</Text>
            <Text style={styles.menuSub}>2 alamat pengantaran</Text>
          </View>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
          <Text style={styles.menuIcon}>💳</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuTitle}>Metode pembayaran</Text>
            <Text style={styles.menuSub}>GoPay terhubung</Text>
          </View>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addressCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.addressEyebrow}>ALAMAT UTAMA</Text>
          <Text style={styles.addressTitle}>Rumah</Text>
          <Text style={styles.addressDesc}>
            Jl. Sersan Bajuri No. 48, Setiabudi{"\n"}Bandung, Jawa Barat 40154
          </Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.editBtn}>Ubah</Text>
        </TouchableOpacity>
      </View>

      {onLogout && (
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
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
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#09234d",
  },
  userEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 6,
  },
  verifiedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f7ef",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#169b62",
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
  menuIcon: {
    fontSize: 18,
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
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
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
  addressTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#09234d",
    marginTop: 2,
  },
  addressDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 16,
  },
  editBtn: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0878f9",
    marginLeft: 10,
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
