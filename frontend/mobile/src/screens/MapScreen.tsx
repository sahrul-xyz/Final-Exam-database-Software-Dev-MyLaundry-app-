import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Outlet } from "../types";
import { getLiveOutlets } from "../services/supabase";
import {
  buildMapHtml,
  centerForCoordinates,
  Coordinate,
  DEFAULT_MAP_REGION,
  isValidCoordinate,
  MappableOutlet,
  MapProvider,
} from "../utils/maps";

/** API key Google Maps (JavaScript API) dari app.config.ts / .env */
const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ||
  "";

const IS_WEB = Platform.OS === "web";

export function MapScreen({
  visible,
  onClose,
  onSelectOutlet,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectOutlet?: (outlet: Outlet) => void;
}) {
  const webRef = useRef<WebView>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [webReady, setWebReady] = useState(false);
  // Google Maps dipakai bila API key tersedia, jika tidak -> OpenStreetMap.
  const [provider, setProvider] = useState<MapProvider>(
    GOOGLE_MAPS_API_KEY ? "google" : "osm"
  );
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let active = true;
    setLoading(true);
    getLiveOutlets()
      .then((data) => {
        if (active) setOutlets(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible]);

  /** Outlet yang punya koordinat -> siap dijadikan marker. */
  const mappableOutlets = useMemo<MappableOutlet[]>(
    () =>
      outlets
        .filter((outlet) => isValidCoordinate(outlet))
        .map((outlet) => ({
          id: outlet.id,
          name: outlet.name,
          address: outlet.address,
          distance: outlet.distance,
          rating: outlet.rating,
          price: outlet.price,
          photo: outlet.photo,
          latitude: outlet.latitude as number,
          longitude: outlet.longitude as number,
        })),
    [outlets]
  );

  const center = useMemo(
    () =>
      centerForCoordinates(
        mappableOutlets.map((o) => ({
          latitude: o.latitude,
          longitude: o.longitude,
        })),
        { latitude: DEFAULT_MAP_REGION.latitude, longitude: DEFAULT_MAP_REGION.longitude }
      ),
    [mappableOutlets]
  );

  const html = useMemo(
    () =>
      buildMapHtml({
        apiKey: GOOGLE_MAPS_API_KEY,
        outlets: mappableOutlets,
        center,
        provider,
      }),
    [mappableOutlets, center, provider]
  );

  // Kirim lokasi pengguna ke peta setelah WebView siap dimuat
  useEffect(() => {
    if (!webReady || !userLocation) return;
    webRef.current?.injectJavaScript(`
      window.postMessage(JSON.stringify({
        type: 'userLocation',
        lat: ${userLocation.latitude},
        lng: ${userLocation.longitude}
      }), '*');
      true;
    `);
  }, [webReady, userLocation]);

  const handleLocate = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Ditolak",
          "Aktifkan izin lokasi pada pengaturan aplikasi untuk menampilkan posisi Anda."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      Alert.alert(
        "Gagal",
        "Tidak dapat mengambil lokasi saat ini. Pastikan GPS perangkat aktif."
      );
    }
  };

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data?.type === "order") {
        const outlet = outlets.find((o) => o.id === data.id);
        if (outlet) onSelectOutlet?.(outlet);
        return;
      }

      // Tile Google Maps gagal dimuat -> otomatis pakai OpenStreetMap
      if (data?.type === "tilesFailed" && provider === "google") {
        setProvider("osm");
        setUsedFallback(true);
      }
    } catch {
      // abaikan pesan yang tidak valid
    }
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.popup}>
        {/* ---------------- Handle ---------------- */}
        <View style={styles.handle} />

        {/* ---------------- Header ---------------- */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Peta Outlet</Text>
            <Text style={styles.headerSubtitle}>
              {mappableOutlets.length} outlet laundry terdekat
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!GOOGLE_MAPS_API_KEY && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              API key Google Maps belum diatur, peta memakai OpenStreetMap.
              Tambahkan EXPO_PUBLIC_GOOGLE_MAPS_API_KEY pada file .env lalu
              restart server untuk memakai Google Maps.
            </Text>
          </View>
        )}

        {usedFallback && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Google Maps tidak dapat dimuat (API key tidak valid atau tidak
              ada internet). Peta dialihkan ke OpenStreetMap.
            </Text>
          </View>
        )}

        {/* ---------------- Peta ---------------- */}
        <View style={styles.mapWrap}>
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html }}
            onMessage={handleMessage}
            onLoadEnd={() => setWebReady(true)}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            style={styles.map}
          />

          {loading && (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#0878f9" />
              <Text style={styles.mapLoadingText}>Memuat peta outlet...</Text>
            </View>
          )}

          {/* Tombol lokasi saya (mengambang di atas peta) */}
          <TouchableOpacity
            style={styles.locateButton}
            onPress={handleLocate}
            activeOpacity={0.8}
          >
            <Text style={styles.locateButtonText}>◎</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(9, 35, 77, 0.45)",
  },
  popup: {
    height: "90%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#09234d",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f1f8ff",
    borderWidth: 1,
    borderColor: "#e4eaf1",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#09234d",
    lineHeight: 20,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#09234d",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  warningBanner: {
    backgroundColor: "#fff4dc",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f2e0b5",
  },
  warningText: {
    fontSize: 11,
    color: "#8a5a08",
    fontWeight: "600",
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#eaf4ff",
  },
  map: {
    flex: 1,
    backgroundColor: "#eaf4ff",
  },
  mapLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(237, 247, 255, 0.85)",
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  locateButton: {
    position: "absolute",
    right: 14,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0878f9",
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#09234d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  locateButtonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 24,
  },
});
