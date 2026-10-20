import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
} from "react-native";
import { HomeScreen } from "./src/screens/HomeScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { NotificationHistoryScreen } from "./src/screens/NotificationHistoryScreen";
import { OrderModal } from "./src/components/OrderModal";
import { OrderNotifBanner } from "./src/components/OrderNotifBanner";
import { Outlet, TabName, UserProfile } from "./src/types";
import { getCurrentCustomer, signOutCustomer } from "./src/services/supabase";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("beranda");
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const goTab = (tab: TabName) => {
    setShowNotifications(false);
    setActiveTab(tab);
  };

  useEffect(() => {
    getCurrentCustomer().then((user) => {
      if (user) {
        setCurrentUser(user);
      }
      setLoadingSession(false);
    });
  }, []);

  const handleLogout = async () => {
    await signOutCustomer();
    setShowNotifications(false);
    setCurrentUser(null);
  };

  if (loadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#edf7ff" />
        <ActivityIndicator size="large" color="#0878f9" />
        <Text style={styles.loadingText}>Memuat MyLaundry...</Text>
      </View>
    );
  }

  // Jika belum login, tampilkan layar Auth (Masuk / Daftar)
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#edf7ff" />
        <AuthScreen onLoginSuccess={(user) => setCurrentUser(user)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#edf7ff" />

      <View style={styles.screenContainer}>
        {showNotifications ? (
          <NotificationHistoryScreen
            customerId={currentUser.id}
            onBack={() => setShowNotifications(false)}
          />
        ) : (
          <>
            {activeTab === "beranda" && (
              <HomeScreen
                onSelectOutlet={(outlet) => {
                  setSelectedOutlet(outlet);
                  setOrderModalVisible(true);
                }}
                onOpenNotifications={() => setShowNotifications(true)}
              />
            )}
            {activeTab === "pesanan" && (
              <OrdersScreen customerId={currentUser.id} />
            )}
            {activeTab === "profil" && (
              <ProfileScreen
                user={{
                  fullName: currentUser.fullName,
                  email: currentUser.email,
                }}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goTab("beranda")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navEmoji,
              activeTab === "beranda" && styles.navEmojiActive,
            ]}
          >
            🏠
          </Text>
          <Text
            style={[
              styles.navLabel,
              activeTab === "beranda" && styles.navLabelActive,
            ]}
          >
            Beranda
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goTab("pesanan")}
          activeOpacity={0.7}
        >
          <View style={{ position: "relative" }}>
            <Text
              style={[
                styles.navEmoji,
                activeTab === "pesanan" && styles.navEmojiActive,
              ]}
            >
              📋
            </Text>
            <View style={styles.navDot} />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === "pesanan" && styles.navLabelActive,
            ]}
          >
            Pesanan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goTab("profil")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navEmoji,
              activeTab === "profil" && styles.navEmojiActive,
            ]}
          >
            👤
          </Text>
          <Text
            style={[
              styles.navLabel,
              activeTab === "profil" && styles.navLabelActive,
            ]}
          >
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Pemesanan Interaktif */}
      <OrderModal
        visible={orderModalVisible}
        outlet={selectedOutlet}
        customerId={currentUser.id}
        onClose={() => setOrderModalVisible(false)}
        onOrderSuccess={() => {
          setOrderModalVisible(false);
          setActiveTab("pesanan");
        }}
      />

      {/* Banner notif status pesanan (tap = buka Riwayat Notifikasi) */}
      <OrderNotifBanner
        customerId={currentUser.id}
        onOpen={() => setShowNotifications(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf7ff",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#edf7ff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    height: 65,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e4eaf1",
    paddingHorizontal: 20,
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  navEmoji: {
    fontSize: 20,
    opacity: 0.6,
  },
  navEmojiActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
  navLabelActive: {
    color: "#0878f9",
    fontWeight: "700",
  },
  navDot: {
    position: "absolute",
    top: 0,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d64343",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 35, 77, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#09234d",
  },
  modalAddress: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 16,
  },
  serviceBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  serviceBoxTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  serviceItemName: {
    fontSize: 13,
    color: "#09234d",
    fontWeight: "600",
  },
  serviceItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#075ecf",
  },
  orderButton: {
    backgroundColor: "#0878f9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  orderButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  closeButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
});