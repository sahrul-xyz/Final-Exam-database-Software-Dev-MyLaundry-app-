import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { PartnerPage, PartnerOrder, OrderStatus } from "../../types";
import { laundryPhoto } from "../../utils/mockData";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  WebShell,
  WebHeader,
  Stat,
  PanelTitle,
} from "../../components/layout/WebShell";
import {
  UserProfile,
  fetchPartnerOrders,
  updateOrderStatus,
  updateOrderActualWeight,
  subscribeToOrders,
  claimDefaultOutletIfUnowned,
  fetchPartnerOutlet,
  savePartnerOutlet,
  fetchPartnerServices,
  updatePartnerServicePrice,
  savePartnerService,
  deletePartnerService,
  PartnerServiceData,
  uploadOutletPhoto,
  fetchPartnerComplaints,
  resolvePartnerComplaint,
} from "../../services/supabase";

export function PartnerDashboard({
  currentUser,
}: {
  currentUser?: UserProfile | null;
}) {
  const [page, setPage] = useState<PartnerPage>("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [toast, setToast] = useState("");
  const [orderFilter, setOrderFilter] = useState<"all" | "new" | "processing" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [weighingOrder, setWeighingOrder] = useState<PartnerOrder | null>(null);
  const [actualWeightInput, setActualWeightInput] = useState<string>("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const loadOrders = useCallback(async () => {
    if (!currentUser?.id) {
      setLoadingOrders(false);
      return;
    }
    try {
      const data = await fetchPartnerOrders(currentUser.id);
      setOrders(data);
    } catch (err) {
      console.error("Gagal memuat pesanan:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadOrders();

    // Klaim outlet jika mitra belum terhubung
    if (currentUser?.id) {
      claimDefaultOutletIfUnowned(currentUser.id).then();
    }

    // Berlangganan event perubahan pesanan secara Realtime
    const unsubscribe = subscribeToOrders(() => {
      notify("🔔 Ada perubahan atau pesanan baru masuk!");
      loadOrders();
    });

    return () => {
      unsubscribe();
    };
  }, [loadOrders, currentUser?.id]);

  // Statistik Dinamis
  const stats = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const pending = orders.filter(
      (o) => o.status === "pending_partner" || o.status === "pending_payment"
    ).length;
    const processing = orders.filter(
      (o) => o.status === "processing" || o.status === "accepted"
    ).length;

    const totalRevenue = orders
      .filter((o) => o.status === "completed")
      .reduce(
        (acc, curr) => acc + (curr.final_service_amount || curr.subtotal_estimate || 0),
        0
      );

    return { total, completed, pending, processing, totalRevenue };
  }, [orders]);

  // Filter Pesanan
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter tab
      if (orderFilter === "new") {
        if (order.status !== "pending_partner" && order.status !== "pending_payment") {
          return false;
        }
      } else if (orderFilter === "processing") {
        if (order.status !== "accepted" && order.status !== "processing") {
          return false;
        }
      } else if (orderFilter === "completed") {
        if (order.status !== "ready_for_pickup" && order.status !== "completed") {
          return false;
        }
      }

      // Filter pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = order.order_number.toLowerCase().includes(q);
        const matchesName = order.customer_name.toLowerCase().includes(q);
        if (!matchesNumber && !matchesName) return false;
      }

      return true;
    });
  }, [orders, orderFilter, searchQuery]);

  const newOrdersList = useMemo(() => {
    return orders.filter(
      (o) => o.status === "pending_partner" || o.status === "pending_payment"
    );
  }, [orders]);

  // Aksi Mitra
  const handleAcceptOrder = async (order: PartnerOrder) => {
    notify(`Menerima pesanan ${order.order_number}...`);
    const res = await updateOrderStatus(
      order.id,
      "accepted",
      "Pesanan diterima oleh Mitra. Silakan antarkan atau serahkan laundry ke outlet."
    );
    if (res.success) {
      notify(`Pesanan ${order.order_number} berhasil diterima!`);
      loadOrders();
    } else {
      notify(`Gagal: ${res.error}`);
    }
  };

  const handleRejectOrder = async (order: PartnerOrder) => {
    if (!window.confirm(`Yakin ingin menolak pesanan ${order.order_number}?`)) return;
    notify(`Menolak pesanan ${order.order_number}...`);
    const res = await updateOrderStatus(
      order.id,
      "rejected",
      "Pesanan ditolak oleh Mitra karena outlet sedang penuh."
    );
    if (res.success) {
      notify(`Pesanan ${order.order_number} telah ditolak.`);
      loadOrders();
    } else {
      notify(`Gagal: ${res.error}`);
    }
  };

  const handleOpenWeighing = (order: PartnerOrder) => {
    const defaultKg = order.items?.[0]?.quantity || 3;
    setWeighingOrder(order);
    setActualWeightInput(String(defaultKg));
  };

  const handleSaveActualWeight = async () => {
    if (!weighingOrder) return;
    const kg = parseFloat(actualWeightInput.replace(",", "."));
    if (isNaN(kg) || kg <= 0) {
      alert("Masukkan berat aktual yang valid (angka lebih dari 0)!");
      return;
    }

    setSavingWeight(true);
    const unitPrice = weighingOrder.items?.[0]?.unit_price_snapshot || 8000;
    const finalAmount = Math.round(kg * unitPrice);
    const res = await updateOrderActualWeight(
      weighingOrder.id,
      kg,
      unitPrice,
      `Timbangan aktual ${kg} kg dikonfirmasi mitra. Total tagihan fix Rp${finalAmount.toLocaleString("id-ID")}. Menunggu konfirmasi pembayaran pelanggan.`
    );
    setSavingWeight(false);

    if (res.success) {
      notify(`Berat ${kg} kg disimpan! Tagihan fix Rp${finalAmount.toLocaleString("id-ID")} dikirim ke pelanggan. Menunggu pembayaran.`);
      setWeighingOrder(null);
      loadOrders();
    } else {
      notify(`Gagal menyimpan: ${res.error}`);
    }
  };

  const handleStatusTransition = async (
    order: PartnerOrder,
    nextStatus: OrderStatus,
    label: string
  ) => {
    notify(`Memperbarui pesanan ${order.order_number}...`);
    const res = await updateOrderStatus(order.id, nextStatus);
    if (res.success) {
      notify(`Status pesanan diperbarui menjadi '${label}'!`);
      loadOrders();
    } else {
      notify(`Gagal: ${res.error}`);
    }
  };

  const partnerGreeting = currentUser?.fullName
    ? `Selamat datang, ${currentUser.fullName}`
    : "Selamat datang, Bersih Laundry";

  const todayFormatted = new Date()
    .toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <WebShell
      page={page}
      setPage={setPage}
      outletName={currentUser?.fullName || "Bersih Laundry"}
    >
      <WebHeader
        eyebrow={todayFormatted}
        title={
          page === "dashboard"
            ? partnerGreeting
            : page === "pesanan"
            ? "Manajemen Pesanan"
            : page === "keuangan"
            ? "Keuangan & Payout Simulasi"
            : "Kelola Outlet"
        }
        subtitle={
          page === "dashboard"
            ? "Ringkasan operasional dan pesanan real-time outletmu."
            : page === "pesanan"
            ? "Terima pesanan masuk, konfirmasi berat riil, dan perbarui status."
            : page === "keuangan"
            ? "Laporan komisi platform 5%, buku besar (ledger), dan riwayat payout simulasi."
            : "Pengaturan profil outlet, layanan cuci, dan tarif."
        }
        hasNotification={newOrdersList.length > 0}
        onNotifications={() => setShowNotifications(!showNotifications)}
      />

      {page === "dashboard" && (
        <>
          <div className="stats-grid">
            <Stat
              icon="orders"
              label="Total Pesanan"
              value={String(stats.total)}
              trend={`${stats.processing} sedang diproses`}
              tone="blue"
              hideIcon
            />
            <Stat
              icon="clock"
              label="Pesanan Baru"
              value={String(stats.pending)}
              trend={stats.pending > 0 ? "Perlu konfirmasi segera" : "Semua tertangani"}
              tone={stats.pending > 0 ? "amber" : "blue"}
            />
            <Stat
              icon="check"
              label="Pesanan Selesai"
              value={String(stats.completed)}
              trend="Siap & telah diserahkan"
              tone="green"
            />
            <Stat
              icon="wallet"
              label="Estimasi Pendapatan"
              value={`Rp${stats.totalRevenue.toLocaleString("id-ID")}`}
              trend="Berdasarkan pesanan selesai"
              tone="purple"
            />
          </div>

          <div className="dashboard-grid">
            <section className="panel order-panel">
              <PanelTitle
                title="Pesanan Terbaru"
                subtitle="Daftar pesanan aktif yang perlu dipantau"
                action="Lihat Semua"
                onAction={() => setPage("pesanan")}
              />
              <OrderTable
                orders={orders.slice(0, 5)}
                loading={loadingOrders}
                compact
                onAccept={handleAcceptOrder}
                onReject={handleRejectOrder}
                onOpenWeighing={handleOpenWeighing}
                onStatusTransition={handleStatusTransition}
                onViewDetail={setSelectedOrder}
              />
            </section>

            <section className="panel activity-panel">
              <PanelTitle
                title="Aktivitas Terbaru"
                subtitle="Riwayat pembaruan status pesanan"
              />
              <Timeline orders={orders.slice(0, 5)} />
            </section>
          </div>
        </>
      )}

      {page === "pesanan" && (
        <section className="panel full-panel">
          <div className="table-toolbar">
            <div className="segmented web">
              <button
                className={orderFilter === "all" ? "active" : ""}
                onClick={() => setOrderFilter("all")}
              >
                Semua <span>{orders.length}</span>
              </button>
              <button
                className={orderFilter === "new" ? "active" : ""}
                onClick={() => setOrderFilter("new")}
              >
                Baru masuk <span>{stats.pending}</span>
              </button>
              <button
                className={orderFilter === "processing" ? "active" : ""}
                onClick={() => setOrderFilter("processing")}
              >
                Diproses <span>{stats.processing}</span>
              </button>
              <button
                className={orderFilter === "completed" ? "active" : ""}
                onClick={() => setOrderFilter("completed")}
              >
                Selesai <span>{stats.completed}</span>
              </button>
            </div>
            <div className="search-box web">
              <Icon name="search" />
              <input
                placeholder="Cari no. pesanan atau nama pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <OrderTable
            orders={filteredOrders}
            loading={loadingOrders}
            onAccept={handleAcceptOrder}
            onReject={handleRejectOrder}
            onOpenWeighing={handleOpenWeighing}
            onStatusTransition={handleStatusTransition}
            onViewDetail={setSelectedOrder}
          />
        </section>
      )}

      {page === "keuangan" && (
        <FinancialsManagement orders={orders} notify={notify} />
      )}

      {page === "outlet" && (
        <OutletManagement notify={notify} currentUser={currentUser} />
      )}

      {/* Popover Notifikasi Pesanan Masuk */}
      {showNotifications && (
        <PartnerNotifications
          newOrders={newOrdersList}
          close={() => setShowNotifications(false)}
          openOrders={() => {
            setShowNotifications(false);
            setOrderFilter("new");
            setPage("pesanan");
          }}
        />
      )}

      {/* Modal Input Berat Aktual */}
      {weighingOrder && (
        <div className="modal-backdrop" onClick={() => setWeighingOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">PENYESUAIAN TIMBANGAN</span>
                <h3>Input Berat Aktual</h3>
              </div>
              <button
                type="button"
                onClick={() => setWeighingOrder(null)}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  padding: "12px",
                  background: "var(--blue-50)",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "var(--muted)" }}>No. Pesanan:</span>
                  <strong>{weighingOrder.order_number}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "var(--muted)" }}>Pelanggan:</span>
                  <strong>{weighingOrder.customer_name}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Layanan:</span>
                  <strong>
                    {weighingOrder.items?.[0]?.service_name_snapshot || "Cuci Laundry"}
                  </strong>
                </div>
                {weighingOrder.notes && (
                  <div style={{ marginTop: "8px", padding: "8px", background: "#eff6ff", borderRadius: "6px", fontSize: "11px", color: "#1d4ed8" }}>
                    <strong>Catatan:</strong> {weighingOrder.notes}
                  </div>
                )}
              </div>

              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                Berat Riil Saat Diterima (kg):
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  autoFocus
                  value={actualWeightInput}
                  onChange={(e) => setActualWeightInput(e.target.value)}
                  style={{
                    flex: 1,
                    height: "44px",
                    padding: "0 12px",
                    borderRadius: "10px",
                    border: "2px solid var(--blue-500)",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--blue-950)",
                  }}
                />
                <span style={{ fontWeight: 700, color: "var(--muted)", fontSize: "14px" }}>kg</span>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  border: "1px dashed var(--line)",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Tarif Satuan: Rp
                  {(weighingOrder.items?.[0]?.unit_price_snapshot || 8000).toLocaleString("id-ID")}
                  /kg
                </span>
                <strong style={{ fontSize: "14px", color: "var(--blue-700)" }}>
                  Total Baru: Rp
                  {(
                    (parseFloat(actualWeightInput.replace(",", ".")) || 0) *
                    (weighingOrder.items?.[0]?.unit_price_snapshot || 8000)
                  ).toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setWeighingOrder(null)}>
                Batal
              </Button>
              <Button onClick={handleSaveActualWeight} disabled={savingWeight}>
                {savingWeight ? "Menyimpan..." : "Konfirmasi Timbangan & Kirim Tagihan Fix"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Pesanan */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">DETAIL TRANSAKSI</span>
                <h3>{selectedOrder.order_number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: "12px", display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Status</span>
                <Badge tone={getStatusTone(selectedOrder.status)}>
                  {getStatusLabel(selectedOrder.status)}
                </Badge>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Pelanggan</span>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "13px" }}>{selectedOrder.customer_name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "11px" }}>
                    📞 {selectedOrder.customer_phone || "-"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Alamat Pelanggan</span>
                <div style={{ textAlign: "right", maxWidth: "60%" }}>
                  <strong style={{ fontSize: "12px", color: "#1e293b", wordBreak: "break-word" }}>
                    📍 {selectedOrder.customer_address || (selectedOrder.handover_method === "drop_off" ? "Drop-off langsung ke outlet" : "Alamat belum diatur")}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Metode Serah-Terima</span>
                <strong>{selectedOrder.handover_method === "drop_off" ? "Drop-off Sendiri ke Outlet" : "Antar - Jemput Kurir"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Metode Pembayaran</span>
                <strong>
                  {selectedOrder.payment_method === "digital" ? "Transfer / QRIS (Lunas)" : "Tunai saat serah terima"}
                </strong>
              </div>

              {selectedOrder.notes && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px" }}>
                  <strong style={{ display: "block", color: "#1d4ed8", marginBottom: "4px" }}>
                    🏷️ Catatan Pakaian & Preferensi Jemput:
                  </strong>
                  <div style={{ color: "#1e293b", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              {/* Komplain dari Pelanggan (Jika ada) */}
              {selectedOrder.complaint && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ color: "#b91c1c", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                      ⚠️ Komplain Pelanggan:
                    </strong>
                    <Badge tone={selectedOrder.complaint.status === "open" ? "amber" : "green"}>
                      {selectedOrder.complaint.status === "open" ? "Perlu Solusi" : "Terselesaikan"}
                    </Badge>
                  </div>
                  <div style={{ color: "#7f1d1d", fontSize: "12px", background: "rgba(255,255,255,0.7)", padding: "8px", borderRadius: "6px" }}>
                    "{selectedOrder.complaint.reason}"
                  </div>
                  <div style={{ fontSize: "10px", color: "#991b1b", marginTop: "6px" }}>
                    Diajukan {formatRelativeTime(selectedOrder.complaint.created_at)}
                  </div>
                </div>
              )}

              {/* Ulasan dari Pelanggan */}
              {selectedOrder.review ? (
                <div style={{ background: "#fefce8", border: "1px solid #fef08a", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ color: "#854d0e", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                      ⭐ Ulasan dari Pelanggan:
                    </strong>
                    <span style={{ fontWeight: 700, color: "#a16207", fontSize: "12px" }}>
                      {"★".repeat(selectedOrder.review.rating)}{"☆".repeat(Math.max(0, 5 - selectedOrder.review.rating))} ({selectedOrder.review.rating}/5)
                    </span>
                  </div>
                  {selectedOrder.review.comment ? (
                    <div style={{ color: "#451a03", fontStyle: "italic", fontSize: "12px", background: "rgba(255,255,255,0.7)", padding: "6px 8px", borderRadius: "6px", margin: "4px 0" }}>
                      "{selectedOrder.review.comment}"
                    </div>
                  ) : (
                    <small style={{ color: "#a16207", fontSize: "11px" }}>Pelanggan tidak menyertakan komentar tertulis.</small>
                  )}
                  <div style={{ fontSize: "10px", color: "#a16207", textAlign: "right", marginTop: "4px" }}>
                    Diberikan {formatRelativeTime(selectedOrder.review.created_at)}
                  </div>
                </div>
              ) : selectedOrder.status === "completed" ? (
                <div style={{ background: "#f8fafc", border: "1px dashed var(--line)", padding: "10px", borderRadius: "8px", textAlign: "center", color: "var(--muted)", fontSize: "11px" }}>
                  ⏳ Pelanggan belum mengirimkan ulasan untuk pesanan ini.
                </div>
              ) : null}

              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                <strong style={{ display: "block", marginBottom: "6px" }}>Rincian Layanan:</strong>
                {selectedOrder.items?.map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                    <span>
                      {it.service_name_snapshot} ({it.quantity} {it.unit})
                    </span>
                    <strong>Rp{it.line_total.toLocaleString("id-ID")}</strong>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Total Tagihan:</span>
                <strong style={{ fontSize: "16px", color: "var(--blue-700)" }}>
                  Rp{(selectedOrder.final_service_amount || selectedOrder.subtotal_estimate).toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            <div className="modal-footer">
              <Button onClick={() => setSelectedOrder(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast web-toast">
          <span>
            <Icon name="check" size={15} />
          </span>
          {toast}
        </div>
      )}
    </WebShell>
  );
}

// -------------------------------------------------------------
// HELPER STATUS BADGE
// -------------------------------------------------------------
function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending_partner":
      return "Baru Masuk";
    case "pending_payment":
      return "Menunggu Pembayaran";
    case "accepted":
      return "Diterima Mitra";
    case "processing":
      return "Sedang Dicuci";
    case "ready_for_pickup":
      return "Siap Diambil";
    case "completed":
      return "Selesai";
    case "rejected":
      return "Ditolak";
    case "cancelled":
      return "Dibatalkan";
    case "expired":
      return "Kedaluwarsa (15m)";
    default:
      return status;
  }
}

function getStatusTone(status: OrderStatus): "blue" | "amber" | "green" | "red" | "gray" {
  switch (status) {
    case "pending_partner":
    case "pending_payment":
      return "amber";
    case "accepted":
    case "processing":
      return "blue";
    case "ready_for_pickup":
      return "blue";
    case "completed":
      return "green";
    case "rejected":
    case "cancelled":
    case "expired":
      return "red";
    default:
      return "gray";
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  } catch {
    return dateStr;
  }
}

// -------------------------------------------------------------
// SUB-KOMPONEN: NOTIFIKASI
// -------------------------------------------------------------
function PartnerNotifications({
  newOrders,
  close,
  openOrders,
}: {
  newOrders: PartnerOrder[];
  close: () => void;
  openOrders: () => void;
}) {
  return (
    <div className="partner-notification-popover">
      <div className="partner-notification-head">
        <div>
          <span className="eyebrow">PESANAN MASUK</span>
          <h2>Notifikasi</h2>
        </div>
        <button onClick={close}>
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="incoming-summary">
        <span>{newOrders.length}</span>
        <div>
          <strong>
            {newOrders.length > 0
              ? `${newOrders.length} Pesanan baru menunggu respons`
              : "Belum ada pesanan baru"}
          </strong>
          <p>
            {newOrders.length > 0
              ? "Segera terima agar pelanggan mendapat kepastian."
              : "Semua pesanan saat ini sudah tertangani."}
          </p>
        </div>
      </div>

      <div className="partner-notification-list">
        {newOrders.slice(0, 5).map((order, idx) => (
          <button
            key={order.id}
            onClick={openOrders}
            className={idx === 0 ? "new" : ""}
          >
            <span className="incoming-avatar">
              {order.customer_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <div>
                <strong>{order.customer_name}</strong>
                <small>{formatRelativeTime(order.created_at)}</small>
              </div>
              <p>
                {order.order_number} • {order.items?.[0]?.service_name_snapshot || "Laundry"} (±
                {order.items?.[0]?.quantity || 3} kg)
              </p>
              <b>
                Lihat pesanan <Icon name="chevron" size={13} />
              </b>
            </div>
          </button>
        ))}
      </div>

      <button className="all-notifications" onClick={openOrders}>
        Buka Semua Pesanan
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-KOMPONEN: ORDER TABLE
// -------------------------------------------------------------
function OrderTable({
  orders,
  loading,
  compact = false,
  onAccept,
  onReject,
  onOpenWeighing,
  onStatusTransition,
  onViewDetail,
}: {
  orders: PartnerOrder[];
  loading?: boolean;
  compact?: boolean;
  onAccept: (order: PartnerOrder) => void;
  onReject: (order: PartnerOrder) => void;
  onOpenWeighing: (order: PartnerOrder) => void;
  onStatusTransition: (order: PartnerOrder, status: OrderStatus, label: string) => void;
  onViewDetail: (order: PartnerOrder) => void;
}) {
  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
        Memuat data pesanan...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
        <Icon name="orders" size={32} />
        <p style={{ marginTop: "10px", fontSize: "13px", fontWeight: 600 }}>
          Tidak ada pesanan pada kategori ini
        </p>
        <small style={{ fontSize: "11px" }}>
          Pesanan yang dibuat oleh pelanggan dari aplikasi mobile akan muncul di sini secara real-time.
        </small>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pesanan</th>
            <th>Pelanggan</th>
            <th>Layanan</th>
            <th>Berat / Jumlah</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const firstItem = order.items?.[0];
            const serviceName = firstItem?.service_name_snapshot || "Cuci Laundry";
            const qtyStr = firstItem
              ? `${firstItem.quantity} ${firstItem.unit} ${
                  order.status === "pending_partner" ? "(estimasi)" : ""
                }`
              : "-";

            return (
              <tr key={order.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => onViewDetail(order)}
                    style={{
                      border: 0,
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <strong style={{ color: "var(--blue-700)" }}>{order.order_number}</strong>
                    <small>{formatRelativeTime(order.created_at)}</small>
                    {order.notes && (
                      <span
                        title={order.notes}
                        style={{
                          display: "inline-block",
                          maxWidth: "140px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "10px",
                          color: "#1d4ed8",
                          background: "#eff6ff",
                          borderRadius: "4px",
                          padding: "1px 4px",
                          marginTop: "2px",
                        }}
                      >
                        🏷️ {order.notes}
                      </span>
                    )}
                  </button>
                </td>

                <td>
                  <div className="customer-cell">
                    <span>
                      {order.customer_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                      <small style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>
                        {order.customer_phone && order.customer_phone !== "-" ? `📞 ${order.customer_phone}` : ""}
                      </small>
                      {order.customer_address && (
                        <small
                          title={order.customer_address}
                          style={{
                            fontSize: "10px",
                            color: "var(--blue-700)",
                            display: "block",
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📍 {order.customer_address}
                        </small>
                      )}
                    </div>
                  </div>
                </td>

                <td>{serviceName}</td>
                <td>{qtyStr}</td>

                <td>
                  <Badge tone={getStatusTone(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  {order.review && (
                    <div style={{ marginTop: "4px" }}>
                      <span
                        title={`Ulasan: "${order.review.comment || 'Tanpa teks'}"`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#854d0e",
                          background: "#fef9c3",
                          border: "1px solid #fef08a",
                          borderRadius: "4px",
                          padding: "1px 5px",
                        }}
                      >
                        ⭐ {order.review.rating}/5
                      </span>
                    </div>
                  )}
                  {order.complaint && (
                    <div style={{ marginTop: "4px" }}>
                      <span
                        title={`Komplain: "${order.complaint.reason}"`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: order.complaint.status === "open" ? "#b91c1c" : "#15803d",
                          background: order.complaint.status === "open" ? "#fef2f2" : "#f0fdf4",
                          border: `1px solid ${
                            order.complaint.status === "open" ? "#fecaca" : "#bbf7d0"
                          }`,
                          borderRadius: "4px",
                          padding: "1px 5px",
                        }}
                      >
                        {order.complaint.status === "open"
                          ? "⚠️ Komplain Masuk"
                          : "✓ Komplain Selesai"}
                      </span>
                    </div>
                  )}
                </td>

                <td>
                  {/* Status: Baru Masuk (Pending Partner) */}
                  {order.status === "pending_partner" && (
                    <div className="table-actions">
                      <Button
                        variant="secondary"
                        onClick={() => onReject(order)}
                      >
                        Tolak
                      </Button>
                      <Button onClick={() => onOpenWeighing(order)}>
                        Timbang & Tetapkan Harga
                      </Button>
                    </div>
                  )}

                  {/* Status: Menunggu Pembayaran Pelanggan (Harga Fix) */}
                  {order.status === "pending_payment" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <small style={{ color: "var(--amber)", fontWeight: 600 }}>
                        Menunggu Bayar (Fix: Rp{(order.final_service_amount || order.subtotal_estimate).toLocaleString("id-ID")})
                      </small>
                      {order.payment_method === "cash" && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            onStatusTransition(order, "processing", "Sedang Dicuci (Bayar Tunai)")
                          }
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                        >
                          Konfirmasi Tunai & Cuci
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Status: Diterima -> Siap Timbang & Tetapkan Harga Fix */}
                  {order.status === "accepted" && (
                    <Button onClick={() => onOpenWeighing(order)}>
                      Timbang & Tetapkan Harga
                    </Button>
                  )}

                  {/* Status: Sedang Dicuci -> Siap Diambil */}
                  {order.status === "processing" && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        onStatusTransition(order, "ready_for_pickup", "Siap Diambil")
                      }
                    >
                      Siap Diambil
                    </Button>
                  )}

                  {/* Status: Siap Diambil -> Selesaikan */}
                  {order.status === "ready_for_pickup" && (
                    <Button
                      onClick={() =>
                        onStatusTransition(order, "completed", "Selesai")
                      }
                    >
                      Selesaikan ✓
                    </Button>
                  )}

                  {/* Status: Selesai */}
                  {order.status === "completed" && (
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => onViewDetail(order)}
                    >
                      Lihat Rincian <Icon name="chevron" size={13} />
                    </button>
                  )}

                  {/* Status: Ditolak atau Dibatalkan */}
                  {(order.status === "rejected" || order.status === "cancelled") && (
                    <small style={{ color: "var(--muted)" }}>Ditutup</small>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-KOMPONEN: TIMELINE
// -------------------------------------------------------------
function Timeline({ orders }: { orders: PartnerOrder[] }) {
  if (orders.length === 0) {
    return (
      <div style={{ padding: "16px 20px", color: "var(--muted)", fontSize: "11px" }}>
        Belum ada aktivitas hari ini.
      </div>
    );
  }

  return (
    <div className="timeline">
      {orders.map((order) => {
        const tone =
          order.status === "completed"
            ? "green"
            : order.status === "ready_for_pickup"
            ? "green"
            : "blue";

        return (
          <div key={order.id}>
            <span className={tone} />
            <p>
              <strong>
                {order.order_number} • {getStatusLabel(order.status)} ({order.customer_name})
              </strong>
              <small>{formatRelativeTime(order.created_at)}</small>
            </p>
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-KOMPONEN: KELOLA OUTLET
// -------------------------------------------------------------
const OUTLET_PHOTO_PRESETS = [
  {
    id: "preset-1",
    label: "Modern Laundromat",
    url: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1080&q=80",
  },
  {
    id: "preset-2",
    label: "Clean Laundry Studio",
    url: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1080&q=80",
  },
  {
    id: "preset-3",
    label: "Fresh Folded Linens",
    url: "https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=1080&q=80",
  },
  {
    id: "preset-4",
    label: "Minimalist Wash Room",
    url: "https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=1080&q=80",
  },
  {
    id: "preset-5",
    label: "Premium Fabric Care",
    url: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1080&q=80",
  },
  {
    id: "preset-6",
    label: "FreshFold Aesthetic",
    url: "https://images.unsplash.com/photo-1790876687829-7b27e0576036?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080",
  },
];

function OutletManagement({
  notify,
  currentUser,
}: {
  notify: (message: string) => void;
  currentUser?: UserProfile | null;
}) {
  const [outletId, setOutletId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [hours, setHours] = useState<string>("08.00 – 20.00");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [services, setServices] = useState<PartnerServiceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Modal Ganti Foto Outlet
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false);
  const [photoTab, setPhotoTab] = useState<"upload" | "preset" | "url">("upload");
  const [selectedPhoto, setSelectedPhoto] = useState<string>("");
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [savingPhoto, setSavingPhoto] = useState<boolean>(false);

  // Modal Kelola Layanan & Tarif
  const [serviceModalOpen, setServiceModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<PartnerServiceData | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    price: "8000",
    pricing_type: "per_kg",
    estimated_duration_hours: "24",
  });
  const [savingService, setSavingService] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    fetchPartnerOutlet(currentUser.id, currentUser.fullName).then((out) => {
      if (out) {
        setOutletId(out.id);
        setName(out.name);
        setAddress(out.address_text);
        setHours(out.operating_hours);
        setIsActive(out.is_active);
        setPhotoUrl(out.photo_url || "");

        fetchPartnerServices(out.id).then((srvs) => {
          setServices(srvs);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [currentUser?.id, currentUser?.fullName]);

  const handleSave = async () => {
    if (!currentUser?.id) {
      notify("Pengguna belum login");
      return;
    }
    setSaving(true);
    const res = await savePartnerOutlet({
      id: outletId || undefined,
      owner_id: currentUser.id,
      name,
      address_text: address,
      operating_hours: hours,
      is_active: isActive,
      photo_url: photoUrl,
    });
    setSaving(false);

    if (res.success) {
      if (res.id && !outletId) setOutletId(res.id);
      notify(`Profil '${name}' berhasil disimpan & aktif di aplikasi mobile!`);
    } else {
      notify(`Gagal menyimpan: ${res.error}`);
    }
  };

  const handleOpenPhotoModal = () => {
    setSelectedPhoto(photoUrl || laundryPhoto);
    setCustomUrlInput(photoUrl || "");
    setPhotoTab("upload");
    setPhotoModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Mohon pilih file gambar (JPG, PNG, atau WebP).");
      return;
    }

    setUploadingPhoto(true);
    const res = await uploadOutletPhoto(outletId || "temp", file);
    setUploadingPhoto(false);

    if (res.url) {
      setSelectedPhoto(res.url);
      notify("Foto berhasil diunggah! Klik 'Terapkan & Simpan Foto' untuk mengaktifkannya.");
    } else {
      notify(`Gagal memproses foto: ${res.error}`);
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      notify("Mohon masukkan tautan URL gambar yang valid.");
      return;
    }
    setSelectedPhoto(trimmed);
    notify("URL gambar diterapkan pada preview.");
  };

  const handleSavePhotoModal = async () => {
    if (!selectedPhoto) {
      notify("Pilih atau unggah foto terlebih dahulu.");
      return;
    }
    if (!currentUser?.id) {
      notify("Pengguna belum login");
      return;
    }

    setSavingPhoto(true);
    const res = await savePartnerOutlet({
      id: outletId || undefined,
      owner_id: currentUser.id,
      name,
      address_text: address,
      operating_hours: hours,
      is_active: isActive,
      photo_url: selectedPhoto,
    });
    setSavingPhoto(false);

    if (res.success) {
      if (res.id && !outletId) setOutletId(res.id);
      setPhotoUrl(selectedPhoto);
      setPhotoModalOpen(false);
      notify("Foto outlet berhasil diperbarui & langsung tampil di aplikasi mobile!");
    } else {
      notify(`Gagal menyimpan foto: ${res.error}`);
    }
  };

  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceForm({
      name: "",
      price: "8000",
      pricing_type: "per_kg",
      estimated_duration_hours: "24",
    });
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (service: PartnerServiceData) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: String(service.price),
      pricing_type: service.pricing_type || "per_kg",
      estimated_duration_hours: String(service.estimated_duration_hours || 24),
    });
    setServiceModalOpen(true);
  };

  const handleSaveServiceForm = async () => {
    if (!outletId) {
      notify("Outlet belum tersedia. Mohon simpan profil outlet terlebih dahulu.");
      return;
    }
    if (!serviceForm.name.trim()) {
      notify("Nama layanan tidak boleh kosong.");
      return;
    }
    const priceNum = parseFloat(serviceForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      notify("Tarif harga tidak valid.");
      return;
    }
    const durHours = parseInt(serviceForm.estimated_duration_hours) || 24;

    setSavingService(true);
    const res = await savePartnerService({
      id: editingService?.id,
      outlet_id: outletId,
      name: serviceForm.name.trim(),
      price: priceNum,
      pricing_type: serviceForm.pricing_type,
      estimated_duration_hours: durHours,
    });
    setSavingService(false);

    if (res.success) {
      setServiceModalOpen(false);
      notify(
        editingService
          ? `Layanan '${serviceForm.name}' berhasil diperbarui!`
          : `Layanan '${serviceForm.name}' berhasil ditambahkan!`
      );
      // Reload daftar layanan terbaru
      const updatedSrvs = await fetchPartnerServices(outletId);
      setServices(updatedSrvs);
    } else {
      notify(`Gagal menyimpan layanan: ${res.error}`);
    }
  };

  const handleDeleteService = async (service: PartnerServiceData) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus layanan '${service.name}'?`
    );
    if (!confirmDelete) return;

    const res = await deletePartnerService(service.id);
    if (res.success) {
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      notify(`Layanan '${service.name}' berhasil dihapus.`);
    } else {
      notify(`Gagal menghapus layanan: ${res.error}`);
    }
  };

  return (
    <div className="settings-grid">
      <section className="panel outlet-profile">
        <PanelTitle
          title="Profil Outlet Saya"
          subtitle="Informasi ini langsung tampil dan dapat dipesan di aplikasi mobile"
        />
        <div className="cover-photo" style={{ position: "relative" }}>
          <img
            src={photoUrl || laundryPhoto}
            alt={name || "Interior outlet"}
            onError={(e) => {
              (e.target as HTMLImageElement).src = laundryPhoto;
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.15) 50%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "16px",
              bottom: "14px",
              color: "white",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontWeight: 700,
                background: "rgba(0, 0, 0, 0.45)",
                padding: "3px 8px",
                borderRadius: "6px",
                display: "inline-block",
                marginBottom: "4px",
              }}
            >
              Foto Utama Outlet
            </span>
            <div style={{ fontSize: "15px", fontWeight: 800 }}>
              {name || "Outlet Laundry"}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleOpenPhotoModal}
            style={{
              position: "absolute",
              right: "12px",
              bottom: "12px",
              background: "rgba(255, 255, 255, 0.95)",
              color: "var(--navy-900)",
              backdropFilter: "blur(6px)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <Icon name="camera" size={14} /> Ganti Foto
          </Button>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
            Memuat informasi outlet...
          </div>
        ) : (
          <>
            <div className="form-grid">
              <label>
                Nama Outlet Laundry
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Sahrul Laundry Setiabudi"
                />
              </label>

              <label>
                Jam Operasional
                <input
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Contoh: 08.00 – 20.00"
                />
              </label>

              <label className="span-two">
                Alamat Outlet Lengkap
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jl. Dr. Setiabudi No. 156, Bandung"
                />
              </label>

              <div
                className="span-two"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: isActive ? "var(--green-soft)" : "var(--red-soft)",
                  borderRadius: "10px",
                  border: `1px solid ${isActive ? "var(--green)" : "var(--red)"}`,
                }}
              >
                <div>
                  <strong style={{ fontSize: "12px", color: isActive ? "var(--green)" : "var(--red)" }}>
                    {isActive ? "● Outlet Buka (Tampil di Mobile)" : "○ Outlet Tutup (Tidak Tampil di Mobile)"}
                  </strong>
                  <p style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                    {isActive
                      ? "Pelanggan dapat menemukan outlet ini dan membuat pesanan."
                      : "Outlet sedang istirahat dan disembunyikan dari aplikasi pelanggan."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "white",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {isActive ? "Tutup Sementara" : "Buka Sekarang"}
                </button>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} style={{ marginLeft: "18px" }}>
              {saving ? "Menyimpan ke Supabase..." : "Simpan Perubahan ke Mobile"}
            </Button>
          </>
        )}
      </section>

      <section className="panel services-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px 10px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <span className="eyebrow" style={{ color: "var(--blue-600)" }}>LAYANAN & HARGA</span>
            <h3 style={{ fontSize: "15px", color: "var(--navy-900)", margin: "2px 0 0" }}>
              Daftar Layanan & Tarif
            </h3>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: "2px 0 0" }}>
              Tarif yang dilihat dan dipesan oleh pelanggan di aplikasi mobile
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddService}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--blue-600)",
              color: "#ffffff",
              border: 0,
              padding: "7px 12px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(8, 120, 249, 0.22)",
              whiteSpace: "nowrap",
            }}
          >
            <span>+</span> Tambah Layanan
          </button>
        </div>

        {services.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
            Belum ada layanan yang ditambahkan. Klik <strong>+ Tambah Layanan</strong> untuk menambahkan layanan baru.
          </div>
        ) : (
          services.map((service) => (
            <div
              className="managed-service"
              key={service.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: "13px", color: "var(--navy-900)" }}>
                  {service.name}
                </strong>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--blue-800)",
                      background: "var(--blue-50)",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontWeight: 600,
                    }}
                  >
                    ⏱️ {service.estimated_duration_hours} jam pengerjaan
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#475569",
                      background: "#f1f5f9",
                      padding: "2px 7px",
                      borderRadius: "6px",
                    }}
                  >
                    ⚖️ {service.pricing_type === "per_item" ? "Per Satuan / Pcs" : "Per Kilogram"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <b style={{ fontSize: "13px", color: "var(--blue-700)", fontWeight: 800 }}>
                  Rp{service.price.toLocaleString("id-ID")}
                  <small style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted)", marginLeft: "2px" }}>
                    {service.pricing_type === "per_item" ? "/pcs" : "/kg"}
                  </small>
                </b>
                <button
                  type="button"
                  onClick={() => handleOpenEditService(service)}
                  style={{
                    background: "var(--blue-50)",
                    color: "var(--blue-700)",
                    border: "1px solid var(--blue-100)",
                    borderRadius: "7px",
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteService(service)}
                  title="Hapus Layanan"
                  style={{
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fee2e2",
                    borderRadius: "7px",
                    padding: "5px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* MODAL GANTI FOTO OUTLET */}
      {photoModalOpen && (
        <div className="modal-backdrop" onClick={() => setPhotoModalOpen(false)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">FOTO PROFIL OUTLET</span>
                <h3>Ganti Foto Outlet</h3>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Preview Box */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--navy-900)" }}>
                    Preview Tampilan di Mobile & Web
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                    Rasio Landscape
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "170px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    position: "relative",
                    background: "#0f172a",
                    border: "1px solid var(--line)",
                  }}
                >
                  <img
                    src={selectedPhoto || laundryPhoto}
                    alt="Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = laundryPhoto;
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "12px",
                      background: "rgba(0, 0, 0, 0.65)",
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {name || "Nama Outlet"}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  background: "#f1f5f9",
                  padding: "3px",
                  borderRadius: "10px",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPhotoTab("upload")}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: 0,
                    background: photoTab === "upload" ? "white" : "transparent",
                    color: photoTab === "upload" ? "var(--blue-700)" : "var(--muted)",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer",
                    boxShadow: photoTab === "upload" ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTab("preset")}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: 0,
                    background: photoTab === "preset" ? "white" : "transparent",
                    color: photoTab === "preset" ? "var(--blue-700)" : "var(--muted)",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer",
                    boxShadow: photoTab === "preset" ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  ✨ Galeri Pilihan
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTab("url")}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: 0,
                    background: photoTab === "url" ? "white" : "transparent",
                    color: photoTab === "url" ? "var(--blue-700)" : "var(--muted)",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer",
                    boxShadow: photoTab === "url" ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  🔗 Link URL
                </button>
              </div>

              {/* TAB 1: UPLOAD FILE */}
              {photoTab === "upload" && (
                <div
                  style={{
                    border: "2px dashed #93c5fd",
                    borderRadius: "12px",
                    padding: "24px 16px",
                    textAlign: "center",
                    background: "#eff6ff",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploadingPhoto}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      cursor: "pointer",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: "white",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--blue-600)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Icon name="camera" size={20} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "12px", color: "var(--navy-900)" }}>
                        {uploadingPhoto ? "Sedang Mengompres & Mengunggah..." : "Klik untuk Pilih Foto dari Laptop / HP"}
                      </strong>
                      <p style={{ fontSize: "10px", color: "var(--muted)", margin: "4px 0 0" }}>
                        Format didukung: JPG, PNG, WebP (otomatis dioptimasi untuk kecepatan)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRESET GALLERY */}
              {photoTab === "preset" && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 10px" }}>
                    Pilih salah satu foto estetik laundry profesional di bawah:
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "10px",
                      maxHeight: "220px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {OUTLET_PHOTO_PRESETS.map((preset) => {
                      const isChosen = selectedPhoto === preset.url;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => setSelectedPhoto(preset.url)}
                          style={{
                            cursor: "pointer",
                            borderRadius: "10px",
                            overflow: "hidden",
                            border: isChosen ? "2px solid var(--blue-600)" : "1px solid var(--line)",
                            position: "relative",
                            transition: "all 0.15s ease",
                            transform: isChosen ? "scale(1.02)" : "none",
                            boxShadow: isChosen ? "0 4px 12px rgba(8, 120, 249, 0.25)" : "none",
                          }}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            style={{ width: "100%", height: "80px", objectFit: "cover", display: "block" }}
                          />
                          <div
                            style={{
                              padding: "4px 6px",
                              fontSize: "9px",
                              fontWeight: 700,
                              background: isChosen ? "var(--blue-600)" : "white",
                              color: isChosen ? "white" : "var(--navy-900)",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {preset.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOM URL */}
              {photoTab === "url" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--navy-900)" }}>
                    Alamat URL Gambar Langsung
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "12px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      style={{
                        padding: "0 14px",
                        background: "var(--blue-50)",
                        color: "var(--blue-700)",
                        border: "1px solid var(--blue-200)",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Terapkan
                    </button>
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                    Paste tautan gambar yang dapat diakses publik (Unsplash, Imgur, Cloudinary, dll).
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setPhotoModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSavePhotoModal} disabled={savingPhoto || uploadingPhoto}>
                {savingPhoto ? "Menyimpan ke Mobile..." : "Terapkan & Simpan Foto"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT / TAMBAH LAYANAN */}
      {serviceModalOpen && (
        <div className="modal-backdrop" onClick={() => setServiceModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  {editingService ? "EDIT LAYANAN" : "LAYANAN BARU"}
                </span>
                <h3>{editingService ? `Edit ${editingService.name}` : "Tambah Layanan Baru"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600 }}>
                Nama Layanan
                <input
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="Contoh: Cuci + Setrika, Bedcover, Sepatu..."
                  style={{
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                  }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600 }}>
                  Tarif / Harga (Rp)
                  <input
                    type="number"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    placeholder="Contoh: 8000"
                    style={{
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      fontSize: "12px",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600 }}>
                  Satuan Perhitungan
                  <select
                    value={serviceForm.pricing_type}
                    onChange={(e) => setServiceForm({ ...serviceForm, pricing_type: e.target.value })}
                    style={{
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      fontSize: "12px",
                      background: "white",
                    }}
                  >
                    <option value="per_kg">Per Kilogram (kg)</option>
                    <option value="per_item">Per Satuan / Pcs</option>
                  </select>
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600 }}>
                Estimasi Durasi Pengerjaan (Jam)
                <input
                  type="number"
                  value={serviceForm.estimated_duration_hours}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, estimated_duration_hours: e.target.value })
                  }
                  placeholder="Contoh: 24 (1 hari) atau 48 (2 hari)"
                  style={{
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                  }}
                />
                <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>
                  Waktu estimasi pengerjaan yang akan diinfokan ke pelanggan saat memesan.
                </span>
              </label>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setServiceModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveServiceForm} disabled={savingService}>
                {savingService ? "Menyimpan..." : "Simpan Layanan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-KOMPONEN: KEUANGAN, KOMISI & PAYOUT SIMULASI (PRD 4.1 B)
// -------------------------------------------------------------
function FinancialsManagement({
  orders,
  notify,
}: {
  orders: PartnerOrder[];
  notify: (msg: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"ledger" | "payout" | "komplain">("ledger");
  const [payoutList, setPayoutList] = useState<
    {
      id: string;
      date: string;
      gross: number;
      commission: number;
      cashDebt: number;
      net: number;
      status: "paid" | "eligible" | "held";
    }[]
  >([]);
  const [complaintList, setComplaintList] = useState<
    {
      id: string;
      orderNumber: string;
      customer: string;
      reason: string;
      status: "open" | "resolved";
      date: string;
    }[]
  >([]);
  const [processingPayout, setProcessingPayout] = useState(false);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await fetchPartnerComplaints();
      setComplaintList(data);
    } catch (e) {
      console.warn("loadComplaints err:", e);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Perhitungan Keuangan Dinamis berdasarkan pesanan selesai aktual
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalGross = completedOrders.reduce(
    (sum, o) => sum + (o.final_service_amount || o.subtotal_estimate || 0),
    0
  );

  // Snapshot komisi platform: 5% (PRD Bab 9.3)
  const totalCommission = Math.round(totalGross * 0.05);

  const cashCompletedOrders = completedOrders.filter((o) => o.payment_method === "cash");
  const cashDebt = Math.round(
    cashCompletedOrders.reduce(
      (sum, o) => sum + (o.final_service_amount || o.subtotal_estimate || 0),
      0
    ) * 0.05
  );

  const digitalCompletedOrders = completedOrders.filter((o) => o.payment_method === "digital");
  const digitalGross = digitalCompletedOrders.reduce(
    (sum, o) => sum + (o.final_service_amount || o.subtotal_estimate || 0),
    0
  );

  const netEligible = Math.max(0, digitalGross - totalCommission - cashDebt);

  const handleProcessPayout = () => {
    if (netEligible <= 0) {
      notify("Belum ada saldo bersih yang dapat dicairkan.");
      return;
    }
    setProcessingPayout(true);
    setTimeout(() => {
      const newPayout = {
        id: `PO-${Date.now().toString().slice(-6)}`,
        date: "Baru saja",
        gross: digitalGross,
        commission: totalCommission,
        cashDebt: cashDebt,
        net: netEligible,
        status: "paid" as const,
      };
      setPayoutList([newPayout, ...payoutList]);
      setProcessingPayout(false);
      notify(
        `Simulasi Payout Rp${netEligible.toLocaleString(
          "id-ID"
        )} berhasil ditransfer ke rekening mitra!`
      );
    }, 600);
  };

  const handleResolveComplaint = async (id: string) => {
    notify("Memperbarui status komplain...");
    const ok = await resolvePartnerComplaint(id);
    if (ok) {
      setComplaintList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "resolved" } : c))
      );
      notify("Komplain berhasil ditandai selesai & solusi telah dikirimkan ke pelanggan!");
    } else {
      notify("Gagal memperbarui status komplain.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* 4 Kartu Ringkasan Finansial Sesuai PRD */}
      <div className="stats-grid">
        <Stat
          icon="wallet"
          label="Total Omzet Kotor"
          value={`Rp${totalGross.toLocaleString("id-ID")}`}
          trend={`${completedOrders.length} pesanan selesai`}
          tone="blue"
        />
        <Stat
          icon="star"
          label="Komisi Marketplace (5%)"
          value={`Rp${totalCommission.toLocaleString("id-ID")}`}
          trend="Snapshot tarif komisi PRD"
          tone="purple"
        />
        <Stat
          icon="clock"
          label="Tagihan Komisi Tunai"
          value={`Rp${cashDebt.toLocaleString("id-ID")}`}
          trend={cashDebt > 0 ? "Hutang komisi order tunai" : "Tidak ada piutang"}
          tone={cashDebt > 0 ? "amber" : "blue"}
        />
        <Stat
          icon="check"
          label="Saldo Bersih Siap Payout"
          value={`Rp${netEligible.toLocaleString("id-ID")}`}
          trend="Tersedia untuk dicairkan"
          tone="green"
        />
      </div>

      <section className="panel full-panel">
        <div className="table-toolbar">
          <div className="segmented web">
            <button
              className={activeTab === "ledger" ? "active" : ""}
              onClick={() => setActiveTab("ledger")}
            >
              Buku Besar (Ledger)
            </button>
            <button
              className={activeTab === "payout" ? "active" : ""}
              onClick={() => setActiveTab("payout")}
            >
              Riwayat Payout ({payoutList.length})
            </button>
            <button
              className={activeTab === "komplain" ? "active" : ""}
              onClick={() => setActiveTab("komplain")}
            >
              Tinjauan Komplain ({complaintList.filter((c) => c.status === "open").length})
            </button>
          </div>

          {activeTab === "payout" && (
            <Button
              onClick={handleProcessPayout}
              disabled={processingPayout || netEligible <= 0}
            >
              {processingPayout ? "Memproses..." : "Simulasi Cairkan Saldo"}
            </Button>
          )}
        </div>

        {/* Tab 1: Ledger Buku Besar Simulasi */}
        {activeTab === "ledger" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>No. Pesanan / Ref</th>
                  <th>Keterangan Mutasi</th>
                  <th>Arah Transaksi</th>
                  <th>Nominal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "30px",
                        color: "var(--muted)",
                      }}
                    >
                      Belum ada mutasi buku besar. Selesaikan pesanan untuk memicu pencatatan ledger
                      otomatis.
                    </td>
                  </tr>
                ) : (
                  completedOrders.map((o) => {
                    const amt = o.final_service_amount || o.subtotal_estimate || 0;
                    const comm = Math.round(amt * 0.05);
                    return (
                      <Fragment key={o.id}>
                        <tr>
                          <td>{new Date(o.created_at).toLocaleDateString("id-ID")}</td>
                          <td>
                            <strong style={{ color: "var(--blue-700)" }}>
                              {o.order_number}
                            </strong>
                          </td>
                          <td>Penyelesaian Pesanan Laundry ({o.customer_name})</td>
                          <td>
                            <Badge tone="green">+ Kredit</Badge>
                          </td>
                          <td>
                            <strong>Rp{amt.toLocaleString("id-ID")}</strong>
                          </td>
                          <td>
                            <Badge tone="blue">Settled</Badge>
                          </td>
                        </tr>
                        <tr>
                          <td>{new Date(o.created_at).toLocaleDateString("id-ID")}</td>
                          <td>
                            <small style={{ color: "var(--muted)" }}>
                              COMM-{o.order_number.replace("#", "")}
                            </small>
                          </td>
                          <td>Potongan Komisi Marketplace (5%)</td>
                          <td>
                            <Badge tone="amber">- Debit</Badge>
                          </td>
                          <td style={{ color: "var(--red)" }}>
                            -Rp{comm.toLocaleString("id-ID")}
                          </td>
                          <td>
                            <Badge tone="green">Applied</Badge>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Riwayat Payout Simulasi */}
        {activeTab === "payout" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID Payout</th>
                  <th>Tanggal</th>
                  <th>Omzet Kotor</th>
                  <th>Komisi 5%</th>
                  <th>Hutang Tunai</th>
                  <th>Bersih Ditransfer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payoutList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "30px",
                        color: "var(--muted)",
                      }}
                    >
                      Belum ada riwayat payout. Klik tombol "Simulasi Cairkan Saldo" di atas
                      untuk mencairkan dana.
                    </td>
                  </tr>
                ) : (
                  payoutList.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.id}</strong>
                      </td>
                      <td>{p.date}</td>
                      <td>Rp{p.gross.toLocaleString("id-ID")}</td>
                      <td style={{ color: "var(--red)" }}>
                        -Rp{p.commission.toLocaleString("id-ID")}
                      </td>
                      <td style={{ color: "var(--amber)" }}>
                        -Rp{p.cashDebt.toLocaleString("id-ID")}
                      </td>
                      <td>
                        <strong style={{ color: "var(--green)" }}>
                          Rp{p.net.toLocaleString("id-ID")}
                        </strong>
                      </td>
                      <td>
                        <Badge tone="green">Ditransfer (Paid)</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Tinjauan Komplain Pelanggan */}
        {activeTab === "komplain" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No. Pesanan</th>
                  <th>Pelanggan</th>
                  <th>Alasan Komplain</th>
                  <th>Waktu Pengajuan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {complaintList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      🛡️ Tidak ada komplain pelanggan saat ini. Pelanggan dapat mengajukan komplain maksimal 1 jam setelah pesanan selesai.
                    </td>
                  </tr>
                ) : (
                  complaintList.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ color: "var(--blue-700)" }}>{c.orderNumber}</strong>
                    </td>
                    <td>
                      <strong>{c.customer}</strong>
                    </td>
                    <td>{c.reason}</td>
                    <td>
                      <small>{c.date}</small>
                    </td>
                    <td>
                      <Badge tone={c.status === "open" ? "amber" : "green"}>
                        {c.status === "open" ? "Perlu Solusi" : "Selesai"}
                      </Badge>
                    </td>
                    <td>
                      {c.status === "open" ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleResolveComplaint(c.id)}
                        >
                          Selesaikan Komplain
                        </Button>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--green)",
                            fontWeight: 700,
                          }}
                        >
                          ✓ Terselesaikan
                        </span>
                      )}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
