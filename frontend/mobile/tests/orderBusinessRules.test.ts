import { OrderStatus, PaymentMethod } from "../src/types";

// Fungsi helper validasi logika bisnis sesuai PRD Bab 4.1, 9.3, & 9.7
export function calculateSubtotal(unitPrice: number, quantity: number): number {
  if (quantity < 1) throw new Error("Kuantitas minimal adalah 1");
  return unitPrice * quantity;
}

export function calculateCommission(grossAmount: number, rate: number = 0.05): number {
  return Math.round(grossAmount * rate);
}

export function isOrderExpired(
  status: OrderStatus,
  paymentMethod: PaymentMethod,
  createdAt: Date,
  now: Date
): boolean {
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

  // PRD: 15 menit batas pembayaran digital
  if (status === "pending_payment" && paymentMethod === "digital") {
    return diffMinutes > 15;
  }

  // PRD: 30 menit batas respon mitra untuk pesanan tunai
  if (status === "pending_partner" && paymentMethod === "cash") {
    return diffMinutes > 30;
  }

  return false;
}

export function isComplaintEligible(completedAt: Date, complaintTime: Date): boolean {
  // PRD Bab 4.1 A: Komplain maksimal 1 jam (60 menit) setelah pesanan selesai
  const diffMinutes = (complaintTime.getTime() - completedAt.getTime()) / (1000 * 60);
  return diffMinutes >= 0 && diffMinutes <= 60;
}

export function isValidStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending_payment: ["processing", "cancelled", "expired"],
    pending_partner: ["accepted", "pending_payment", "rejected", "expired", "cancelled"],
    accepted: ["pending_payment", "processing", "awaiting_customer_approval", "cancelled"],
    awaiting_customer_approval: ["processing", "cancelled"],
    processing: ["ready_for_pickup"],
    ready_for_pickup: ["completed"],
    completed: [],
    rejected: [],
    cancelled: [],
    expired: [],
  };

  return validTransitions[current]?.includes(next) || false;
}

// ================= SUITE TEST =================

describe("Aturan Bisnis Pesanan (PRD v1.2 Bab 4 & 9)", () => {
  describe("Perhitungan Estimasi Subtotal", () => {
    it("menghitung subtotal dengan benar (tarif x kuantitas)", () => {
      expect(calculateSubtotal(8000, 3)).toBe(24000);
      expect(calculateSubtotal(7500, 2)).toBe(15000);
      expect(calculateSubtotal(14000, 1)).toBe(14000);
    });

    it("menolak kuantitas kurang dari 1", () => {
      expect(() => calculateSubtotal(8000, 0)).toThrow("Kuantitas minimal adalah 1");
      expect(() => calculateSubtotal(8000, -2)).toThrow("Kuantitas minimal adalah 1");
    });
  });

  describe("Perhitungan Komisi Marketplace (PRD Bab 9.3: 5% snapshot)", () => {
    it("menghitung komisi platform 5% secara akurat", () => {
      expect(calculateCommission(24000)).toBe(1200);
      expect(calculateCommission(50000)).toBe(2500);
      expect(calculateCommission(15000)).toBe(750);
    });
  });

  describe("Tenggat Waktu Kedaluwarsa Pesanan (PRD Bab 9.7)", () => {
    it("pesanan digital kedaluwarsa jika belum bayar lebih dari 15 menit", () => {
      const createdAt = new Date("2026-10-19T10:00:00.000Z");
      const check14Min = new Date("2026-10-19T10:14:00.000Z");
      const check16Min = new Date("2026-10-19T10:16:00.000Z");

      expect(isOrderExpired("pending_payment", "digital", createdAt, check14Min)).toBe(false);
      expect(isOrderExpired("pending_payment", "digital", createdAt, check16Min)).toBe(true);
    });

    it("pesanan tunai kedaluwarsa jika mitra tidak merespon lebih dari 30 menit", () => {
      const createdAt = new Date("2026-10-19T10:00:00.000Z");
      const check25Min = new Date("2026-10-19T10:25:00.000Z");
      const check35Min = new Date("2026-10-19T10:35:00.000Z");

      expect(isOrderExpired("pending_partner", "cash", createdAt, check25Min)).toBe(false);
      expect(isOrderExpired("pending_partner", "cash", createdAt, check35Min)).toBe(true);
    });
  });

  describe("Kebijakan Komplain Pelanggan (PRD Bab 4.1 A: Batas 1 Jam)", () => {
    it("komplain diterima jika diajukan dalam waktu 60 menit setelah pesanan selesai", () => {
      const completedAt = new Date("2026-10-19T14:00:00.000Z");
      const submittedAt45Min = new Date("2026-10-19T14:45:00.000Z");

      expect(isComplaintEligible(completedAt, submittedAt45Min)).toBe(true);
    });

    it("komplain ditolak jika diajukan lebih dari 60 menit setelah pesanan selesai", () => {
      const completedAt = new Date("2026-10-19T14:00:00.000Z");
      const submittedAt75Min = new Date("2026-10-19T15:15:00.000Z");

      expect(isComplaintEligible(completedAt, submittedAt75Min)).toBe(false);
    });
  });

  describe("Transisi Siklus Status Pesanan (PRD Bab 9.3)", () => {
    it("memvalidasi transisi status alur penimbangan & pembayaran fix", () => {
      // Pelanggan buat estimasi -> mitra timbang ulang & terbitkan harga fix
      expect(isValidStatusTransition("pending_partner", "pending_payment")).toBe(true);
      expect(isValidStatusTransition("pending_partner", "accepted")).toBe(true);
      expect(isValidStatusTransition("accepted", "pending_payment")).toBe(true);
      // Pelanggan konfirmasi pembayaran -> cucian mulai diproses
      expect(isValidStatusTransition("pending_payment", "processing")).toBe(true);
      expect(isValidStatusTransition("processing", "ready_for_pickup")).toBe(true);
      expect(isValidStatusTransition("ready_for_pickup", "completed")).toBe(true);
    });

    it("memvalidasi transisi penyesuaian biaya aktual", () => {
      expect(isValidStatusTransition("accepted", "awaiting_customer_approval")).toBe(true);
      expect(isValidStatusTransition("awaiting_customer_approval", "processing")).toBe(true);
      expect(isValidStatusTransition("awaiting_customer_approval", "cancelled")).toBe(true);
    });

    it("menolak transisi status ilegal", () => {
      expect(isValidStatusTransition("completed", "processing")).toBe(false);
      expect(isValidStatusTransition("pending_payment", "completed")).toBe(false);
    });
  });
});
