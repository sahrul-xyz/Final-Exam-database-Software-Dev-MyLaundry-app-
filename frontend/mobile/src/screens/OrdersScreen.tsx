import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { CustomerOrder } from "../types";
import {
  fetchCustomerOrders,
  submitCustomerReview,
  submitCustomerComplaint,
  respondToPriceAdjustment,
  confirmDigitalPaymentSimulation,
  subscribeToCustomerOrders,
} from "../services/supabase";

export function OrdersScreen({
  customerId,
}: {
  customerId?: string;
}) {
  const [tab, setTab] = useState<"aktif" | "riwayat">("aktif");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [reviewOrder, setReviewOrder] = useState<CustomerOrder | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [complaintOrder, setComplaintOrder] = useState<CustomerOrder | null>(null);
  const [complaintReason, setComplaintReason] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!customerId) return;
    const data = await fetchCustomerOrders(customerId);
    setOrders(data);
  };

  useEffect(() => {
    if (customerId) {
      setLoading(true);
      loadOrders().finally(() => setLoading(false));

      // Realtime subscription agar status pengerjaan laundry langsung update
      const unsubscribe = subscribeToCustomerOrders(() => {
        loadOrders();
      });
      return () => unsubscribe();
    }
  }, [customerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  // Handlers untuk persetujuan biaya & pembayaran simulasi
  const handleConfirmPayment = async (order: CustomerOrder) => {
    if (!customerId) return;
    setProcessingAction(order.id);
    const { success, error } = await confirmDigitalPaymentSimulation({
      orderId: order.id,
      customerId,
      amount: order.finalServiceAmount || order.subtotalEstimate,
    });
    setProcessingAction(null);
    if (success) {
      Alert.alert(
        "Pembayaran Berhasil",
        "Pembayaran digital simulasi telah terkonfirmasi. Pesanan diteruskan ke Mitra."
      );
      loadOrders();
    } else {
      Alert.alert("Gagal", error || "Gagal memproses pembayaran");
    }
  };

  const handleRespondPrice = async (order: CustomerOrder, approved: boolean) => {
    if (!customerId) return;
    setProcessingAction(order.id);
    const { success, error } = await respondToPriceAdjustment({
      orderId: order.id,
      customerId,
      approved,
    });
    setProcessingAction(null);
    if (success) {
      Alert.alert(
        approved ? "Biaya Disetujui" : "Pesanan Dibatalkan",
        approved
          ? "Penyesuaian biaya disetujui. Mitra akan segera mulai mencuci pakaian Anda."
          : "Penyesuaian biaya ditolak dan pesanan telah dibatalkan."
      );
      loadOrders();
    } else {
      Alert.alert("Gagal", error || "Gagal merespons penyesuaian biaya");
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewOrder || !customerId || submittingReview) return;
    if (!reviewComment.trim()) {
      Alert.alert("Ulasan belum lengkap", "Tulis komentar ulasan terlebih dahulu.");
      return;
    }

    setSubmittingReview(true);
    try {
      const { success, error } = await submitCustomerReview({
        orderId: reviewOrder.id,
        customerId,
        outletId: reviewOrder.outletId,
        rating,
        comment: reviewComment.trim(),
      });

      if (success) {
        setReviewOrder(null);
        setReviewComment("");
        setRating(5);
        await loadOrders();
        Alert.alert("Terima Kasih!", "Ulasan dan rating Anda telah berhasil dikirim.");
      } else {
        Alert.alert("Gagal mengirim ulasan", error || "Gagal mengirim ulasan. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("Gagal mengirim ulasan dari layar pesanan:", err);
      Alert.alert("Gagal", "Terjadi kesalahan. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintOrder || !customerId) return;
    if (!complaintReason.trim()) {
      Alert.alert("Peringatan", "Harap masukkan rincian komplain pakaian Anda.");
      return;
    }
    setSubmittingComplaint(true);
    const { success, error } = await submitCustomerComplaint({
      orderId: complaintOrder.id,
      customerId,
      reason: complaintReason,
    });
    setSubmittingComplaint(false);
    if (success) {
      Alert.alert(
        "Komplain Terkirim",
        "Komplain Anda telah dicatat dan diteruskan ke pihak Mitra untuk ditinjau."
      );
      setComplaintOrder(null);
      setComplaintReason("");
    } else {
      Alert.alert("Gagal", error || "Gagal mengirim komplain");
    }
  };

  const activeOrders = orders.filter(
    (o) =>
      o.status !== "completed" &&
      o.status !== "cancelled" &&
      o.status !== "rejected" &&
      o.status !== "expired"
  );

  const historyOrders = orders.filter(
    (o) =>
      o.status === "completed" ||
      o.status === "cancelled" ||
      o.status === "rejected" ||
      o.status === "expired"
  );

  // Label status berwarna. Menerima seluruh pesanan supaya bisa cek
  // metode & status pembayaran (buat teks "dana dikembalikan").
  const getStatusBadge = (order: CustomerOrder) => {
    switch (order.status) {
      case "pending_payment":
        return { label: "Menunggu Bayar", bg: "#fef3c7", color: "#d97706" };
      case "pending_partner":
        return { label: "Menunggu Mitra", bg: "#e0f2fe", color: "#0284c7" };
      case "accepted":
        return { label: "Pesanan Diterima", bg: "#dbeafe", color: "#2563eb" };
      case "awaiting_customer_approval":
        return { label: "Persetujuan Biaya", bg: "#fef3c7", color: "#b45309" };
      case "processing":
        return { label: "Sedang Dicuci", bg: "#ede9fe", color: "#7c3aed" };
      case "ready_for_pickup":
        return { label: "Siap Diambil", bg: "#dcfce7", color: "#16a34a" };
      case "completed":
        return { label: "Pesanan selesai", bg: "#dcfce7", color: "#16a34a" };
      case "cancelled":
        return { label: "Pesanan dibatalkan", bg: "#fee2e2", color: "#dc2626" };
      case "rejected": {
        const paidDigital =
          order.paymentMethod === "digital" &&
          order.paymentStatus !== "pending";
        return {
          label: paidDigital
            ? "Pesanan ditolak, dana dikembalikan"
            : "Pesanan ditolak",
          bg: "#fee2e2",
          color: "#dc2626",
        };
      }
      case "expired":
        return { label: "Kedaluwarsa (15m)", bg: "#fee2e2", color: "#dc2626" };
      default:
        return { label: order.status, bg: "#f1f5f9", color: "#64748b" };
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>AKTIVITAS</Text>
          <Text style={styles.title}>Pesanan saya</Text>
        </View>

        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segButton, tab === "aktif" && styles.segButtonActive]}
            onPress={() => setTab("aktif")}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.segText, tab === "aktif" && styles.segTextActive]}
            >
              Aktif ({activeOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segButton, tab === "riwayat" && styles.segButtonActive]}
            onPress={() => setTab("riwayat")}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.segText, tab === "riwayat" && styles.segTextActive]}
            >
              Riwayat ({historyOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="small"
            color="#0878f9"
            style={{ marginTop: 40 }}
          />
        ) : tab === "aktif" ? (
          activeOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🧺</Text>
              <Text style={styles.emptyTitle}>Tidak ada pesanan aktif</Text>
              <Text style={styles.emptyDesc}>
                Pilih outlet laundry di tab Beranda untuk mulai membuat pesanan baru.
              </Text>
            </View>
          ) : (
            <View style={styles.activeSection}>
              {activeOrders.map((order) => {
                const badge = getStatusBadge(order);
                const firstItem = order.items[0];
                const activePrice = order.finalServiceAmount || order.subtotalEstimate;

                return (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderTop}>
                      <View style={styles.logoBadge}>
                        <Text style={styles.logoEmoji}>🧺</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: badge.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: badge.color },
                            ]}
                          >
                            {badge.label}
                          </Text>
                        </View>
                        <Text style={styles.outletName}>{order.outletName}</Text>
                        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                      </View>
                    </View>

                    {/* Detail Item & Estimasi */}
                    <View style={styles.detailBox}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Layanan:</Text>
                        <Text style={styles.detailVal}>
                          {firstItem?.serviceName || "Layanan Laundry"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Jumlah:</Text>
                        <Text style={styles.detailVal}>
                          {firstItem?.quantity || 1} {firstItem?.unit || "kg"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Metode:</Text>
                        <Text style={styles.detailVal}>
                          {order.handoverMethod === "pickup_delivery"
                            ? "🛵 Antar-Jemput"
                            : "🏪 Drop-Off"}
                        </Text>
                      </View>
                      <View style={[styles.detailRow, styles.detailTotalRow]}>
                        <Text style={styles.detailTotalLabel}>
                          {order.finalServiceAmount ? "Total Tagihan:" : "Total Estimasi:"}
                        </Text>
                        <Text style={styles.detailTotalVal}>
                          Rp{activePrice.toLocaleString("id-ID")}
                        </Text>
                      </View>
                    </View>

                    {order.notes ? (
                      <View style={{ backgroundColor: "#eff6ff", padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: "#bfdbfe" }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#1d4ed8" }}>🏷️ Catatan & Jadwal Pakaian:</Text>
                        <Text style={{ fontSize: 12, color: "#1e293b", marginTop: 2 }}>{order.notes}</Text>
                      </View>
                    ) : null}

                    {/* Status 1: Menunggu Persetujuan Biaya dari Pelanggan */}
                    {order.status === "awaiting_customer_approval" && (
                      <View style={styles.actionBanner}>
                        <Text style={styles.actionBannerTitle}>
                          ⚠️ Penyesuaian Berat & Biaya dari Mitra
                        </Text>
                        <Text style={styles.actionBannerText}>
                          Mitra telah menimbang pakaian Anda. Total biaya disesuaikan menjadi{" "}
                          <Text style={{ fontWeight: "700", color: "#b45309" }}>
                            Rp{activePrice.toLocaleString("id-ID")}
                          </Text>
                          .
                        </Text>
                        <View style={styles.actionBtnRow}>
                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnReject]}
                            onPress={() => handleRespondPrice(order, false)}
                            disabled={processingAction === order.id}
                          >
                            <Text style={styles.btnRejectText}>Tolak</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnApprove]}
                            onPress={() => handleRespondPrice(order, true)}
                            disabled={processingAction === order.id}
                          >
                            <Text style={styles.btnApproveText}>
                              {processingAction === order.id ? "Memproses..." : "Setujui Biaya"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Status 2: Menunggu Pembayaran Digital Simulasi */}
                    {order.status === "pending_payment" && (
                      <View style={[styles.actionBanner, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                        <Text style={[styles.actionBannerTitle, { color: "#1d4ed8" }]}>
                          💳 Pembayaran Digital Simulasi
                        </Text>
                        <Text style={styles.actionBannerText}>
                          Selesaikan simulasi pembayaran sebelum tenggat 15 menit berakhir.
                        </Text>
                        <TouchableOpacity
                          style={[styles.btnAction, styles.btnApprove, { marginTop: 8 }]}
                          onPress={() => handleConfirmPayment(order)}
                          disabled={processingAction === order.id}
                        >
                          <Text style={styles.btnApproveText}>
                            {processingAction === order.id
                              ? "Memverifikasi..."
                              : "✓ Konfirmasi Pembayaran (Simulasi)"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )
        ) : (
          <View style={styles.historySection}>
            {historyOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📜</Text>
                <Text style={styles.emptyTitle}>Belum ada riwayat pesanan</Text>
                <Text style={styles.emptyDesc}>
                  Pesanan yang telah selesai atau dibatalkan akan muncul di sini.
                </Text>
              </View>
            ) : (
              historyOrders.map((item) => {
                const isCompleted = item.status === "completed";
                const activePrice = item.finalServiceAmount || item.subtotalEstimate;
                const badge = getStatusBadge(item);

                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyHead}>
                      <Text style={styles.historyOutlet}>{item.outletName}</Text>
                      <Text style={styles.historyDate}>{item.serviceDate}</Text>
                    </View>

                    {/* Label status berwarna */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: badge.bg, marginTop: 6, marginBottom: 0 },
                      ]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: badge.color }]}
                      >
                        {badge.label}
                      </Text>
                    </View>

                    <Text style={styles.historyService}>
                      {item.items[0]?.serviceName} • {item.items[0]?.quantity}{" "}
                      {item.items[0]?.unit}
                    </Text>
                    <View style={styles.historyFoot}>
                      <Text style={styles.historyPrice}>
                        Rp{activePrice.toLocaleString("id-ID")}
                      </Text>
                      <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                    </View>

                    {item.notes ? (
                      <View style={{ backgroundColor: "#f8fafc", padding: 8, borderRadius: 6, marginTop: 6, borderWidth: 1, borderColor: "#e2e8f0" }}>
                        <Text style={{ fontSize: 11, color: "#475569" }}>🏷️ {item.notes}</Text>
                      </View>
                    ) : null}

                    {/* Tombol Ulasan & Komplain untuk Pesanan Selesai */}
                    {isCompleted && (
                      <View style={styles.historyButtonsRow}>
                        {item.hasReview ? (
                          <View style={[styles.reviewBtn, styles.reviewBtnDone]}>
                            <Text style={[styles.reviewBtnText, styles.reviewBtnDoneText]}>
                              ✓ Sudah Diulas
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.reviewBtn}
                            onPress={() => {
                              setRating(5);
                              setReviewComment("");
                              setReviewOrder(item);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.reviewBtnText}>⭐ Beri Ulasan</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.complaintBtn}
                          onPress={() => setComplaintOrder(item)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.complaintBtnText}>⚠️ Komplain (Maks 1 Jam)</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: FORM RATING & ULASAN BINTANG (PRD 4.1 A) */}
      {reviewOrder && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReviewOrder(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalDialog}>
              <Text style={styles.modalTitle}>Beri Ulasan & Rating</Text>
              <Text style={styles.modalSubtitle}>
                Bagaimana pengalaman laundry Anda di {reviewOrder.outletName}?
              </Text>

              {/* Pemilihan 1 - 5 Bintang */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starTouch}
                  >
                    <Text style={[styles.starIcon, rating >= star && styles.starIconActive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.textInput}
                placeholder="Tulis ulasan Anda (misal: wangi, rapi, tepat waktu)..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
                value={reviewComment}
                onChangeText={setReviewComment}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setReviewOrder(null)}
                  disabled={submittingReview}
                >
                  <Text style={styles.modalBtnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  <Text style={styles.modalBtnSubmitText}>
                    {submittingReview ? "Mengirim..." : "Kirim Ulasan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: FORM KOMPLAIN PELANGGAN (PRD 4.1 A) */}
      {complaintOrder && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setComplaintOrder(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalDialog}>
              <Text style={styles.modalTitle}>Ajukan Komplain</Text>
              <View style={styles.complaintNotice}>
                <Text style={styles.complaintNoticeText}>
                  ℹ️ Sesuai kebijakan PRD Bab 4.1 A, komplain diajukan maksimal 1 jam setelah
                  pesanan diserahkan.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Alasan & Detail Keluhan:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Pakaian luntur, pakaian tertukar, atau noda belum hilang..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={complaintReason}
                onChangeText={setComplaintReason}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setComplaintOrder(null)}
                  disabled={submittingComplaint}
                >
                  <Text style={styles.modalBtnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnDanger]}
                  onPress={handleSubmitComplaint}
                  disabled={submittingComplaint}
                >
                  <Text style={styles.modalBtnSubmitText}>
                    {submittingComplaint ? "Mengirim..." : "Ajukan Komplain"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf7ff",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#09234d",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#dbeaf7",
    padding: 3,
    borderRadius: 12,
    marginBottom: 16,
  },
  segButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 9,
  },
  segButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  segTextActive: {
    color: "#0878f9",
    fontWeight: "700",
  },
  activeSection: {
    gap: 14,
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2ecf7",
    shadowColor: "#09234d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f0f7ff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoEmoji: {
    fontSize: 22,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  outletName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#09234d",
  },
  orderNumber: {
    fontSize: 11,
    color: "#94a3b8",
  },
  detailBox: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  detailVal: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e293b",
  },
  detailTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    marginTop: 6,
    marginBottom: 0,
  },
  detailTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#09234d",
  },
  detailTotalVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0878f9",
  },
  actionBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  actionBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  actionBannerText: {
    fontSize: 11,
    color: "#78350f",
    lineHeight: 16,
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  btnApprove: {
    backgroundColor: "#0878f9",
  },
  btnApproveText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  btnReject: {
    backgroundColor: "#fee2e2",
  },
  btnRejectText: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e2ecf7",
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#09234d",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  historySection: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2ecf7",
  },
  historyHead: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyOutlet: {
    fontSize: 13,
    fontWeight: "700",
    color: "#09234d",
  },
  historyDate: {
    fontSize: 10,
    color: "#94a3b8",
  },
  historyService: {
    fontSize: 11,
    color: "#64748b",
    marginVertical: 6,
  },
  historyFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  historyPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0878f9",
  },
  historyButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  reviewBtn: {
    flex: 1,
    backgroundColor: "#eff6ff",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  reviewBtnText: {
    fontSize: 11,
    color: "#0878f9",
    fontWeight: "700",
  },
  reviewBtnDone: {
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
  },
  reviewBtnDoneText: {
    color: "#15803d",
  },
  complaintBtn: {
    flex: 1.2,
    backgroundColor: "#fef2f2",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  complaintBtnText: {
    fontSize: 11,
    color: "#dc2626",
    fontWeight: "700",
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(9, 35, 77, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalDialog: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#09234d",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  starTouch: {
    padding: 4,
  },
  starIcon: {
    fontSize: 32,
    color: "#cbd5e1",
  },
  starIconActive: {
    color: "#f59e0b",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: "#09234d",
    textAlignVertical: "top",
    minHeight: 70,
    marginBottom: 16,
  },
  complaintNotice: {
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  complaintNoticeText: {
    fontSize: 11,
    color: "#92400e",
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#f1f5f9",
  },
  modalBtnCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  modalBtnSubmit: {
    backgroundColor: "#0878f9",
  },
  modalBtnDanger: {
    backgroundColor: "#dc2626",
  },
  modalBtnSubmitText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
});