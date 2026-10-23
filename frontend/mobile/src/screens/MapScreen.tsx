import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
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
  formatDistanceKm,
  haversineDistanceKm,
  MappableOutlet,
  MapProvider,
  resolveOutletCoordinates,
} from "../utils/maps";
import { reverseGeocodeCoordinate } from "../utils/location";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ||
  "";

type LocationState = "idle" | "loading" | "granted" | "denied";

export function MapScreen({
  visible,
  onClose,
  onSelectOutlet,
  currentLocation,
  currentLocationName,
  onLocationChange,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectOutlet?: (outlet: Outlet) => void;
  currentLocation?: Coordinate | null;
  currentLocationName?: string;
  onLocationChange?: (coord: Coordinate, name?: string) => void;
}) {
  const webRef = useRef<WebView>(null);
  const manualPickRef = useRef(false);

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(
    currentLocation ?? null
  );
  const [localLocationName, setLocalLocationName] = useState<string | null>(
    currentLocationName ?? null
  );
  const [gpsLocation, setGpsLocation] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [webReady, setWebReady] = useState(false);
  const [provider, setProvider] = useState<MapProvider>(
    GOOGLE_MAPS_API_KEY ? "google" : "osm"
  );
  const [usedFallback, setUsedFallback] = useState(false);
  const [pickMode, setPickMode] = useState(false);

  const requestLocation = useCallback(async () => {
    setLocationState("loading");

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (permission.status === "denied") {
          setLocationState("denied");
          return;
        }
        const requested = await Location.requestForegroundPermissionsAsync();
        permission = requested;
      }

      if (permission.status !== "granted") {
        setLocationState("denied");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setGpsLocation(coordinate);
      setAccuracy(position.coords.accuracy ?? null);
      if (!manualPickRef.current) {
        setUserLocation(coordinate);
        reverseGeocodeCoordinate(coordinate).then((name) => {
          setLocalLocationName(name);
          onLocationChange?.(coordinate, name);
        });
      }
      setLocationState("granted");
    } catch {
      setLocationState("denied");
    }
  }, []);

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

  useEffect(() => {
    if (!visible) return;
    if (currentLocation && !userLocation) {
      setUserLocation(currentLocation);
    }
    if (currentLocationName && !localLocationName) {
      setLocalLocationName(currentLocationName);
    }
    manualPickRef.current = false;
    requestLocation();
  }, [visible, requestLocation, currentLocation, currentLocationName]);

  useEffect(() => {
    if (!visible || locationState !== "granted") return;

    let active = true;
    let subscription: { remove: () => void } | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 5,
        timeInterval: 10000,
      },
      (position) => {
        if (!active) return;
        const coordinate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setGpsLocation(coordinate);
        if (!manualPickRef.current) {
          setUserLocation(coordinate);
          setAccuracy(position.coords.accuracy ?? null);
          reverseGeocodeCoordinate(coordinate).then((name) => {
            setLocalLocationName(name);
            onLocationChange?.(coordinate, name);
          });
        }
      }
    )
      .then((sub) => {
        subscription = sub;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (subscription) subscription.remove();
    };
  }, [visible, locationState]);

  const mappableOutlets = useMemo<MappableOutlet[]>(() => {
    const list = outlets.map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
      address: outlet.address,
      distance: outlet.distance,
      rating: outlet.rating,
      price: outlet.price,
      photo: outlet.photo,
      latitude: outlet.latitude,
      longitude: outlet.longitude,
    }));

    return resolveOutletCoordinates(list);
  }, [outlets]);
  const center = useMemo(
    () =>
      centerForCoordinates(
        mappableOutlets.map((o) => ({
          latitude: o.latitude,
          longitude: o.longitude,
        })),
        {
          latitude: DEFAULT_MAP_REGION.latitude,
          longitude: DEFAULT_MAP_REGION.longitude,
        }
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
        userLocation,
        userAccuracy: accuracy,
      }),
    [mappableOutlets, center, provider, userLocation, accuracy]
  );

  const nearestOutlet = useMemo(() => {
    if (!userLocation || mappableOutlets.length === 0) return null;

    let best: { outlet: MappableOutlet; km: number } | null = null;

    for (const outlet of mappableOutlets) {
      const km = haversineDistanceKm(userLocation, {
        latitude: outlet.latitude,
        longitude: outlet.longitude,
      });
      if (!best || km < best.km) {
        best = { outlet, km };
      }
    }

    return best;
  }, [userLocation, mappableOutlets]);

  const sendUserLocation = useCallback(
    (centerOnMap: boolean) => {
      if (!userLocation) return;

      webRef.current?.injectJavaScript(`
        window.postMessage(JSON.stringify({
          type: 'userLocation',
          lat: ${userLocation.latitude},
          lng: ${userLocation.longitude},
          accuracy: ${accuracy ?? 0},
          center: ${centerOnMap ? "true" : "false"},
          zoom: 16
        }), '*');
        true;
      `);
    },
    [userLocation, accuracy]
  );

  useEffect(() => {
    if (!webReady || !userLocation) return;
    sendUserLocation(false);
  }, [webReady, userLocation, accuracy, sendUserLocation]);

  const centerOnUser = async () => {
    if (locationState !== "granted") {
      requestLocation();
      return;
    }

    manualPickRef.current = false;
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setGpsLocation(coordinate);
      setUserLocation(coordinate);
      setAccuracy(position.coords.accuracy ?? null);
      reverseGeocodeCoordinate(coordinate).then((name) => {
        setLocalLocationName(name);
        onLocationChange?.(coordinate, name);
      });
    } catch {
      if (gpsLocation) {
        setUserLocation(gpsLocation);
        reverseGeocodeCoordinate(gpsLocation).then((name) => {
          setLocalLocationName(name);
          onLocationChange?.(gpsLocation, name);
        });
      }
    }

    webRef.current?.injectJavaScript(`
      window.postMessage(JSON.stringify({ type: 'centerUser', zoom: 16 }), '*');
      true;
    `);
  };

  const togglePickMode = () => {
    const next = !pickMode;
    setPickMode(next);

    webRef.current?.injectJavaScript(`
      window.postMessage(JSON.stringify({ type: 'setPickMode', enabled: ${next} }), '*');
      true;
    `);
  };

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    let data: any;

    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (!data) return;

    if (data.type === "order") {
      const outlet = outlets.find((o) => o.id === data.id);
      if (outlet) onSelectOutlet?.(outlet);
      return;
    }

    if (data.type === "ready") {
      setWebReady(true);
      sendUserLocation(false);
      return;
    }

    if (data.type === "userPicked") {
      manualPickRef.current = true;
      const picked = {
        latitude: data.lat,
        longitude: data.lng,
      };
      setUserLocation(picked);
      setAccuracy(null);
      setPickMode(false);

      reverseGeocodeCoordinate(picked).then((name) => {
        setLocalLocationName(name);
        onLocationChange?.(picked, name);
      });

      webRef.current?.injectJavaScript(`
        window.postMessage(JSON.stringify({ type: 'setPickMode', enabled: false }), '*');
        true;
      `);
      return;
    }

    if (data.type === "tilesFailed" && provider === "google") {
      setProvider("osm");
      setUsedFallback(true);
    }
  };

  const openSettings = () => {
    Linking.openSettings().catch(() => undefined);
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.popup}>
        <View style={styles.handle} />

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

        {usedFallback && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Google Maps tidak dapat dimuat (API key tidak valid atau tidak
              ada internet). Peta dialihkan ke OpenStreetMap.
            </Text>
          </View>
        )}

        {locationState === "denied" && (
          <View style={styles.locationBanner}>
            <Text style={styles.locationBannerText}>
              Izin lokasi tidak aktif, posisi Anda belum ditandai di peta.
            </Text>
            <View style={styles.locationBannerActions}>
              <TouchableOpacity
                style={styles.locationBannerButton}
                onPress={requestLocation}
                activeOpacity={0.8}
              >
                <Text style={styles.locationBannerButtonText}>Coba lagi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationBannerButtonGhost}
                onPress={openSettings}
                activeOpacity={0.8}
              >
                <Text style={styles.locationBannerButtonGhostText}>
                  Buka pengaturan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {pickMode && (
          <View style={styles.pickBanner}>
            <Text style={styles.pickBannerText}>
              Ketuk peta untuk menandai posisi Anda sekarang
            </Text>
          </View>
        )}

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

          {locationState === "loading" && !loading && (
            <View style={styles.mapStatus}>
              <ActivityIndicator size="small" color="#0878f9" />
              <Text style={styles.mapStatusText}>Mencari posisi Anda...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.locateButton}
            onPress={centerOnUser}
            activeOpacity={0.8}
          >
            <Text style={styles.locateButtonText}>◎</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickButton, pickMode && styles.pickButtonActive]}
            onPress={togglePickMode}
            activeOpacity={0.8}
          >
            <Text style={styles.pickButtonText}>📍</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Posisi Anda</Text>
            <View style={styles.infoValueWrap}>
              {localLocationName || currentLocationName ? (
                <Text style={styles.infoLocationName} numberOfLines={1}>
                  📍 {localLocationName || currentLocationName}
                </Text>
              ) : null}
              <Text style={styles.infoValue}>
                {userLocation
                  ? `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`
                  : "Belum ditemukan"}
              </Text>
            </View>
          </View>

          {nearestOutlet && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Outlet terdekat</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {nearestOutlet.outlet.name} ·{" "}
                {formatDistanceKm(nearestOutlet.km)}
              </Text>
            </View>
          )}
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
  locationBanner: {
    backgroundColor: "#eaf4ff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#cfe6fb",
  },
  locationBannerText: {
    fontSize: 11,
    color: "#0b4f8f",
    fontWeight: "600",
    marginBottom: 8,
  },
  locationBannerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationBannerButton: {
    backgroundColor: "#0878f9",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  locationBannerButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  locationBannerButtonGhost: {
    borderWidth: 1,
    borderColor: "#0b4f8f",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  locationBannerButtonGhostText: {
    color: "#0b4f8f",
    fontSize: 11,
    fontWeight: "700",
  },
  pickBanner: {
    backgroundColor: "rgba(9, 35, 77, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pickBannerText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
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
  mapStatus: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mapStatusText: {
    marginLeft: 7,
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
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
  pickButton: {
    position: "absolute",
    left: 14,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#0878f9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#09234d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  pickButtonActive: {
    backgroundColor: "#0878f9",
    borderColor: "#ffffff",
  },
  pickButtonText: {
    fontSize: 19,
    lineHeight: 24,
  },
  infoCard: {
    borderTopWidth: 1,
    borderTopColor: "#e4eaf1",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
  },
  infoValueWrap: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: 12,
  },
  infoLocationName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0878f9",
    marginBottom: 2,
    textAlign: "right",
  },
  infoValue: {
    fontSize: 11,
    color: "#09234d",
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
});
