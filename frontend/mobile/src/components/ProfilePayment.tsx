import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";

import { PaymentMethod } from "../types";
import {
  getPreferredPayment,
  savePreferredPayment,
} from "../services/profilePaymentService";

type Props = {
  userId: string;
};

const options: {
  value: PaymentMethod;
  title: string;
  description: string;
}[] = [
  {
    value: "cash",
    title: "Tunai",
    description: "Pembayaran tunai sesuai ketentuan outlet.",
  },
  {
    value: "digital",
    title: "Digital / QRIS",
    description: "Pembayaran digital melalui pilihan yang tersedia.",
  },
];

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Periksa koneksi internet lalu coba lagi.";
}

export function ProfilePayment({ userId }: Props) {
  const [savedPayment, setSavedPayment] =
    useState<PaymentMethod>("cash");
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentMethod>("cash");

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);

  const savingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError("");
    setEditing(false);

    getPreferredPayment(userId)
      .then((payment) => {
        if (!active) return;

        setSavedPayment(payment);
        setSelectedPayment(payment);
      })
      .catch((error) => {
        if (active) {
          setLoadError(errorMessage(error));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, reload]);

  const hasChanges = selectedPayment !== savedPayment;

  const openEditor = () => {
    setSelectedPayment(savedPayment);
    setEditing(true);
  };

  const cancelEditing = () => {
    const discard = () => {
      setSelectedPayment(savedPayment);
      setEditing(false);
    };

    if (hasChanges) {
      Alert.alert(
        "Batalkan perubahan?",
        "Pilihan pembayaran yang belum disimpan akan dibuang.",
        [
          { text: "Lanjut edit", style: "cancel" },
          {
            text: "Buang perubahan",
            style: "destructive",
            onPress: discard,
          },
        ]
      );
      return;
    }

    discard();
  };

  const handleSave = async () => {
    if (savingRef.current || !hasChanges) return;

    savingRef.current = true;
    setSaving(true);

    try {
      const result = await savePreferredPayment(
        userId,
        selectedPayment
      );

      if (!mountedRef.current) return;

      setSavedPayment(result);
      setSelectedPayment(result);
      setEditing(false);

      Alert.alert(
        "Berhasil",
        "Metode pembayaran favorit berhasil disimpan."
      );
    } catch (error) {
      if (!mountedRef.current) return;

      Alert.alert(
        "Belum berhasil menyimpan",
        errorMessage(error)
      );
    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#0878f9" />
        <Text style={styles.help}>
          Memuat metode pembayaran...
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Metode pembayaran</Text>
        <Text style={styles.error}>{loadError}</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setReload((value) => value + 1)}
        >
          <Text style={styles.link}>Coba lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.row}
        onPress={editing ? cancelEditing : openEditor}
        disabled={saving}
        accessibilityRole="button"
        accessibilityState={{ expanded: editing }}
      >
        <Text style={styles.icon}>💳</Text>

        <View style={styles.rowContent}>
          <Text style={styles.title}>Metode pembayaran</Text>
          <Text style={styles.subtitle}>
            Favorit:{" "}
            {savedPayment === "cash" ? "Tunai" : "Digital / QRIS"}
          </Text>
        </View>

        <Text style={styles.chevron}>
          {editing ? "⌄" : "›"}
        </Text>
      </TouchableOpacity>

      {editing && (
        <View style={styles.editor}>
          <Text style={styles.title}>
            Pilih metode pembayaran favorit
          </Text>

          {options.map((option) => {
            const selected = selectedPayment === option.value;

            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  selected && styles.selectedOption,
                ]}
                onPress={() => setSelectedPayment(option.value)}
                disabled={saving}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={styles.radio}>
                  {selected ? "●" : "○"}
                </Text>

                <View style={styles.rowContent}>
                  <Text style={styles.title}>{option.title}</Text>
                  <Text style={styles.subtitle}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.help}>
            Pilihan ini menyimpan preferensi profil. Saat membuat
            pesanan, pilih kembali metode pembayaran yang diinginkan.
            Fitur ini tidak menautkan dompet digital atau memproses
            pembayaran.
          </Text>

          {hasChanges && (
            <Text style={styles.warning}>
              Simpan sebelum berpindah tab atau keluar dari akun.
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              (saving || !hasChanges) && styles.disabled,
            ]}
            onPress={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving && (
              <ActivityIndicator
                color="#ffffff"
                style={{ marginRight: 8 }}
              />
            )}

            <Text style={styles.saveText}>
              {saving ? "Menyimpan..." : "Simpan perubahan"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={cancelEditing}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Batal</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4eaf1",
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#09234d",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 17,
  },
  chevron: {
    fontSize: 22,
    color: "#94a3b8",
    marginLeft: 12,
  },
  editor: {
    borderTopWidth: 1,
    borderTopColor: "#e4eaf1",
    marginTop: 14,
    paddingTop: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4eaf1",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  selectedOption: {
    borderColor: "#0878f9",
    backgroundColor: "#edf7ff",
  },
  radio: {
    color: "#0878f9",
    fontSize: 22,
    marginRight: 12,
  },
  help: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  warning: {
    color: "#b45309",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
  error: {
    color: "#b45309",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 12,
  },
  link: {
    color: "#0878f9",
    fontSize: 12,
    fontWeight: "700",
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0878f9",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});