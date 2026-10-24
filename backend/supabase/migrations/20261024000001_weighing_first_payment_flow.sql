-- ====================================================================
-- Migration: Alur Timbangan & Pembayaran Pelanggan (Weighing-First Flow)
-- Revisi Alur:
-- 1. Pelanggan memesan dengan memasukkan estimasi berat.
-- 2. Pesanan berstatus 'pending_partner' (menunggu konfirmasi & timbangan ulang outlet).
-- 3. Outlet mengonfirmasi pesanan, menimbang ulang, dan menetapkan harga fix (status -> 'pending_payment').
-- 4. Pelanggan menerima notifikasi harga fix dan melakukan konfirmasi pembayaran.
-- 5. Setelah pembayaran terkonfirmasi, cucian mulai diproses ('processing').
-- ====================================================================

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
    p_subtotal NUMERIC,
    p_notes TEXT DEFAULT NULL
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
    v_audit_note TEXT;
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

    -- Alur baru: Pelanggan membuat estimasi, pesanan berstatus 'pending_partner'
    -- Menunggu penimbangan ulang dan penetapan harga fix oleh mitra
    v_status := 'pending_partner';
    v_payment_deadline := NULL;
    v_partner_deadline := now() + INTERVAL '30 minutes';

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
        notes,
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
        p_notes,
        now(),
        now()
    ) RETURNING id, created_at INTO v_order_id, v_created_at;

    -- LANGKAH B: Simpan item pesanan dengan snapshot harga
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

    -- Format catatan audit history
    IF p_notes IS NOT NULL AND trim(p_notes) != '' THEN
        v_audit_note := 'Pesanan dibuat (estimasi ' || p_quantity::text || ' ' || p_unit || '). Catatan: ' || p_notes || '. Menunggu timbangan mitra.';
    ELSE
        v_audit_note := 'Pesanan dibuat dengan estimasi ' || p_quantity::text || ' ' || p_unit || '. Menunggu penimbangan ulang & penetapan harga fix dari outlet.';
    END IF;

    -- LANGKAH C: Catat status awal ke tabel order_status_history
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
        v_audit_note,
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
            v_partner_deadline
        );
    END IF;

    -- Kembalikan respons terstruktur JSON
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'status', v_status,
        'notes', p_notes,
        'created_at', v_created_at,
        'message', 'Transaksi pembuatan pesanan estimasi berhasil dilakukan secara atomik'
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaksi pesanan dibatalkan (ROLLBACK): %', SQLERRM;
END;
$$;

-- Overload fungsi 11 parameter untuk kompatibilitas mundur
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
BEGIN
    RETURN public.create_order_atomic(
        p_customer_id,
        p_outlet_id,
        p_service_date,
        p_handover_method,
        p_payment_method,
        p_service_id,
        p_service_name,
        p_unit_price,
        p_quantity,
        p_unit,
        p_subtotal,
        NULL
    );
END;
$$;
