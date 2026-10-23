import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from "react-native";
import { supabase } from "../services/supabase";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  pending_partner: "Menunggu konfirmasi mitra",
  accepted: "Pesanan diterima",
  awaiting_customer_approval: "Menunggu persetujuan biaya",
  processing: "Sedang dicuci",
  ready_for_pickup: "Siap diambil",
  completed: "Pesanan selesai",
  cancelled: "Pesanan dibatalkan",
  rejected: "Pesanan ditolak",
  expired: "Pesanan kedaluwarsa",
};

export function OrderNotifBanner({
  customerId,
  onOpen,
}: {
  customerId: string;
  onOpen: () => void;
}) {
  const [message, setMessage] = useState("");
  const slide = useRef(new Animated.Value(-150)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    Animated.timing(slide, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const show = (text: string) => {
    setMessage(text);
    Vibration.vibrate(300);
    Animated.timing(slide, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hide, 5000);
  };

  // Cek apakah pesanan dibayar digital (buat teks "dana dikembalikan")
  const isPaidDigital = async (orderId: string) => {
    try {
      const { data } = await supabase
        .from("orders")
        .select("payment_method, payment_status")
        .eq("id", orderId)
        .maybeSingle();
      return (
        data?.payment_method === "digital" && data?.payment_status !== "pending"
      );
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("order-status-live-" + Math.random().toString(36).substring(7))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_status_history" },
        async (payload: any) => {
          // abaikan perubahan yang dibuat pelanggan sendiri
          if (payload.new?.changed_by === customerId) return;
          const s = payload.new?.new_status;
          if (!s) {
            show("Ada update pesanan baru");
            return;
          }
          let text = STATUS_LABEL[s] || s;
          if (s === "rejected" && payload.new?.order_id) {
            const paid = await isPaidDigital(payload.new.order_id);
            if (paid) text = "Pesanan ditolak, dana dikembalikan";
          }
          show(text);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [customerId]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { transform: [{ translateY: slide }] }]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          hide();
          onOpen();
        }}
      >
        <Text style={styles.title}>🔔 Status pesanan berubah</Text>
        <Text style={styles.body}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 10, left: 16, right: 16, zIndex: 999 },
  card: {
    backgroundColor: "#09234d",
    borderRadius: 14,
    padding: 14,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
  body: { color: "#cbd5e1", fontSize: 13, marginTop: 2 },
});