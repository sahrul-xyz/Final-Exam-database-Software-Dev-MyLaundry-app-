import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export function Header({
  location = "Setiabudi, Bandung",
  onNotificationPress,
}: {
  location?: string;
  onNotificationPress?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.eyebrow}>LOKASI SAAT INI</Text>
        <TouchableOpacity style={styles.locationButton} activeOpacity={0.7}>
          <Text style={styles.locationPin}>📍</Text>
          <Text style={styles.locationText}>{location}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={onNotificationPress}
        activeOpacity={0.7}
      >
        <Text style={styles.bellIcon}>🔔</Text>
        <View style={styles.unreadDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.8,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationPin: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#09234d",
  },
  chevron: {
    fontSize: 14,
    color: "#0878f9",
    marginLeft: 4,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4eaf1",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  bellIcon: {
    fontSize: 18,
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#d64343",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
});
