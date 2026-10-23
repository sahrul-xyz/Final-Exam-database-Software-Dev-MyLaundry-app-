import * as Location from "expo-location";
import { Coordinate } from "./maps";

/**
 * Format objek alamat geocoding expo-location menjadi string ringkas & jelas.
 * Contoh hasil: "Setiabudi, Bandung" atau "Pagedangan, Tangerang".
 */
export function formatGeocodedAddress(
  item?: Partial<Location.LocationGeocodedAddress> | null
): string | null {
  if (!item) return null;

  const cleanCity = (val?: string | null) => {
    if (!val) return null;
    return val
      .replace(/^Kota\s+/i, "")
      .replace(/^Kabupaten\s+/i, "Kab. ")
      .trim();
  };

  const district = item.district?.trim() || null;
  const name = item.name?.trim() || null;
  const rawCity = item.city?.trim() || item.subregion?.trim() || null;
  const city = cleanCity(rawCity);
  const region = item.region?.trim() || null;

  // 1. Format standar: Kecamatan/Distrik, Kota
  if (district && city && district.toLowerCase() !== city.toLowerCase()) {
    return `${district}, ${city}`;
  }

  // 2. Jika nama tempat/desa spesifik tersedia dan bukan nomor jalan
  if (name && !/^\d+$/.test(name) && name !== item.street) {
    if (city && name.toLowerCase() !== city.toLowerCase()) {
      return `${name}, ${city}`;
    }
    return name;
  }

  // 3. Hanya kecamatan / distrik
  if (district) {
    if (region && district.toLowerCase() !== region.toLowerCase()) {
      return `${district}, ${region}`;
    }
    return district;
  }

  // 4. Hanya kota
  if (city) {
    return city;
  }

  // 5. Hanya wilayah/provinsi
  if (region) {
    return region;
  }

  return null;
}

/**
 * Reverse geocode dari koordinat (lat, lng) ke nama area/alamat pengguna.
 * Mencoba Expo native geocoder terlebih dahulu, kemudian OSM Nominatim jika perlu.
 */
export async function reverseGeocodeCoordinate(
  coord: Coordinate
): Promise<string> {
  // 1. Coba native reverse geocode dari expo-location
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coord.latitude,
      longitude: coord.longitude,
    });
    if (results && results.length > 0) {
      const formatted = formatGeocodedAddress(results[0]);
      if (formatted) return formatted;
    }
  } catch {
    // Native geocoder tidak tersedia / gagal, lanjut ke fallback
  }

  // 2. Fallback: OpenStreetMap Nominatim API (timeout 3.5 detik)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.latitude}&lon=${coord.longitude}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MyLaundryMobileApp/1.0",
        "Accept-Language": "id,en",
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const addr = json.address || {};
      const sub =
        addr.village ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.district ||
        addr.town;
      let city =
        addr.city ||
        addr.regency ||
        addr.county ||
        addr.state_district;
      if (city) {
        city = city.replace(/^Kabupaten\s+/i, "Kab. ").replace(/^Kota\s+/i, "");
      }

      if (sub && city && sub.toLowerCase() !== city.toLowerCase()) {
        return `${sub}, ${city}`;
      }
      if (sub) return sub;
      if (city) return city;
      if (addr.state) return addr.state;
    }
  } catch {
    // Abaikan jika network timeout / error
  }

  // 3. Fallback akhir: representasi koordinat ringkas
  return `${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`;
}

export interface UserLocationResult {
  coordinate: Coordinate;
  locationName: string;
}

/**
 * Dapatkan koordinat GPS terkini beserta nama lokasinya.
 */
export async function getCurrentUserLocation(
  requestPermissionIfNeed = false
): Promise<UserLocationResult | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      if (!requestPermissionIfNeed) {
        return null;
      }
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== "granted") {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coordinate: Coordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    const locationName = await reverseGeocodeCoordinate(coordinate);

    return {
      coordinate,
      locationName,
    };
  } catch (error) {
    console.warn("Gagal mendeteksi lokasi pengguna:", error);
    return null;
  }
}
