import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";

type Props = {
  customerId: string;
  onBack: () => void;
};

type HistoryItem = {
  id: string;
  new_status: string;
  note: string | null;
  created_at: string;
  orders: {
    order_number: string;
    laundry_outlets: { name: string } | null;
  } | null;
};

const statusText: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  pending_partner: "Menunggu konfirmasi outlet",
  processing: "Laundry sedang diproses",
  cancelled: "Pesanan dibatalkan",
  completed: "Laundry sudah selesai",
};

export function NotificationHistoryScreen({ customerId, onBack }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("order_status_history")
      .select(
        "id, new_status, note, created_at, orders!inner(order_number, customer_id, laundry_outlets(name))"
      )
      .eq("orders.customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) console.warn("Riwayat notifikasi:", error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notif_history_" + Math.random().toString(36).substring(7))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_status_history" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Riwayat Notifikasi</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 20, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Belum ada notifikasi</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {statusText[item.new_status] ??
                item.new_status.replace(/_/g, " ")}
            </Text>
            <Text style={styles.cardSub}>
              {item.orders?.order_number} •{" "}
              {item.orders?.laundry_outlets?.name ?? "Outlet Laundry"}
            </Text>
            {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}
            <Text style={styles.cardTime}>
              {new Date(item.created_at).toLocaleString("id-ID")}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#edf7ff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { paddingRight: 12 },
  backText: { fontSize: 22, color: "#09234d", fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800", color: "#09234d" },
  empty: { textAlign: "center", marginTop: 40, color: "#64748b" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e4eaf1",
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#09234d" },
  cardSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardNote: { fontSize: 12, color: "#09234d", marginTop: 6 },
  cardTime: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
});