import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import {
  Outlet,
  LaundryServiceItem,
  HandoverMethod,
  PaymentMethod,
  CustomerOrder,
  ServiceCategory,
} from "../types";
import {
  fetchOutletServices,
  createCustomerOrder,
  confirmDigitalPaymentSimulation,
  getLiveOutlets,
} from "../services/supabase";

const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  kiloan: "Cuci Kiloan",
  express: "Express",
  satuan: "Satuan",
};

function isExpress(s: LaundryServiceItem) {
  const name = s.name.toLowerCase();
  return (
    name.includes("express") || name.includes("kilat") || s.durationHours <= 12
  );
}

function matchesCategory(s: LaundryServiceItem, c: ServiceCategory) {
  if (c === "satuan") return s.pricingType === "per_item";
  if (c === "express") return s.pricingType !== "per_item" && isExpress(s);
  return s.pricingType !== "per_item" && !isExpress(s); // kiloan
}

export function OrderModal({
  visible,
  outlet,
  customerId,
  onClose,
  onOrderSuccess,
  initialCategory,
}: {
  visible: boolean;
  outlet: Outlet | null;
  customerId: string;
  onClose: () => void;
  onOrderSuccess: (order: CustomerOrder) => void;
  initialCategory?: ServiceCategory;
}) {
  const [step, setStep] = useState<"form" | "payment">("form");
  const [createdOrder, setCreatedOrder] = useState<CustomerOrder | null>(null);
  const [services, setServices] = useState<LaundryServiceItem[]>([]);
  const [selectedService, setSelectedService] =
    useState<LaundryServiceItem | null>(null);
  const [quantity, setQuantity] = useState(3); // default 3 kg
  const [handoverMethod, setHandoverMethod] =
    useState<HandoverMethod>("pickup_delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("digital");
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [simulatingPay, setSimulatingPay] = useState(false);
  const [paymentTimer, setPaymentTimer] = useState(15 * 60);
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(outlet);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [outletOptions, setOutletOptions] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [clothingNotes, setClothingNotes] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("Pagi (08:00 - 11:00)");

  useEffect(() => {
    if (visible) {
      setStep("form");
      setCreatedOrder(null);
      setPaymentTimer(15 * 60);
      setCurrentOutlet(outlet);
      setShowOutletPicker(false);
      setClothingNotes("");
      setPickupTimeSlot("Pagi (08:00 - 11:00)");
    }
  }, [visible, outlet]);

  useEffect(() => {
    if (currentOutlet && visible) {
      setLoadingServices(true);
      fetchOutletServices(currentOutlet.id)
        .then((items) => {
          let list = items;
          if (initialCategory) {
            const filtered = items.filter((s) =>
              matchesCategory(s, initialCategory),
            );
            if (filtered.length > 0) list = filtered; // jika tidak ada yang cocok, tampilkan semua
          }
          setServices(list);
          setSelectedService(list[0] ?? null);
        })
        .finally(() => setLoadingServices(false));
    }
  }, [currentOutlet, visible, initialCategory]);

  // Countdown timer 15 menit untuk layar pembayaran simulasi
  useEffect(() => {
    if (step !== "payment") return;
    const interval = setInterval(() => {
      setPaymentTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  if (!currentOutlet) return null;

  const handleTogglePicker = async () => {
    const next = !showOutletPicker;
    setShowOutletPicker(next);
    if (next && outletOptions.length === 0) {
      setLoadingOutlets(true);
      try {
        const data = await getLiveOutlets();
        setOutletOptions(data);
      } finally {
        setLoadingOutlets(false);
      }
    }
  };

  const handlePickOutlet = (o: Outlet) => {
    setCurrentOutlet(o);
    setShowOutletPicker(false);
  };

  const unitPrice = selectedService ? selectedService.price : 0;
  const unitLabel = selectedService?.pricingType === "per_item" ? "item" : "kg";
  const totalEstimate = unitPrice * quantity;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCreateOrder = async () => {
    if (!selectedService) {
      Alert.alert(
        "Perhatian",
        "Silakan pilih layanan laundry terlebih dahulu.",
      );
      return;
    }

    setSubmitting(true);
    const { order, error } = await createCustomerOrder({
      customerId,
      outletId: currentOutlet.id,
      outletName: currentOutlet.name,
      service: selectedService,
      quantity,
      handoverMethod,
      paymentMethod,
      notes: (handoverMethod === "pickup_delivery" ? `[Jemput: ${pickupTimeSlot}] ${clothingNotes}` : clothingNotes).trim() || undefined,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert("Gagal Membuat Pesanan", error);
    } else if (order) {
      if (paymentMethod === "digital") {
        setCreatedOrder(order);
        setStep("payment");
      } else {
        Alert.alert(
          "Pesanan Berhasil Dibuat! 🎉",
          `Nomor pesanan: ${order.orderNumber}\nMetode: Tunai.\nOutlet akan segera memproses pesanan Anda.`,
          [
            {
              text: "Lihat Pesanan Saya",
              onPress: () => onOrderSuccess(order),
            },
          ],
        );
      }
    }
  };

  const handleSimulatePayment = async () => {
    if (!createdOrder) return;
    setSimulatingPay(true);
    const { success, error } = await confirmDigitalPaymentSimulation({
      orderId: createdOrder.id,
      customerId,
      amount: createdOrder.subtotalEstimate,
    });
    setSimulatingPay(false);

    if (success) {
      Alert.alert(
        "Pembayaran Berhasil! 🎉",
        `Pembayaran simulasi Rp${createdOrder.subtotalEstimate.toLocaleString("id-ID")} untuk pesanan ${createdOrder.orderNumber} telah diterima.\nStatus pesanan kini diteruskan ke Mitra.`,
        [
          {
            text: "Lihat Pesanan Saya",
            onPress: () => {
              onOrderSuccess(createdOrder);
            },
          },
        ],
      );
    } else {
      Alert.alert("Gagal", error || "Gagal memproses pembayaran simulasi");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />

          {step === "payment" && createdOrder ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
            >
              <View style={styles.payHeader}>
                <View style={styles.payHeaderBadge}>
                  <Text style={styles.payHeaderEmoji}>💳</Text>
                </View>
                <Text style={styles.payHeaderTitle}>Pembayaran Digital</Text>
                <Text style={styles.payHeaderSub}>
                  Selesaikan pembayaran simulasi sebelum batas waktu
                </Text>
              </View>

              <View style={styles.payAmountCard}>
                <Text style={styles.payAmountLabel}>TOTAL TAGIHAN</Text>
                <Text style={styles.payAmountValue}>
                  Rp{createdOrder.subtotalEstimate.toLocaleString("id-ID")}
                </Text>
                <View style={styles.payOrderMetaRow}>
                  <Text style={styles.payOrderMetaText}>
                    No. Pesanan: {createdOrder.orderNumber}
                  </Text>
                  <View style={styles.timerBadge}>
                    <Text style={styles.timerText}>
                      ⏱️ {formatTimer(paymentTimer)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Mockup QRIS */}
              <View style={styles.qrisCard}>
                <View style={styles.qrisHeader}>
                  <Text style={styles.qrisTitle}>QRIS STANDAR NASIONAL</Text>
                  <Text style={styles.qrisTag}>NMID: ID1020304050</Text>
                </View>
                <View style={styles.qrisBox}>
                  <Text style={{ fontSize: 40, marginBottom: 6 }}>📱</Text>
                  <Text style={styles.qrisPatternText}>
                    [ SIMULASI QR CODE ]
                  </Text>
                  <Text style={styles.qrisSubtext}>MyLaundry Instant Pay</Text>
                </View>
                <Text style={styles.qrisFooter}>
                  Bisa di-scan via GoPay, OVO, Dana, ShopeePay & Mobile Banking
                </Text>
              </View>

              {/* Mockup Virtual Account */}
              <View style={styles.vaCard}>
                <Text style={styles.vaLabel}>
                  Nomor Virtual Account (BCA / Mandiri / BRI):
                </Text>
                <View style={styles.vaRow}>
                  <Text style={styles.vaNumber}>8808 1234 5678 9012</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() =>
                      Alert.alert(
                        "Tersalin",
                        "Nomor Virtual Account berhasil disalin.",
                      )
                    }
                  >
                    <Text style={styles.copyBtnText}>Salin</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Catatan Simulasi Testing */}
              <View style={styles.testNoteBox}>
                <Text style={styles.testNoteTitle}>
                  ⚡ Area Simulasi Testing
                </Text>
                <Text style={styles.testNoteText}>
                  Dalam mode pengujian ini, klik tombol di bawah untuk
                  mensimulasikan notifikasi sukses pembayaran secara langsung.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.simulateSuccessBtn}
                onPress={handleSimulatePayment}
                disabled={simulatingPay}
                activeOpacity={0.85}
              >
                {simulatingPay ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.simulateSuccessBtnText}>
                    ⚡ Bayar Sekarang (Simulasikan Berhasil)
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.payLaterBtn}
                onPress={() => onOrderSuccess(createdOrder)}
                activeOpacity={0.7}
              >
                <Text style={styles.payLaterBtnText}>
                  Bayar Nanti di Tab Pesanan
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
            >
              {/* Outlet Header */}
              <View style={styles.outletHeader}>
                <View style={styles.outletBadge}>
                  <Text style={styles.outletBadgeEmoji}>🧺</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.outletName}>{currentOutlet.name}</Text>
                  <Text style={styles.outletAddress}>
                    {currentOutlet.address || "Alamat belum diatur"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={handleTogglePicker}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeBtnText}>
                    {showOutletPicker ? "Tutup" : "Ganti"}
                  </Text>
                </TouchableOpacity>
              </View>

              {showOutletPicker && (
                <View style={styles.pickerBox}>
                  {loadingOutlets ? (
                    <ActivityIndicator
                      size="small"
                      color="#0878f9"
                      style={{ marginVertical: 12 }}
                    />
                  ) : (
                    outletOptions.map((o) => {
                      const active = o.id === currentOutlet.id;
                      return (
                        <TouchableOpacity
                          key={o.id}
                          style={[
                            styles.pickerItem,
                            active && styles.pickerItemActive,
                          ]}
                          onPress={() => handlePickOutlet(o)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.pickerName,
                              active && styles.pickerNameActive,
                            ]}
                          >
                            {o.name}
                          </Text>
                          <Text style={styles.pickerSub} numberOfLines={1}>
                            {o.distance} • {o.address}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {/* Section: Pilih Layanan */}
              <Text style={styles.sectionTitle}>
                {initialCategory
                  ? `1. LAYANAN: ${CATEGORY_LABEL[initialCategory].toUpperCase()}`
                  : "1. PILIH LAYANAN"}
              </Text>
              {loadingServices ? (
                <ActivityIndicator
                  size="small"
                  color="#0878f9"
                  style={{ marginVertical: 14 }}
                />
              ) : (
                <View style={styles.serviceList}>
                  {services.map((srv) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <TouchableOpacity
                        key={srv.id}
                        style={[
                          styles.serviceOption,
                          isSelected && styles.serviceOptionActive,
                        ]}
                        onPress={() => setSelectedService(srv)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.serviceName,
                              isSelected && styles.serviceNameActive,
                            ]}
                          >
                            {srv.name}
                          </Text>
                          <Text style={styles.serviceEta}>
                            Estimasi: {srv.durationHours} jam
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.servicePrice,
                            isSelected && styles.servicePriceActive,
                          ]}
                        >
                          Rp{srv.price.toLocaleString("id-ID")} /{unitLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Section: Estimasi Berat / Kuantitas */}
              <Text style={styles.sectionTitle}>
                2. ESTIMASI JUMLAH ({unitLabel.toUpperCase()})
              </Text>
              <View style={styles.stepperContainer}>
                <Text style={styles.stepperHint}>
                  Berapa perkiraan {unitLabel} pakaian Anda?
                </Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      quantity <= 1 && styles.stepperBtnDisabled,
                    ]}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.stepperValueBox}>
                    <Text style={styles.stepperValue}>{quantity}</Text>
                    <Text style={styles.stepperUnit}>{unitLabel}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuantity(quantity + 1)}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.weightNote}>
                  * Berat aktual akan ditimbang ulang secara akurat oleh mitra
                  saat pakaian diterima.
                </Text>
              </View>

              {/* Section: Metode Penyerahan */}
              <Text style={styles.sectionTitle}>3. METODE PENYERAHAN</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    handoverMethod === "pickup_delivery" &&
                      styles.optionCardActive,
                  ]}
                  onPress={() => setHandoverMethod("pickup_delivery")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionEmoji}>🛵</Text>
                  <Text style={styles.optionTitle}>Antar-Jemput</Text>
                  <Text style={styles.optionSub}>Kurir jemput pakaian</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    handoverMethod === "drop_off" && styles.optionCardActive,
                  ]}
                  onPress={() => setHandoverMethod("drop_off")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionEmoji}>🏪</Text>
                  <Text style={styles.optionTitle}>Drop-Off</Text>
                  <Text style={styles.optionSub}>Antar sendiri ke outlet</Text>
                </TouchableOpacity>
              </View>

              {/* Section: Metode Pembayaran */}
              <Text style={styles.sectionTitle}>4. METODE PEMBAYARAN</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    paymentMethod === "digital" && styles.optionCardActive,
                  ]}
                  onPress={() => setPaymentMethod("digital")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionEmoji}>📱</Text>
                  <Text style={styles.optionTitle}>Digital (Simulasi)</Text>
                  <Text style={styles.optionSub}>QRIS / E-Wallet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    paymentMethod === "cash" && styles.optionCardActive,
                  ]}
                  onPress={() => setPaymentMethod("cash")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionEmoji}>💵</Text>
                  <Text style={styles.optionTitle}>Tunai</Text>
                  <Text style={styles.optionSub}>Bayar saat serah terima</Text>
                </TouchableOpacity>
              </View>

              {/* Section: Catatan Pakaian & Jadwal Jemput */}
              <Text style={styles.sectionTitle}>5. CATATAN & JADWAL JEMPUT</Text>

              {handoverMethod === "pickup_delivery" && (
                <View style={styles.pickupTimeContainer}>
                  <Text style={styles.inputLabel}>
                    Pilihan Waktu Penjemputan (Pickup):
                  </Text>
                  <View style={styles.timeSlotRow}>
                    {[
                      "Pagi (08:00 - 11:00)",
                      "Siang (11:00 - 14:00)",
                      "Sore (15:00 - 18:00)",
                    ].map((slot) => {
                      const isSelected = pickupTimeSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.timeSlotPill,
                            isSelected && styles.timeSlotPillActive,
                          ]}
                          onPress={() => setPickupTimeSlot(slot)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextActive,
                            ]}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.notesContainer}>
                <Text style={styles.inputLabel}>
                  Rincian Pakaian / Instruksi Khusus:
                </Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Misal: 3 kemeja kerja putih, 2 celana jeans. Tolong pisahkan warna luntur..."
                  placeholderTextColor="#94a3b8"
                  value={clothingNotes}
                  onChangeText={setClothingNotes}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.notesHelper}>
                  *Membantu mitra memverifikasi pakaian & mencegah risiko tertukar atau hilang.
                </Text>
              </View>

              {/* Ringkasan Estimasi Biaya */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {selectedService?.name || "Layanan"} ({quantity} {unitLabel}
                    )
                  </Text>
                  <Text style={styles.summaryVal}>
                    Rp{totalEstimate.toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Metode</Text>
                  <Text style={styles.summaryVal}>
                    {handoverMethod === "pickup_delivery"
                      ? "Antar-Jemput"
                      : "Drop-Off"}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.totalLabel}>Total Estimasi Biaya</Text>
                  <Text style={styles.totalVal}>
                    Rp{totalEstimate.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>

              {/* Tombol Aksi */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateOrder}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Konfirmasi & Buat Pesanan
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 35, 77, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingTop: 12,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 12,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  outletHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f8ff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  outletBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2493ff",
    justifyContent: "center",
    alignItems: "center",
  },
  outletBadgeEmoji: {
    fontSize: 22,
  },
  outletName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#09234d",
  },
  outletAddress: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  changeBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0878f9",
  },
  pickerBox: {
    marginTop: -10,
    marginBottom: 16,
    gap: 8,
  },
  pickerItem: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  pickerItemActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2493ff",
  },
  pickerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  pickerNameActive: {
    color: "#0878f9",
  },
  pickerSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  serviceList: {
    marginBottom: 16,
    gap: 8,
  },
  serviceOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
  },
  serviceOptionActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2493ff",
  },
  serviceName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  serviceNameActive: {
    color: "#0878f9",
  },
  serviceEta: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },
  servicePriceActive: {
    color: "#0878f9",
  },
  stepperContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  stepperHint: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2493ff",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperBtnDisabled: {
    backgroundColor: "#cbd5e1",
  },
  stepperBtnText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  stepperValueBox: {
    alignItems: "center",
    minWidth: 70,
  },
  stepperValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#09234d",
  },
  stepperUnit: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  weightNote: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 14,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  optionCardActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2493ff",
  },
  optionEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#09234d",
  },
  optionSub: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#09234d",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  summaryVal: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 0,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#93c5fd",
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  submitBtn: {
    backgroundColor: "#0878f9",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0878f9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  payHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  payHeaderBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  payHeaderEmoji: {
    fontSize: 24,
  },
  payHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#09234d",
  },
  payHeaderSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    textAlign: "center",
  },
  payAmountCard: {
    backgroundColor: "#09234d",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  payAmountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#93c5fd",
    letterSpacing: 0.5,
  },
  payAmountValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginVertical: 4,
  },
  payOrderMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  payOrderMetaText: {
    fontSize: 11,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  timerBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  timerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fca5a5",
  },
  qrisCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
    alignItems: "center",
  },
  qrisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  qrisTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  qrisTag: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  qrisBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
  },
  qrisPatternText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    letterSpacing: 1,
  },
  qrisSubtext: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  qrisFooter: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    marginTop: 10,
  },
  vaCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  vaLabel: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    marginBottom: 6,
  },
  vaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  vaNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  testNoteBox: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 16,
  },
  testNoteTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400e",
    marginBottom: 2,
  },
  testNoteText: {
    fontSize: 11,
    color: "#78350f",
    lineHeight: 16,
  },
  simulateSuccessBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  simulateSuccessBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  payLaterBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  pickupTimeContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  timeSlotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlotPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  timeSlotPillActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#0878f9",
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  timeSlotTextActive: {
    color: "#0878f9",
    fontWeight: "700",
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#0f172a",
    textAlignVertical: "top",
    minHeight: 64,
  },
  notesHelper: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 6,
    fontStyle: "italic",
  },
  payLaterBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
});
