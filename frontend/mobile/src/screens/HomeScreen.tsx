import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Header } from "../components/Header";
import { OutletCard } from "../components/OutletCard";
import { getLiveOutlets, fallbackOutlets } from "../services/supabase";
import { Outlet } from "../types";

export function HomeScreen({
  onSelectOutlet,
  onOpenNotifications,
}: {
  onSelectOutlet?: (outlet: Outlet) => void;
  onOpenNotifications?: () => void;
}) {
  const [outlets, setOutlets] = useState<Outlet[]>(fallbackOutlets);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setRefreshing(true);
    const data = await getLiveOutlets();
    setOutlets(data);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOutlets = outlets.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} />
      }
    >
      <Header onNotificationPress={onOpenNotifications} />

      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>Selamat pagi,</Text>
        <Text style={styles.headline}>
          Laundry bersih,{"\n"}tanpa bikin repot.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari outlet atau area..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.quickServices}>
        <TouchableOpacity style={styles.serviceButton} activeOpacity={0.8}>
          <View style={[styles.serviceIconWrap, { backgroundColor: "#e4f2ff" }]}>
            <Text style={[styles.serviceEmoji, { color: "#075ecf" }]}>👕</Text>
          </View>
          <Text style={styles.serviceName}>Cuci Kiloan</Text>
          <Text style={styles.serviceSub}>Mulai Rp7rb</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceButton} activeOpacity={0.8}>
          <View style={[styles.serviceIconWrap, { backgroundColor: "#fff4dc" }]}>
            <Text style={[styles.serviceEmoji, { color: "#d98208" }]}>⚡</Text>
          </View>
          <Text style={styles.serviceName}>Express</Text>
          <Text style={styles.serviceSub}>Selesai cepat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceButton} activeOpacity={0.8}>
          <View style={[styles.serviceIconWrap, { backgroundColor: "#e6f7ef" }]}>
            <Text style={[styles.serviceEmoji, { color: "#169b62" }]}>🏷️</Text>
          </View>
          <Text style={styles.serviceName}>Satuan</Text>
          <Text style={styles.serviceSub}>Per item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>DI SEKITARMU</Text>
          <Text style={styles.sectionTitle}>Outlet pilihan</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.seeMapText}>Lihat peta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.outletList}>
        {filteredOutlets.map((outlet) => (
          <OutletCard
            key={outlet.id}
            outlet={outlet}
            onPress={() => onSelectOutlet && onSelectOutlet(outlet)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf7ff",
  },
  content: {
    paddingBottom: 40,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginTop: 5,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  headline: {
    fontSize: 26,
    fontWeight: "800",
    color: "#09234d",
    lineHeight: 32,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4eaf1",
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#09234d",
  },
  quickServices: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginVertical: 18,
    gap: 10,
  },
  serviceButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4eaf1",
    paddingVertical: 12,
    alignItems: "center",
    elevation: 1,
  },
  serviceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  serviceEmoji: {
    fontSize: 18,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#09234d",
  },
  serviceSub: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#09234d",
    marginTop: 2,
  },
  seeMapText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0878f9",
  },
  outletList: {
    paddingHorizontal: 20,
  },
});