import type { ConfigContext, ExpoConfig } from "expo/config";


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
