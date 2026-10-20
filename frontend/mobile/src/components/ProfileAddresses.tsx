import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";

import {
  ProfileAddress,
  getProfileAddresses,
  saveProfileAddresses,
} from "../services/profileAddressService";

type Props = {
  userId: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Periksa koneksi internet lalu coba lagi.";
}

function copyAddresses(addresses: ProfileAddress[]) {
  return addresses.map((address) => ({ ...address }));
}

export function ProfileAddresses({ userId }: Props) {
  const [addresses, setAddresses] = useState<ProfileAddress[]>([]);
  const [draft, setDraft] = useState<ProfileAddress[]>([]);
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

    getProfileAddresses(userId)
      .then((result) => {
        if (!active) return;

        setAddresses(result);
        setDraft(copyAddresses(result));
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, reload]);

  const hasChanges =
    JSON.stringify(draft) !== JSON.stringify(addresses);

  const primaryAddress = addresses.find(
    (address) => address.is_default
  );

  const openEditor = () => {
    setDraft(copyAddresses(addresses));
    setEditing(true);
  };

  const closeEditor = () => {
    const discard = () => {
      setDraft(copyAddresses(addresses));
      setEditing(false);
    };

    if (hasChanges) {
      Alert.alert(
        "Batalkan perubahan alamat?",
        "Perubahan yang belum disimpan akan dibuang.",
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

  const addAddress = () => {
    setDraft((current) => [
      ...current,
      {
        label: "",
        address_text: "",
        is_default: current.length === 0,
      },
    ]);
  };

  const updateAddress = (
    index: number,
    patch: Partial<ProfileAddress>
  ) => {
    setDraft((current) =>
      current.map((address, i) =>
        i === index ? { ...address, ...patch } : address
      )
    );
  };

  const choosePrimary = (index: number) => {
    setDraft((current) =>
      current.map((address, i) => ({
        ...address,
        is_default: i === index,
      }))
    );
  };

  const deleteAddress = (index: number) => {
    Alert.alert(
      "Hapus alamat?",
      "Alamat baru dihapus dari akun setelah Simpan perubahan ditekan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            setDraft((current) => {
              const remaining = current
                .filter((_, i) => i !== index)
                .map((address) => ({ ...address }));

              if (
                remaining.length > 0 &&
                !remaining.some((address) => address.is_default)
              ) {
                remaining[0].is_default = true;
              }

              return remaining;
            });
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    // Validasi awal agar form tetap terbuka jika isian belum lengkap.
    if (
      draft.some(
        (address) =>
          !address.label.trim() ||
          address.label.trim().length > 40 ||
          address.address_text.trim().length < 5 ||
          address.address_text.trim().length > 500
      )
    ) {
      Alert.alert(
        "Periksa alamat",
        "Isi label maksimal 40 karakter dan alamat lengkap 5–500 karakter."
      );
      return;
    }

    if (
      draft.length > 0 &&
      draft.filter((address) => address.is_default).length !== 1
    ) {
      Alert.alert("Alamat utama", "Pilih tepat satu alamat utama.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    let saved = false;

    try {
      await saveProfileAddresses(userId, draft);
      saved = true;

      // Ambil kembali ID alamat baru dari server.
      const result = await getProfileAddresses(userId);

      if (!mountedRef.current) return;

      setAddresses(result);
      setDraft(copyAddresses(result));
      setEditing(false);

      Alert.alert("Berhasil", "Perubahan alamat berhasil disimpan.");
    } catch (error) {
      if (!mountedRef.current) return;

      const message = saved
        ? "Alamat sudah tersimpan, tetapi daftar terbaru belum bisa dimuat."
        : "Penyimpanan alamat belum dapat dikonfirmasi.";

      // Muat ulang sebelum mencoba lagi agar alamat baru tidak terduplikasi
      // jika transaksi sebenarnya tersimpan tetapi respons jaringan terputus.
      setEditing(false);
      setLoadError(
        `${message} Tekan Muat ulang alamat untuk memeriksa data server. ` +
          getErrorMessage(error)
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
        <Text style={styles.help}>Memuat alamat...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Alamat tersimpan</Text>
        <Text style={styles.error}>{loadError}</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setReload((value) => value + 1)}
          disabled={saving}
        >
          <Text style={styles.link}>Muat ulang alamat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={editing ? closeEditor : openEditor}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ expanded: editing }}
        >
          <Text style={styles.icon}>📍</Text>

          <View style={styles.rowContent}>
            <Text style={styles.title}>Alamat tersimpan</Text>
            <Text style={styles.subtitle}>
              {addresses.length} alamat pengantaran
            </Text>
          </View>

          <Text style={styles.chevron}>{editing ? "⌄" : "›"}</Text>
        </TouchableOpacity>

        {editing && (
          <View style={styles.editor}>
            {draft.length === 0 && (
              <Text style={styles.help}>
                Belum ada alamat. Tekan Tambah alamat untuk mulai.
              </Text>
            )}

            {draft.map((address, index) => (
              <View
                key={address.id || `new-${index}`}
                style={styles.addressForm}
              >
                <Text style={styles.title}>Alamat {index + 1}</Text>

                <Text style={styles.label}>Label alamat</Text>
                <TextInput
                  style={styles.input}
                  value={address.label}
                  onChangeText={(label) =>
                    updateAddress(index, { label })
                  }
                  placeholder="Contoh: Rumah atau Kantor"
                  placeholderTextColor="#94a3b8"
                  maxLength={40}
                  editable={!saving}
                  accessibilityLabel={`Label alamat ${index + 1}`}
                />

                <Text style={styles.label}>Alamat lengkap</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={address.address_text}
                  onChangeText={(address_text) =>
                    updateAddress(index, { address_text })
                  }
                  placeholder="Jalan, nomor rumah, kelurahan, kota, kode pos"
                  placeholderTextColor="#94a3b8"
                  multiline
                  maxLength={500}
                  editable={!saving}
                  accessibilityLabel={`Alamat lengkap ${index + 1}`}
                />

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => choosePrimary(index)}
                  disabled={saving}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: address.is_default,
                  }}
                >
                  <Text style={styles.link}>
                    {address.is_default
                      ? "● Alamat utama"
                      : "○ Jadikan alamat utama"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteAddress(index)}
                  disabled={saving}
                >
                  <Text style={styles.deleteText}>Hapus alamat</Text>
                </TouchableOpacity>
              </View>
            ))}

            {draft.length < 10 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={addAddress}
                disabled={saving}
              >
                <Text style={styles.link}>+ Tambah alamat</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.help}>
              Maksimal 10 alamat. Simpan sebelum berpindah tab atau keluar
              dari akun.
            </Text>

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
                {saving ? "Menyimpan..." : "Simpan perubahan alamat"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={closeEditor}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => {
          if (!editing) openEditor();
        }}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Ubah alamat utama"
      >
        <View style={styles.rowContent}>
          <Text style={styles.eyebrow}>ALAMAT UTAMA</Text>
          <Text style={styles.primaryTitle}>
            {primaryAddress?.label || "Belum dipilih"}
          </Text>
          <Text style={styles.addressText}>
            {primaryAddress?.address_text ||
              "Tambahkan alamat dan pilih sebagai alamat utama."}
          </Text>
        </View>

        <Text style={styles.link}>Ubah</Text>
      </TouchableOpacity>
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
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
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
  },
  chevron: {
    fontSize: 22,
    color: "#94a3b8",
  },
  editor: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e4eaf1",
    paddingTop: 14,
  },
  addressForm: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e4eaf1",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#09234d",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 12,
    fontSize: 14,
    color: "#09234d",
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
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
  deleteButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff1f2",
    borderRadius: 8,
  },
  deleteText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "700",
  },
  help: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 17,
    marginTop: 8,
  },
  error: {
    fontSize: 12,
    color: "#b45309",
    lineHeight: 18,
    marginTop: 8,
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
  disabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f8ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfe7ff",
    padding: 16,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0878f9",
    letterSpacing: 0.6,
  },
  primaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#09234d",
    marginTop: 6,
  },
  addressText: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 17,
    marginTop: 4,
  },
});