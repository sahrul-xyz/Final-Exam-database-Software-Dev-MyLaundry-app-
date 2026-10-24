# Dokumen Bukti Teknis Database (IK301 Advanced Database Systems)
## Platform Marketplace MyLaundry

Dokumen ini disusun sebagai bukti teknis pemenuhan seluruh kriteria evaluasi mata kuliah **IK301 - Advanced Database Systems** pada Ujian Akhir Startup Pitch.

---

## 1. Model Data & Alasan Struktur Data (PRD Bab 9.3)

Database MyLaundry dibangun di atas **PostgreSQL** dengan total **16 tabel relasional** (melampaui syarat minimum 6 tabel):

1. `profiles`: Data akun pengguna (Pelanggan & Mitra) terhubung dengan `auth.users`.
2. `addresses`: Alamat pengantaran dan penjemputan pakaian pelanggan.
3. `laundry_outlets`: Profil outlet laundry, jam operasional, status buka/tutup, dan area layanan.
4. `laundry_services`: Katalog layanan pengerjaan (cuci setrika, express, dll) beserta tarif.
5. `outlet_daily_capacity`: Batas kuota kapasitas harian (kg) tiap outlet per tanggal.
6. `orders`: Header transaksi pesanan, status alur, tenggat waktu, dan metode pembayaran.
7. `order_items`: Rincian item pesanan beserta snapshot tarif dan nama layanan.
8. `capacity_reservations`: Pencatatan penahanan kuota kapasitas kg saat checkout.
9. `order_status_history`: Audit trail pencatatan setiap perubahan status pesanan.
10. `payments`: Simulasi pencatatan pembayaran digital atau tunai.
11. `price_adjustments`: Rekonsiliasi penyesuaian berat aktual dan persetujuan selisih harga.
12. `complaints`: Pengajuan klaim komplain pelanggan (maksimal 1 jam setelah pesanan selesai).
13. `commission_entries`: Pencatatan komisi platform (snapshot tarif default 5%).
14. `ledger_entries`: Buku besar debit/kredit simulasi (append-only ledger).
15. `payouts`: Rekap pencairan saldo operasional mitra setelah masa komplain berakhir.
16. `reviews`: Rating (1-5) dan ulasan pelanggan setelah pesanan selesai.

### Alasan Normalisasi vs Denormalisasi yang Disengaja
- **Normalisasi (1NF, 2NF, 3NF):** 
  Entitas dipisahkan ke dalam tabel terpisah (`profiles`, `laundry_outlets`, `laundry_services`, `orders`, `order_items`) untuk mencegah redundansi data dan anomali manipulasi (insert, update, delete). Setiap tabel memiliki Primary Key unik (UUID v4) dan Foreign Key yang terdefinisi dengan jelas.
- **Denormalisasi yang Disengaja (*Deliberate Denormalization*):**
  1. **Snapshot Harga & Layanan pada `order_items` (`service_name_snapshot`, `unit_price_snapshot`):**
     Jika mitra di masa depan menaikkan tarif layanan dari Rp8.000 menjadi Rp10.000/kg, pesanan historis yang telah dibuat sebelumnya **tidak boleh ikut berubah nilainya**. Oleh karena itu, data tarif dan nama layanan di-snapshot saat transaksi terjadi.
  2. **Snapshot Tarif Komisi pada `commission_entries` (`rate_snapshot`):**
     Menjaga akurasi laporan keuangan jika di kemudian hari kebijakan potongan komisi platform disesuaikan.
  3. **Snapshot Nilai Total pada `orders` (`subtotal_estimate`, `final_service_amount`):**
     Mempercepat query filter pesanan di dashboard tanpa harus selalu menghitung agregat seluruh baris item pesanan.

### Alasan Pemilihan Database (PostgreSQL + Supabase)
PostgreSQL dipilih karena memiliki kepatuhan **ACID (Atomicity, Consistency, Isolation, Durability)** yang kuat untuk mengelola transaksi keuangan dan reservasi kuota kapasitas. PostgreSQL juga mendukung fitur lanjutan seperti **Row Level Security (RLS)** untuk isolasi data multi-tenant secara deklaratif di level database, constraint yang kaya, serta fungsi PL/pgSQL. Didukung oleh platform Supabase, sistem memperoleh kapabilitas autentikasi terintegrasi, WebSocket Realtime replication untuk pembaruan status pesanan tanpa polling, dan fleksibilitas UUID v4 native.

---

## 2. Integritas Data (Constraints & Validation)

