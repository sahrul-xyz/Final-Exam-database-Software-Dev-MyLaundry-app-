import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

export function Header({
  location = "Setiabudi, Bandung",
  isLocating = false,
  onLocationPress,
  onRefreshLocation,
  onNotificationPress,
}: {
  location?: string;
  isLocating?: boolean;
  onLocationPress?: () => void;
  onRefreshLocation?: () => void;
  onNotificationPress?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.locationContainer}>
        <Text style={styles.eyebrow}>LOKASI SAAT INI</Text>
        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={onLocationPress}
            activeOpacity={0.7}
            accessibilityLabel="Pilih atau buka peta lokasi"
          >
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
            <Text style={styles.chevron}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.refreshButton,
              isLocating && styles.refreshButtonActive,
            ]}
            onPress={onRefreshLocation}
            disabled={isLocating}
            activeOpacity={0.7}
            accessibilityLabel="Refresh lokasi saat ini"
          >
            {isLocating ? (
              <ActivityIndicator size={12} color="#0878f9" />
            ) : (
              <Text style={styles.refreshIcon}>🔄</Text>
            )}
          </TouchableOpacity>
        </View>
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
  locationContainer: {
    flex: 1,
    marginRight: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "85%",
  },
  locationPin: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#09234d",
    flexShrink: 1,
  },
  chevron: {
    fontSize: 14,
    color: "#0878f9",
    marginLeft: 4,
    marginRight: 6,
  },
  refreshButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonActive: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  refreshIcon: {
    fontSize: 11,
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
