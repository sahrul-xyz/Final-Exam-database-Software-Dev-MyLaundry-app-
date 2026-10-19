-- ====================================================================
-- Migration: IK301 Advanced Database Systems Technical Evidence
-- Berisi: Transaksi Atomik, Logika Sisi Server, Indexing, dan Query Analitik
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. INDEXING UNTUK OPTIMASI PERFORMA (IK301 Performa)
-- --------------------------------------------------------------------

-- Index untuk pencarian dan filter pesanan berdasarkan outlet dan status
CREATE INDEX IF NOT EXISTS idx_orders_outlet_status 
ON public.orders (outlet_id, status);

-- Index untuk riwayat pesanan pelanggan berdasarkan waktu pemesanan (terbaru dulu)
CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON public.orders (customer_id, created_at DESC);

-- Index untuk optimasi JOIN antara orders dan order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items (order_id);

-- Index untuk pencarian outlet aktif berdasarkan area layanan
CREATE INDEX IF NOT EXISTS idx_outlets_area_active 
ON public.laundry_outlets (is_active, service_area);

-- Index untuk pencarian reservasi kapasitas per outlet dan tanggal
CREATE INDEX IF NOT EXISTS idx_capacity_reservations_outlet_date 
ON public.capacity_reservations (outlet_id, service_date, status);


-- --------------------------------------------------------------------
-- 2. TRANSAKSI ATOMIK SISI SERVER (IK301 Transaksi & Logika Server)
-- Fungsi: create_order_atomic
-- Menjalankan operasi multi-langkah:
--   Langkah 1: Validasi kuantitas dan harga
--   Langkah 2: Insert orders header
--   Langkah 3: Insert order_items snapshot
--   Langkah 4: Insert order_status_history (audit trail)
--   Langkah 5: Insert capacity_reservations (jika layanan per kg)
-- Jika terjadi kesalahan di langkah mana pun, seluruh transaksi di-ROLLBACK otomatis.
-- --------------------------------------------------------------------

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

    -- Tentukan status awal dan batas waktu sesuai metode pembayaran (PRD v1.2 Bab 4.3)
    IF p_payment_method = 'digital' THEN
        v_status := 'pending_payment';
        v_payment_deadline := now() + INTERVAL '15 minutes';
        v_partner_deadline := NULL;
    ELSE
        v_status := 'pending_partner';
        v_payment_deadline := NULL;
        v_partner_deadline := now() + INTERVAL '30 minutes';
    END IF;

    -- Generate nomor pesanan unik (#ML-YYMMDD-XXXX)
    v_order_number := '#ML-' || to_char(now(), 'YYMMDD') || '-' || floor(1000 + random() * 9000)::text;

    -- LANGKAH A: Simpan header pesanan ke tabel orders
    INSERT INTO public.orders (
        order_number,
        customer_id,
        outlet_id,
        service_date,
        status,
        handover_method,
        subtotal_estimate,
        payment_method,
        payment_status,
        payment_deadline,
        partner_response_deadline,
        created_at,
        updated_at
    ) VALUES (
        v_order_number,
        p_customer_id,
        p_outlet_id,
        p_service_date,
        v_status,
        p_handover_method,
        p_subtotal,
        p_payment_method,
        'pending',
        v_payment_deadline,
        v_partner_deadline,
        now(),
        now()
    ) RETURNING id, created_at INTO v_order_id, v_created_at;

    -- LANGKAH B: Simpan item pesanan dengan snapshot harga (mencegah perubahan harga historis)
    INSERT INTO public.order_items (
        order_id,
        service_id,
        service_name_snapshot,
        unit_price_snapshot,
        quantity,
        unit,
        line_total
    ) VALUES (
        v_order_id,
        p_service_id,
        p_service_name,
        p_unit_price,
        p_quantity,
        p_unit,
        p_subtotal
    );

    -- LANGKAH C: Catat status awal ke tabel order_status_history (Audit Trail)
    INSERT INTO public.order_status_history (
        order_id,
        old_status,
        new_status,
        changed_by,
        note,
        created_at
    ) VALUES (
        v_order_id,
        NULL,
        v_status,
        p_customer_id,
        'Pesanan dibuat via Stored Procedure create_order_atomic',
        now()
    );

    -- LANGKAH D: Tahan kapasitas outlet (jika satuan kilogram)
    IF p_unit = 'kg' THEN
        INSERT INTO public.capacity_reservations (
            order_id,
            outlet_id,
            service_date,
            reserved_kg,
            status,
            expires_at
        ) VALUES (
            v_order_id,
            p_outlet_id,
            p_service_date,
            p_quantity,
            'held',
            COALESCE(v_payment_deadline, v_partner_deadline, now() + INTERVAL '1 hour')
        );
    END IF;

    -- Kembalikan respons terstruktur JSON
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'status', v_status,
        'created_at', v_created_at,
        'message', 'Transaksi pembuatan pesanan berhasil dilakukan secara atomik'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- PostgreSQL otomatis membatalkan/rollback seluruh langkah di atas
        RAISE EXCEPTION 'Transaksi pesanan dibatalkan (ROLLBACK): %', SQLERRM;
END;
$$;

-- Berikan izin eksekusi ke role pengguna
GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated, service_role;


-- --------------------------------------------------------------------
-- 3. QUERY ANALITIK DASHBOARD (IK301 Analitik: JOIN & Agregasi)
-- --------------------------------------------------------------------

-- View 1: Ringkasan Analitik Performa Outlet
-- Menggunakan: Multiple LEFT JOIN, GROUP BY, dan fungsi agregasi (COUNT, SUM, AVG, ROUND, COALESCE)
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

-- View 2: Laporan Penjualan per Jenis Layanan
-- Menggunakan: INNER JOIN order_items, orders, dan laundry_outlets dengan GROUP BY
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

-- Berikan izin SELECT pada view analitik
GRANT SELECT ON public.v_partner_analytics TO anon, authenticated, service_role;
GRANT SELECT ON public.v_service_sales_report TO anon, authenticated, service_role;