Integritas data dijamin melalui kombinasi constraint deklaratif pada skema:
1. **Primary Key & Foreign Key:** Seluruh tabel menggunakan UUID v4. Relasi antar tabel menggunakan aturan integritas referensial:
   - `ON DELETE CASCADE` pada detail pesanan (`order_items`, `order_status_history`, `payments`) jika pesanan dihapus.
   - `ON DELETE RESTRICT` pada entitas referensi utama (`customer_id`, `outlet_id`) agar data riwayat tidak terhapus jika akun dihapus.
2. **Check Constraints:**
   - `orders.status`: Memastikan status hanya salah satu dari siklus hidup yang valid (`pending_payment`, `pending_partner`, `accepted`, `processing`, `ready_for_pickup`, `completed`, `cancelled`, `expired`, dll).
   - `order_items.quantity > 0` dan `laundry_services.price >= 0`.
   - `reviews.rating BETWEEN 1 AND 5`.
3. **Unique Constraints:**
   - `orders.order_number`: Mencegah duplikasi nomor resi pesanan.
   - `reviews.order_id`: Menjamin satu pesanan hanya dapat diulas satu kali (*1-to-1 relationship enforcement*).
   - `(outlet_id, service_date)` pada `outlet_daily_capacity`: Menjamin tidak ada entri kapasitas ganda pada tanggal yang sama.

---

## 3. Transaksi Atomik (ACID Multi-Step Transaction)

Sesuai kriteria IK301, operasi pembuatan pesanan dibungkus dalam satu **Stored Procedure PL/pgSQL atomik**: `public.create_order_atomic`.

### Mengapa Transaksi Atomik Dibutuhkan?
Pembuatan pesanan laundry melibatkan 4–5 tabel sekaligus:
1. Insert ke `orders` (membuat resi).
2. Insert ke `order_items` (menyimpan snapshot layanan & harga).
3. Insert ke `order_status_history` (mencatat jejak audit awal).
4. Insert ke `capacity_reservations` (menahan kuota kapasitas kg outlet).

Jika salah satu langkah di atas gagal (misalnya kuantitas tidak valid, kuota habis, atau koneksi terputus), **seluruh langkah sebelumnya harus di-ROLLBACK otomatis** agar tidak timbul pesanan "zombie" (pesanan tanpa item atau kuota terpotong tanpa pesanan).

### Kode Stored Procedure
```sql
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_outlet_id UUID,
    p_service_date DATE,
    p_handover_method TEXT,
    p_payment_method TEXT,
    p_service_id UUID,
    p_service_name TEXT,
    p_unit_price NUMERIC,
    p_quantity NUMERIC,
    p_unit TEXT,
    p_subtotal NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_number TEXT;
    v_status TEXT;
    v_created_at TIMESTAMPTZ;
    v_payment_deadline TIMESTAMPTZ;
    v_partner_deadline TIMESTAMPTZ;
BEGIN
    -- Validasi 1: Kuantitas minimal 1
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Kuantitas pesanan minimal harus lebih besar dari 0 (Diterima: %)', p_quantity;
    END IF;

    -- Validasi 2: Harga tidak boleh negatif
    IF p_unit_price < 0 THEN
        RAISE EXCEPTION 'Harga satuan layanan tidak valid (Diterima: %)', p_unit_price;
    END IF;

    -- Validasi 3: Outlet harus aktif
    IF NOT EXISTS (SELECT 1 FROM public.laundry_outlets WHERE id = p_outlet_id AND is_active = true) THEN
        RAISE EXCEPTION 'Outlet laundry tidak ditemukan atau sedang tidak aktif';
    END IF;

    -- Alur Weighing-First: Semua pesanan baru dibuat dengan estimasi berat
    -- Menunggu penimbangan ulang dan penetapan harga fix oleh mitra
    v_status := 'pending_partner';
    v_payment_deadline := NULL;
    v_partner_deadline := now() + INTERVAL '30 minutes';

    v_order_number := '#ML-' || to_char(now(), 'YYMMDD') || '-' || floor(1000 + random() * 9000)::text;

    -- Langkah 1: Header Pesanan
    INSERT INTO public.orders (
        order_number, customer_id, outlet_id, service_date,
        status, handover_method, subtotal_estimate, payment_method,
        payment_status, payment_deadline, partner_response_deadline,
        created_at, updated_at
    ) VALUES (
        v_order_number, p_customer_id, p_outlet_id, p_service_date,
        v_status, p_handover_method, p_subtotal, p_payment_method,
        'pending', v_payment_deadline, v_partner_deadline, now(), now()
    ) RETURNING id, created_at INTO v_order_id, v_created_at;

    -- Langkah 2: Snapshot Item Pesanan
    INSERT INTO public.order_items (
        order_id, service_id, service_name_snapshot, unit_price_snapshot,
        quantity, unit, line_total
    ) VALUES (
        v_order_id, p_service_id, p_service_name, p_unit_price,
        p_quantity, p_unit, p_subtotal
    );

    -- Langkah 3: Catat Audit Trail
    INSERT INTO public.order_status_history (
        order_id, old_status, new_status, changed_by, note, created_at
    ) VALUES (
        v_order_id, NULL, v_status, p_customer_id,
        'Pesanan dibuat via Stored Procedure create_order_atomic', now()
    );

    -- Langkah 4: Tahan Kuota Kapasitas
    IF p_unit = 'kg' THEN
        INSERT INTO public.capacity_reservations (
            order_id, outlet_id, service_date, reserved_kg, status, expires_at
        ) VALUES (
            v_order_id, p_outlet_id, p_service_date, p_quantity, 'held',
            COALESCE(v_payment_deadline, v_partner_deadline, now() + INTERVAL '1 hour')
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'status', v_status,
        'created_at', v_created_at
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaksi pesanan dibatalkan (ROLLBACK): %', SQLERRM;
END;
$$;
```

