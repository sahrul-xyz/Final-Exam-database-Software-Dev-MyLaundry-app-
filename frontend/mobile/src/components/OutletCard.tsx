import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Outlet } from "../types";

export function OutletCard({
  outlet,
  onPress,
}: {
  outlet: Outlet;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: outlet.photo }} style={styles.image} />
        {outlet.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Terverifikasi</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {outlet.name}
            </Text>
            <Text style={styles.address} numberOfLines={1}>
              📍 {outlet.distance} • {outlet.address}
            </Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {outlet.rating}</Text>
          </View>
        </View>

        <View style={styles.serviceRow}>
          <Text style={styles.serviceLabel}>Cuci + Setrika</Text>
          <Text style={styles.price}>{outlet.price}</Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>⏱ Selesai {outlet.eta}</Text>
          <View style={styles.openRow}>
            <View style={styles.greenDot} />
            <Text style={styles.openText}>Buka</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e4eaf1",
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#09234d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    height: 125,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eaf4ff",
  },
  verifiedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#169b62",
  },
  content: {
    padding: 14,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: "#09234d",
  },
  address: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 3,
  },
  ratingBadge: {
    backgroundColor: "#fff4dc",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#d98208",
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f1f8ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 10,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  price: {
    fontSize: 12,
    fontWeight: "800",
    color: "#075ecf",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#64748b",
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#169b62",
    marginRight: 4,
  },
  openText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#169b62",
  },
});
