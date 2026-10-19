import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";

interface BrandMarkProps {
  size?: number;
  style?: ViewStyle;
}

export function BrandMark({ size = 52, style }: BrandMarkProps) {
  return (
    <View style={[styles.markContainer, style]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect width={48} height={48} rx={15} fill="#0878f9" />
        <Path
          d="M14 13.5h20"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={32.5} cy={9.5} r={1.8} fill="#bfe2ff" />
        <Circle
          cx={24}
          cy={27}
          r={11.5}
          fill="rgba(255,255,255,0.12)"
          stroke="#ffffff"
          strokeWidth={2.6}
        />
        <Path
          d="M13.5 27.2c3.1-2.8 6.3-2.8 9.5 0s6.4 2.8 11.5-.4"
          stroke="#ffffff"
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M16 31.5c2.5-1.7 5-1.7 7.5 0s5 1.7 8.2-.2"
          stroke="#bfe2ff"
          strokeWidth={2.1}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

interface BrandProps {
  size?: number;
  compact?: boolean;
  style?: ViewStyle;
}

export function Brand({ size = 42, compact = false, style }: BrandProps) {
  return (
    <View style={[styles.brandRow, style]}>
      <BrandMark size={size} />
      {!compact && (
        <Text style={[styles.brandText, { fontSize: size * 0.58 }]}>
          <Text style={styles.brandPrimary}>My</Text>
          <Text style={styles.brandSecondary}>Laundry</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  markContainer: {
    shadowColor: "#0878f9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandText: {
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  brandPrimary: {
    color: "#0878f9",
  },
  brandSecondary: {
    color: "#09234d",
  },
});
