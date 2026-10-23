import {
  formatGeocodedAddress,
  reverseGeocodeCoordinate,
} from "../src/utils/location";

jest.mock("expo-location", () => ({
  reverseGeocodeAsync: jest.fn(async ({ latitude, longitude }) => {
    if (latitude === -6.85843 && longitude === 107.59003) {
      return [
        {
          district: "Setiabudi",
          city: "Kota Bandung",
          region: "Jawa Barat",
        },
      ];
    }
    if (latitude === -6.08575 && longitude === 106.43465) {
      return [
        {
          district: "Pagedangan",
          city: "Kabupaten Tangerang",
          region: "Banten",
        },
      ];
    }
    return [];
  }),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: -6.08575, longitude: 106.43465, accuracy: 10 },
  })),
  Accuracy: { Balanced: 3 },
}));

describe("Utilitas Lokasi & Geocoding", () => {
  describe("formatGeocodedAddress", () => {
    it("memformat district dan city dengan benar", () => {
      expect(
        formatGeocodedAddress({
          district: "Setiabudi",
          city: "Kota Bandung",
        })
      ).toBe("Setiabudi, Bandung");
    });

    it("memformat kecamatan dengan kabupaten berawalan Kabupaten", () => {
      expect(
        formatGeocodedAddress({
          district: "Pagedangan",
          subregion: "Kabupaten Tangerang",
        })
      ).toBe("Pagedangan, Kab. Tangerang");
    });

    it("menghindari duplikasi bila district dan city bernilai sama", () => {
      expect(
        formatGeocodedAddress({
          district: "Bandung",
          city: "Bandung",
        })
      ).toBe("Bandung");
    });

    it("menggunakan nama tempat jika district kosong", () => {
      expect(
        formatGeocodedAddress({
          name: "Pagedangan Udik",
          city: "Tangerang",
        })
      ).toBe("Pagedangan Udik, Tangerang");
    });

    it("mengembalikan null jika objek null atau kosong", () => {
      expect(formatGeocodedAddress(null)).toBeNull();
      expect(formatGeocodedAddress({})).toBeNull();
    });
  });

  describe("reverseGeocodeCoordinate", () => {
    it("mengembalikan alamat terbalik dari koordinat Setiabudi", async () => {
      const address = await reverseGeocodeCoordinate({
        latitude: -6.85843,
        longitude: 107.59003,
      });
      expect(address).toBe("Setiabudi, Bandung");
    });

    it("mengembalikan alamat terbalik dari koordinat Pagedangan", async () => {
      const address = await reverseGeocodeCoordinate({
        latitude: -6.08575,
        longitude: 106.43465,
      });
      expect(address).toBe("Pagedangan, Kab. Tangerang");
    });

    it("mengembalikan format koordinat bila geocoder tidak menemukan alamat", async () => {
      // Koordinat di tengah Samudra Pasifik
      const address = await reverseGeocodeCoordinate({
        latitude: -82.0,
        longitude: 0.0,
      });
      expect(address).toBe("-82.0000, 0.0000");
    });
  });
});
