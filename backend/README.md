# Backend Supabase - MyLaundry

Dokumentasi konfigurasi dan pengelolaan database PostgreSQL & Supabase untuk platform MyLaundry.

## 📦 Prasyarat
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker Desktop

## 🛠️ Menjalankan Lingkungan Lokal

1. **Inisialisasi & Start Supabase**
   ```bash
   cd backend/supabase
   supabase start
   ```

2. **Menjalankan Migrasi**
   ```bash
   supabase db reset
   ```

3. **Status Layanan**
   ```bash
   supabase status
   ```
   Akan menampilkan URL API, Studio URL (default: http://localhost:54323), anon key, dan service_role key.

## 🗄️ Skema Database (PRD Bab 9.3)
Terdapat 15 tabel inti:
1. `profiles` - Data profil & role (`customer` / `partner`)
2. `addresses` - Alamat pengantaran pelanggan
3. `laundry_outlets` - Data profil outlet mitra
4. `laundry_services` - Katalog layanan & harga
5. `outlet_daily_capacity` - Kapasitas harian outlet (kg)
6. `orders` - Header pesanan
7. `order_items` - Snapshot item dan harga pesanan
8. `capacity_reservations` - Reservasi kapasitas atomik per tanggal
9. `order_status_history` - Audit trail perubahan status
10. `payments` - Pembayaran simulasi
11. `price_adjustments` - Penyesuaian berat & harga aktual
12. `complaints` - Komplain pelanggan (maksimal 1 jam setelah selesai)
13. `commission_entries` - Snapshot perhitungan komisi marketplace (5%)
14. `ledger_entries` - Buku besar debit/kredit simulasi (append-only)
15. `payouts` - Simulasi pencairan dana mitra
16. `reviews` - Rating dan ulasan (1 ulasan per pesanan)

## ⚡ Edge Functions (PRD Bab 9.7)
1. **`expire-orders`**:
   - Menangani pembatalan otomatis pesanan yang melewati batas waktu (15 menit untuk pembayaran digital / 30 menit respons mitra tunai).
   - Menghapus penahanan reservasi kapasitas kilogram (`capacity_reservations`).
   - Perintah pengujian lokal:
     ```bash
     supabase functions serve expire-orders
     ```
2. **`process-simulated-payout`**:
   - Memproses pencairan dana (*payout*) ke mitra dan pencatatan komisi 5% secara otomatis setelah pesanan berstatus `completed` lebih dari 1 jam tanpa tiket komplain terbuka.
   - Perintah pengujian lokal:
     ```bash
     supabase functions serve process-simulated-payout
     ```