### Panduan Demo Transaksi (Untuk Ditunjukkan ke Dosen)
Jalankan skrip berikut di **Supabase SQL Editor**:

#### Skenario 1: Transaksi Sukses
```sql
SELECT public.create_order_atomic(
    (SELECT id FROM public.profiles LIMIT 1),
    'a0000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    'pickup_delivery',
    'digital',
    NULL,
    'Cuci + Setrika',
    8000.00,
    3.0,
    'kg',
    24000.00
);
```
*Hasil:* Mengembalikan JSON `{ "success": true, "order_id": "...", "status": "pending_partner" }`. Data masuk secara serentak ke `orders`, `order_items`, `order_status_history`, dan `capacity_reservations` dengan status menunggu penimbangan ulang mitra.

#### Skenario 2: Transaksi Gagal (Pembuktian ROLLBACK)
```sql
-- Coba masukkan kuantitas tidak valid (0 kg)
SELECT public.create_order_atomic(
    (SELECT id FROM public.profiles LIMIT 1),
    'a0000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    'pickup_delivery',
    'digital',
    NULL,
    'Cuci + Setrika',
    8000.00,
    0, -- Invalid quantity
    'kg',
    0.00
);
```
*Hasil:* Error `Kuantitas pesanan minimal harus lebih besar dari 0`. Tidak ada baris yang tersisa di tabel `orders` maupun tabel detail lainnya.

---

## 4. Logika Sisi Server (Triggers & Stored Functions)

Sistem mengimplementasikan logika sisi server berikut:
1. **Trigger `on_auth_user_created`:**
   - **Tabel:** `auth.users`
   - **Tujuan:** Secara otomatis membuat baris profil di tabel `public.profiles` begitu pengguna mendaftar lewat Supabase Auth, membaca metadata peran (`customer` atau `partner`).
2. **Stored Function `create_order_atomic`:**
   - Mengenkapsulasi alur bisnis validasi pemesanan, snapshotting harga, dan pencatatan audit secara transaksional di sisi server PostgreSQL.

---

## 5. Optimasi Performa & Bukti Query Plan (Index vs Non-Index)

### Index yang Ditambahkan
```sql
-- Index composite untuk filter pesanan mitra berdasarkan outlet dan status
CREATE INDEX IF NOT EXISTS idx_orders_outlet_status 
ON public.orders (outlet_id, status);

-- Index composite untuk riwayat pesanan pelanggan urut waktu terbaru
CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON public.orders (customer_id, created_at DESC);

-- Index foreign key untuk mempercepat JOIN detail pesanan
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items (order_id);
```

### Bukti Manfaat Index melalui Query Plan (`EXPLAIN ANALYZE`)

Query yang diuji:
```sql
EXPLAIN ANALYZE 
SELECT * FROM public.orders 
WHERE outlet_id = 'a0000000-0000-0000-0000-000000000001' 
  AND status = 'completed';
```

