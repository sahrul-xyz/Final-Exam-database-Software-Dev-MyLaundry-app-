import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Konfigurasi dinamis Expo (menggantikan nilai statis di app.json).
 *
 * Google Maps API key diambil dari environment variable:
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY  -> key yang dipakai di dalam app ( Expo Go / development build )
 *   GOOGLE_MAPS_API_KEY              -> fallback untuk konfigurasi native
 *
 * Cara mendapatkan key:
 *   1. Buka https://console.cloud.google.com/ > buat/ pilih project
 *   2. Aktifkan "Maps SDK for Android" dan "Maps SDK for iOS"
 *   3. Buat API key, lalu batasi (Restrictions) berdasarkan package name / bundle id
 */
const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "MyLaundry",
  slug: "my-laundry-mobile",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: config.ios?.bundleIdentifier ?? "com.mylaundry.app",
    infoPlist: {
      ...config.ios?.infoPlist,
      NSLocationWhenInUseUsageDescription:
        "MyLaundry menggunakan lokasi Anda untuk menampilkan outlet laundry terdekat pada peta.",
    },
    config: {
      ...config.ios?.config,
      googleMapsApiKey,
    },
  },
  android: {
    ...config.android,
    package: config.android?.package ?? "com.mylaundry.app",
    permissions: [
      ...(config.android?.permissions ?? []),
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
    ],
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  extra: {
    ...config.extra,
    googleMapsApiKey,
  },
  owner: "sahrul25xyz",
});
