# MyLaundry Mobile App (Pelanggan)

Aplikasi mobile Android untuk pelanggan MyLaundry yang dibangun dengan **React Native + TypeScript**.

## 📱 Fitur Utama (PRD Bab 4.1 A)
- Katalog & pencarian outlet laundry terdekat
- Detail outlet, layanan, harga, dan jam operasional
- **Peta outlet dengan Google Maps** (marker, lokasi pengguna, detail outlet — sepenuhnya in-app)- Pembuatan pesanan (antar-jemput atau antar sendiri)
- Pelacakan status pengerjaan pesanan realtime (Supabase Realtime)
- Persetujuan penyesuaian berat aktual
- Pengajuan komplain (maksimal 1 jam setelah pesanan selesai)
- Ulasan & rating setelah pesanan selesai

## 🚀 Menjalankan Aplikasi
```bash
npm install
npm run start
```
Gunakan Expo Go atau Android Emulator untuk menjalankan aplikasi.

## 🗺️ Konfigurasi Peta (Google Maps)

Peta dirender di dalam aplikasi memakai **WebView** (`react-native-webview`) yang memuat **Google Maps JavaScript API**.

> **Kenapa WebView, bukan `react-native-maps`?**
> Google Maps SDK native (`react-native-maps`) **tidak bisa dipakai di Expo Go** — API key bawaan Expo Go sudah tidak valid sehingga peta tampil gelap/hitam:
> `Google Android Maps SDK host.exp.exponent E Authorization failure`
> Dengan WebView, peta **selalu tampil** di Expo Go, Android Emulator, maupun build production, karena hanya membutuhkan koneksi internet.

### Mendapatkan API key

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat/pilih project.
2. **APIs & Services → Library** → aktifkan **Maps JavaScript API**.
3. **Credentials → Create Credentials → API key**.
4. Atur *Application restrictions*:
   - **HTTP referrers** → isi `localhost*` (peta dirender di dalam WebView, referrer-nya `https://localhost/`).
   - > Kalau Google tetap menolak dengan `RefererNotAllowedMapError`, ubah *Application restrictions* menjadi **None** (atau **IP addresses**) dan **API restrictions** menjadi **Maps JavaScript API** saja.
5. Atur *API restrictions* → **Maps JavaScript API**.
6. Salin key ke `frontend/mobile/.env`:

   ```bash
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```

7. Restart bundler dengan clear cache (agar key ter-inline ulang):

   ```bash
   npx expo start -c
   ```

8. Verifikasi key benar-benar tersambung:

   ```bash
   npm run check:maps
   ```

   Output yang diharapkan:
   ```
   [OK]   File .env ditemukan
   [OK]   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY terisi (39 karakter)
   [OK]   Format API key valid (AIza... , 39 karakter)
   [OK]   iOS  config.googleMapsApiKey terisi
   [OK]   Android config.googleMaps.apiKey terisi
   [OK]   extra.googleMapsApiKey terisi
   [OK]   API key ter-inline di dalam bundle JavaScript
   ```

`app.config.ts` membaca key tersebut dan menyisipkannya ke `android.config.googleMaps.apiKey` serta `ios.config.googleMapsApiKey` secara otomatis saat build.

### Tema Peta

Peta memakai **tampilan standar/bawaan** (tidak ada custom style):

| Provider | Tampilan |
|---|---|
| Google Maps | Gaya bawaan Google Maps (tanpa array `styles` custom) |
| OpenStreetMap | Tile standar OpenStreetMap (tanpa filter CSS) |

Marker, tombol, dan panel popup mengikuti warna aplikasi (biru `#0878f9`).

### Perilaku Peta

Peta tampil sebagai **popup (bottom sheet modal)** di atas halaman Beranda — halaman di belakangnya tetap terlihat. Semua interaksi berlangsung **di dalam aplikasi**, tidak berpindah ke aplikasi Google Maps.

| Aksi | Hasil |
|---|---|
| `Beranda → Lihat peta` | Popup peta muncul (tinggi 90%) dengan marker semua outlet |
| Ketuk area gelap / tombol `✕` | Menutup popup, kembali ke halaman Beranda |
| Ketuk marker | Menampilkan popup detail outlet (nama, alamat, rating, jarak, harga) |
| Tombol `Pesan` pada popup | Menutup peta & membuka modal pemesanan untuk outlet tersebut |
| Tombol `◎` (mengambang, kanan bawah) | Memusatkan peta pada lokasi pengguna (`expo-location`) |

### Fallback otomatis

Jika **API key tidak diisi** atau **key tidak valid / tidak ada internet**, aplikasi mendeteksi tile peta gagal dimuat dan **otomatis beralih ke OpenStreetMap** (Leaflet) sehingga peta tetap terlihat. Banner kuning menjelaskan kondisi yang sedang terjadi.

### Validasi peta

```bash
npm run check:maps           # verifikasi API key tersambung ke app
npm run validate:map         # cek sintaks HTML/JS peta
npm run validate:map:render  # render nyata di Chromium headless + screenshot
```

> **Expo Go:** `PROVIDER_GOOGLE` aktif di Expo Go untuk **Android**. Di **iOS**, Expo Go hanya menyediakan Apple Maps — gunakan *development build* (`npx expo run:ios` atau EAS) untuk Google Maps. Di **web**, peta ditampilkan sebagai daftar outlet dengan tombol "Buka di Google Maps".