#### 1. SEBELUM INDEX (Sequential Scan)
```text
Seq Scan on orders  (cost=0.00..25.80 rows=4 width=312) (actual time=0.045..0.118 rows=5 loops=1)
  Filter: ((outlet_id = 'a0000000-0000-0000-0000-000000000001'::uuid) AND (status = 'completed'::text))
  Rows Removed by Filter: 150
Planning Time: 0.125 ms
Execution Time: 0.142 ms
```
*Analisis:* Database harus membaca seluruh tabel baris demi baris (`Seq Scan`) dan menguji setiap filter baris. Pada data besar (misal puluhan ribu transaksi), ini menimbulkan I/O disk tinggi.

#### 2. SESUDAH INDEX (Bitmap Index Scan / Index Scan)
```text
Bitmap Heap Scan on orders  (cost=4.28..12.45 rows=4 width=312) (actual time=0.018..0.024 rows=5 loops=1)
  Recheck Cond: ((outlet_id = 'a0000000-0000-0000-0000-000000000001'::uuid) AND (status = 'completed'::text))
  ->  Bitmap Index Scan on idx_orders_outlet_status  (cost=0.00..4.28 rows=4 width=0) (actual time=0.012..0.012 rows=5 loops=1)
        Index Cond: ((outlet_id = 'a0000000-0000-0000-0000-000000000001'::uuid) AND (status = 'completed'::text))
Planning Time: 0.098 ms
Execution Time: 0.039 ms
```
*Analisis:* Database langsung melompat ke lokasi blok penyimpanan pesanan menggunakan index b-tree `idx_orders_outlet_status`. Waktu eksekusi turun drastis hingga **>70% lebih cepat** dan query cost terpangkas dari **25.80 ke 12.45**.

---

## 6. Query Analitik Dashboard (JOIN & Agregasi)

Sistem menyediakan dua view analitik database yang menggabungkan beberapa tabel menggunakan relasi `JOIN` dan fungsi agregasi (`SUM`, `COUNT`, `AVG`, `ROUND`, `GROUP BY`):

### View 1: `v_partner_analytics` (Kinerja Outlet & Pendapatan)
```sql
CREATE OR REPLACE VIEW public.v_partner_analytics AS
SELECT 
    lo.id AS outlet_id,
    lo.name AS outlet_name,
    lo.service_area,
    COUNT(DISTINCT o.id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.status IN ('pending_partner', 'pending_payment') THEN o.id END) AS pending_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'processing' THEN o.id END) AS processing_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders,
    COALESCE(SUM(CASE WHEN o.status = 'completed' THEN COALESCE(o.final_service_amount, o.subtotal_estimate) ELSE 0 END), 0) AS total_revenue,
    ROUND(COALESCE(AVG(CASE WHEN o.status = 'completed' THEN COALESCE(o.final_service_amount, o.subtotal_estimate) END), 0), 2) AS avg_order_value,
    ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
    COUNT(DISTINCT r.id) AS total_reviews
FROM public.laundry_outlets lo
LEFT JOIN public.orders o ON o.outlet_id = lo.id
LEFT JOIN public.reviews r ON r.outlet_id = lo.id
GROUP BY lo.id, lo.name, lo.service_area;
```

### View 2: `v_service_sales_report` (Breakdown Penjualan per Jenis Layanan)
```sql
CREATE OR REPLACE VIEW public.v_service_sales_report AS
SELECT 
    lo.id AS outlet_id,
    lo.name AS outlet_name,
    oi.service_name_snapshot AS service_name,
    COUNT(oi.id) AS total_orders_count,
    SUM(oi.quantity) AS total_volume_ordered,
    oi.unit,
    SUM(oi.line_total) AS total_gross_sales,
    ROUND(AVG(oi.unit_price_snapshot), 2) AS avg_price
FROM public.order_items oi
JOIN public.orders o ON oi.order_id = o.id
JOIN public.laundry_outlets lo ON o.outlet_id = lo.id
WHERE o.status != 'cancelled'
GROUP BY lo.id, lo.name, oi.service_name_snapshot, oi.unit;
```

### Cara Menjalankan Query Analitik di Supabase SQL Editor:
```sql
-- 1. Laporan rekapitulasi performa mitra:
SELECT * FROM public.v_partner_analytics;

-- 2. Laporan produk/layanan terlaris per outlet:
SELECT * FROM public.v_service_sales_report 
ORDER BY total_gross_sales DESC;
```
Query ini mendemonstrasikan kemampuan PostgreSQL dalam melakukan agregasi multi-tabel (`orders`, `order_items`, `laundry_outlets`, `reviews`) secara efisien di level database tanpa membebani browser client.
