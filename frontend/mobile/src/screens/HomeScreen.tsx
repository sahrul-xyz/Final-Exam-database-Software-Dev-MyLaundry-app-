import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Header } from "../components/Header";
import { OutletCard } from "../components/OutletCard";
import { getLiveOutlets, fallbackOutlets } from "../services/supabase";
import { Outlet, ServiceCategory } from "../types";
import {
  Coordinate,
  formatDistanceKm,
  haversineDistanceKm,
  resolveOutletCoordinates,
} from "../utils/maps";

const QUICK_SERVICES: {
  key: ServiceCategory;
  name: string;
  sub: string;
  emoji: string;
  bg: string;
  color: string;
}[] = [
  {
    key: "kiloan",
    name: "Cuci Kiloan",
    sub: "Mulai Rp7rb",
    emoji: "👕",
    bg: "#e4f2ff",
    color: "#075ecf",
  },
  {
    key: "express",
    name: "Express",
    sub: "Selesai cepat",
    emoji: "⚡",
    bg: "#fff4dc",
    color: "#d98208",
  },
  {
    key: "satuan",
    name: "Satuan",
    sub: "Per item",
    emoji: "🏷️",
    bg: "#e6f7ef",
    color: "#169b62",
  },
];

export function HomeScreen({
  locationName = "Setiabudi, Bandung",
  isLocating = false,
  userLocation = null,
  onRefreshLocation,
  onSelectOutlet,
  onOpenMap,
  onOpenNotifications,
}: {
  locationName?: string;
  isLocating?: boolean;
  userLocation?: Coordinate | null;
  onRefreshLocation?: () => Promise<void> | void;
  onSelectOutlet?: (outlet: Outlet, category?: ServiceCategory) => void;
  onOpenMap?: () => void;
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

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.allSettled([loadData(), onRefreshLocation?.()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hitung jarak dinamis outlet dari koordinat lokasi pengguna saat ini
  const resolvedOutlets = useMemo(() => {
    const mappable = resolveOutletCoordinates(outlets);
    if (!userLocation) {
      return mappable;
    }

    return mappable
      .map((outlet) => {
        const km = haversineDistanceKm(userLocation, {
          latitude: outlet.latitude,
          longitude: outlet.longitude,
        });
        return {
          ...outlet,
          distance: formatDistanceKm(km),
          distanceKm: km,
        };
      })
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [outlets, userLocation]);

  const filteredOutlets = resolvedOutlets.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleLocationPress = () => {
    Alert.alert(
      "Lokasi Saat Ini",
      `Lokasi aktif:\n📍 ${locationName}\n\nPilih tindakan:`,
      [
        {
          text: "🔄 Perbarui GPS",
          onPress: () => onRefreshLocation?.(),
        },
        {
          text: "🗺️ Buka Peta Outlet",
          onPress: () => onOpenMap?.(),
        },
        {
          text: "Batal",
          style: "cancel",
        },
      ]
    );
  };

  // Klik kategori -> langsung buka form pesanan dengan outlet teratas.
  // Outlet bisa diganti di dalam modal lewat tombol "Ganti".
  const handleSelectCategory = (key: ServiceCategory) => {
    const target = filteredOutlets[0] ?? outlets[0];
    if (!target) {
      Alert.alert("Perhatian", "Belum ada outlet yang tersedia.");
      return;
    }
    onSelectOutlet?.(target, key);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefreshAll} />
      }
    >
      <Header
        location={locationName}
        isLocating={isLocating}
        onLocationPress={handleLocationPress}
        onRefreshLocation={onRefreshLocation}
        onNotificationPress={onOpenNotifications}
      />

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
        {QUICK_SERVICES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={styles.serviceButton}
            activeOpacity={0.8}
            onPress={() => handleSelectCategory(s.key)}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: s.bg }]}>
              <Text style={[styles.serviceEmoji, { color: s.color }]}>
                {s.emoji}
              </Text>
            </View>
            <Text style={styles.serviceName}>{s.name}</Text>
            <Text style={styles.serviceSub}>{s.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>DI SEKITARMU</Text>
          <Text style={styles.sectionTitle}>Outlet pilihan</Text>
        </View>
        <TouchableOpacity
          onPress={onOpenMap}
          activeOpacity={0.7}
          style={styles.seeMapButton}
        >
          <Text style={styles.seeMapText}>Lihat peta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.outletList}>
        {filteredOutlets.map((outlet) => (
          <OutletCard
            key={outlet.id}
            outlet={outlet}
            onPress={() => onSelectOutlet?.(outlet)}
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
  seeMapButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  outletList: {
    paddingHorizontal: 20,
  },
});
