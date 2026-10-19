import { formatRupiah, formatDateIndo } from "../src/utils/formatters";

describe("Utilitas Formatters (PRD Utilitas UI)", () => {
  describe("formatRupiah", () => {
    it("memformat nominal rupiah dengan benar", () => {
      expect(formatRupiah(8000)).toBe("Rp8.000");
      expect(formatRupiah(24000)).toBe("Rp24.000");
      expect(formatRupiah(150000)).toBe("Rp150.000");
      expect(formatRupiah(0)).toBe("Rp0");
    });
  });

  describe("formatDateIndo", () => {
    it("memformat tanggal ke format lokal Indonesia", () => {
      const formatted = formatDateIndo("2026-10-19T00:00:00.000Z");
      // Tanggal 19 Okt 2026 atau 19 Oct 2026
      expect(formatted).toMatch(/19/);
      expect(formatted).toMatch(/2026/);
    });
  });
});
