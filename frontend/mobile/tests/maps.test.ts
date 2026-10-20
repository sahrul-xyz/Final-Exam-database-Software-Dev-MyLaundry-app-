import {
  buildMapHtml,
  centerForCoordinates,
  DEFAULT_MAP_REGION,
  isValidCoordinate,
  OSM_TILE_URL,
  regionForCoordinates,
} from "../src/utils/maps";

describe("Utilitas Peta / Google Maps", () => {
  describe("isValidCoordinate", () => {
    it("menerima koordinat yang valid", () => {
      expect(isValidCoordinate({ latitude: -6.85843, longitude: 107.59003 })).toBe(
        true
      );
    });

    it("menolak koordinat null, undefined, atau di luar rentang", () => {
      expect(isValidCoordinate(null)).toBe(false);
      expect(isValidCoordinate(undefined)).toBe(false);
      expect(isValidCoordinate({ latitude: null, longitude: null })).toBe(false);
      expect(isValidCoordinate({ latitude: 91, longitude: 107 })).toBe(false);
      expect(isValidCoordinate({ latitude: -6.8, longitude: 181 })).toBe(false);
    });
  });

  describe("centerForCoordinates", () => {
    it("mengembalikan titik tengah dari seluruh marker", () => {
      const center = centerForCoordinates([
        { latitude: -6.8, longitude: 107.5 },
        { latitude: -6.9, longitude: 107.7 },
      ]);

      expect(center.latitude).toBeCloseTo(-6.85, 5);
      expect(center.longitude).toBeCloseTo(107.6, 5);
    });

    it("mengembalikan default bila tidak ada koordinat", () => {
      const center = centerForCoordinates([]);
      expect(center.latitude).toBe(DEFAULT_MAP_REGION.latitude);
      expect(center.longitude).toBe(DEFAULT_MAP_REGION.longitude);
    });
  });

  describe("regionForCoordinates", () => {
    it("mengembalikan region default bila tidak ada koordinat", () => {
      expect(regionForCoordinates([])).toEqual(DEFAULT_MAP_REGION);
    });

    it("menghitung titik tengah dari seluruh marker", () => {
      const region = regionForCoordinates([
        { latitude: -6.8, longitude: 107.5 },
        { latitude: -6.9, longitude: 107.7 },
      ]);

      expect(region.latitude).toBeCloseTo(-6.85, 5);
      expect(region.longitude).toBeCloseTo(107.6, 5);
      expect(region.latitudeDelta).toBeGreaterThan(0);
      expect(region.longitudeDelta).toBeGreaterThan(0);
    });

    it("menjamin region tetap memiliki area minimum", () => {
      const region = regionForCoordinates([
        { latitude: -6.85843, longitude: 107.59003 },
      ]);

      expect(region.latitudeDelta).toBeGreaterThanOrEqual(0.02);
      expect(region.longitudeDelta).toBeGreaterThanOrEqual(0.02);
    });
  });

  describe("buildMapHtml", () => {
    const outlets = [
      {
        id: "a1",
        name: "Bersih Laundry Setiabudi",
        address: "Jl. Dr. Setiabudi No. 156, Bandung",
        distance: "0,8 km",
        rating: "4,9",
        price: "Rp8.000 /kg",
        latitude: -6.85843,
        longitude: 107.59003,
      },
    ];

    it("memakai Google Maps JS API bila provider google", () => {
      const html = buildMapHtml({
        apiKey: "API_KEY_123",
        outlets,
        provider: "google",
      });

      expect(html).toContain(
        "https://maps.googleapis.com/maps/api/js?key=API_KEY_123"
      );
      expect(html).not.toContain("leaflet");
    });

    it("memakai Leaflet + OpenStreetMap tanpa API key", () => {
      const html = buildMapHtml({ apiKey: "", outlets, provider: "osm" });

      expect(html).toContain("leaflet");
      expect(html).toContain("tile.openstreetmap.org");
      expect(html).not.toContain("maps.googleapis.com");
    });

    it("menyisipkan data outlet sebagai marker", () => {
      const html = buildMapHtml({ apiKey: "k", outlets });

      expect(html).toContain("Bersih Laundry Setiabudi");
      expect(html).toContain("-6.85843");
      expect(html).toContain("107.59003");
    });

    it("tidak memutus tag script saat nama outlet mengandung karakter HTML", () => {
      const html = buildMapHtml({
        apiKey: "k",
        outlets: [{ ...outlets[0], name: "</script><script>alert(1)</script>" }],
      });

      expect(html).not.toContain("</script><script>alert(1)");
    });

    it("menyediakan tombol Pesan yang mengirim pesan ke aplikasi", () => {
      const html = buildMapHtml({ apiKey: "k", outlets });

      expect(html).toContain("data-order");
      expect(html).toContain("ReactNativeWebView.postMessage");
    });

    it("mendeteksi tile gagal dimuat untuk memicu fallback", () => {
      const html = buildMapHtml({ apiKey: "k", outlets });

      expect(html).toContain("tilesFailed");
      expect(html).toContain("naturalWidth");
    });

    it("memakai tampilan peta standar (tanpa custom style/filter)", () => {
      const google = buildMapHtml({
        apiKey: "k",
        outlets,
        provider: "google",
      });
      const osm = buildMapHtml({ apiKey: "k", outlets, provider: "osm" });

      // Google Maps: tidak overriding styles -> tampilan bawaan Google
      expect(google).not.toContain("styles:");
      // OpenStreetMap: tile standar tanpa filter warna
      expect(osm).toContain(OSM_TILE_URL);
      expect(osm).not.toContain("filter:");
      expect(osm).not.toContain("hue-rotate");
    });  });
});
