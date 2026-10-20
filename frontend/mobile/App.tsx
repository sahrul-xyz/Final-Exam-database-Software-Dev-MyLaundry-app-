import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { HomeScreen } from "./src/screens/HomeScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { OrderModal } from "./src/components/OrderModal";
import {
  Outlet,
  TabName,
  UserProfile,
  ServiceCategory,
} from "./src/types";
import { getCurrentCustomer, signOutCustomer } from "./src/services/supabase";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("beranda");
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    ServiceCategory | undefined
  >(undefined);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

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
        {activeTab === "beranda" && (
          <HomeScreen
            onSelectOutlet={(outlet, category) => {
              setSelectedOutlet(outlet);
              setSelectedCategory(category);
              setOrderModalVisible(true);
            }}
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
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("beranda")}
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
          onPress={() => setActiveTab("pesanan")}
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
          onPress={() => setActiveTab("profil")}
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
        initialCategory={selectedCategory}
        customerId={currentUser.id}
        onClose={() => {
          setOrderModalVisible(false);
          setSelectedCategory(undefined);
        }}
        onOrderSuccess={() => {
          setOrderModalVisible(false);
          setSelectedCategory(undefined);
          setActiveTab("pesanan");
        }}
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
});
