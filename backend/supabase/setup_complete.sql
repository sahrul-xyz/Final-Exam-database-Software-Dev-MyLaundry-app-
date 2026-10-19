-- =======================================================
-- MYLAUNDRY COMPLETE DATABASE SETUP SCRIPT
-- Jalankan seluruh script ini di Supabase SQL Editor
-- =======================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Grant USAGE pada Schema public ke role Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- -------------------------------------------------------
-- TABEL 1: PROFILES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'partner', 'pelanggan', 'mitra', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- -------------------------------------------------------
-- TABEL 2: ADDRESSES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    address_text TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
CREATE POLICY "Users can manage their own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- TABEL 3: LAUNDRY OUTLETS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.laundry_outlets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address_text TEXT NOT NULL,
    service_area TEXT,
    operating_hours TEXT,
    is_active BOOLEAN DEFAULT false,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.laundry_outlets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active outlets" ON public.laundry_outlets;
CREATE POLICY "Public can view active outlets" ON public.laundry_outlets FOR SELECT USING (is_active = true OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Partners can manage their own outlets" ON public.laundry_outlets;
CREATE POLICY "Partners can manage their own outlets" ON public.laundry_outlets FOR ALL USING (auth.uid() = owner_id);

-- -------------------------------------------------------
-- TABEL 4: LAUNDRY SERVICES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.laundry_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pricing_type TEXT NOT NULL CHECK (pricing_type IN ('per_kg', 'per_item')),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    estimated_duration_hours INT NOT NULL DEFAULT 48,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.laundry_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active services" ON public.laundry_services;
CREATE POLICY "Public can view active services" ON public.laundry_services FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "Partners can manage services for their outlet" ON public.laundry_services;
CREATE POLICY "Partners can manage services for their outlet" ON public.laundry_services FOR ALL USING (EXISTS (
    SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
));

-- -------------------------------------------------------
-- TABEL 5: OUTLET DAILY CAPACITY
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlet_daily_capacity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    capacity_kg NUMERIC(8, 2) NOT NULL CHECK (capacity_kg >= 0),
    reserved_kg NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (reserved_kg >= 0),
    committed_kg NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (committed_kg >= 0),
    UNIQUE (outlet_id, service_date)
);
ALTER TABLE public.outlet_daily_capacity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can view and manage capacity" ON public.outlet_daily_capacity;
CREATE POLICY "Partners can view and manage capacity" ON public.outlet_daily_capacity FOR ALL USING (EXISTS (
    SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
));

-- -------------------------------------------------------
-- TABEL 6: ORDERS (Header Pesanan)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE RESTRICT,
    service_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'pending_payment', 'pending_partner', 'accepted', 'rejected',
        'awaiting_customer_approval', 'processing', 'ready_for_pickup',
        'completed', 'cancelled', 'expired'
    )),
    handover_method TEXT NOT NULL CHECK (handover_method IN ('pickup_delivery', 'drop_off')),
    subtotal_estimate NUMERIC(12, 2) NOT NULL CHECK (subtotal_estimate >= 0),
    final_service_amount NUMERIC(12, 2) CHECK (final_service_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('digital', 'cash')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'late_payment', 'refund_pending', 'refunded'
    )),
    payment_deadline TIMESTAMPTZ,
    partner_response_deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    complaint_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Partners can view orders for their outlets" ON public.orders;
CREATE POLICY "Partners can view orders for their outlets" ON public.orders FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "Customers can insert their own orders" ON public.orders;
CREATE POLICY "Customers can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update their own orders" ON public.orders;
CREATE POLICY "Customers can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Partners can update orders for their outlets" ON public.orders;
CREATE POLICY "Partners can update orders for their outlets" ON public.orders FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = outlet_id AND lo.owner_id = auth.uid()
));

-- -------------------------------------------------------
-- TABEL 7: ORDER ITEMS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.laundry_services(id) ON DELETE SET NULL,
    service_name_snapshot TEXT NOT NULL,
    unit_price_snapshot NUMERIC(12, 2) NOT NULL,
    quantity NUMERIC(8, 2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order parties can view items" ON public.order_items;
CREATE POLICY "Order parties can view items" ON public.order_items FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id AND (
        o.customer_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
        )
    )
));

DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;
CREATE POLICY "Customers can insert order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()
));

-- -------------------------------------------------------
-- TABEL 8: CAPACITY RESERVATIONS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.capacity_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE RESTRICT,
    service_date DATE NOT NULL,
    reserved_kg NUMERIC(8, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('held', 'committed', 'released')),
    expires_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ
);
ALTER TABLE public.capacity_reservations ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- TABEL 9: ORDER STATUS HISTORY
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order parties can view status history" ON public.order_status_history;
CREATE POLICY "Order parties can view status history" ON public.order_status_history FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id AND (
        o.customer_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
        )
    )
));

DROP POLICY IF EXISTS "Order parties can insert status history" ON public.order_status_history;
CREATE POLICY "Order parties can insert status history" ON public.order_status_history FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id AND (
        o.customer_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
        )
    )
));

-- -------------------------------------------------------
-- TABEL 10: PAYMENTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    reference TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- TABEL 11: PRICE ADJUSTMENTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    old_amount NUMERIC(12, 2) NOT NULL,
    new_amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    responded_at TIMESTAMPTZ
);
ALTER TABLE public.price_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order parties can view price adjustments" ON public.price_adjustments;
CREATE POLICY "Order parties can view price adjustments" ON public.price_adjustments FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id AND (
        o.customer_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
        )
    )
));

-- -------------------------------------------------------
-- TABEL 12: COMPLAINTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    evidence_path TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('none', 'open', 'resolved')),
    resolution_type TEXT,
    resolution_amount NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order parties can view complaints" ON public.complaints;
CREATE POLICY "Order parties can view complaints" ON public.complaints FOR SELECT USING (auth.uid() = customer_id OR EXISTS (
    SELECT 1 FROM public.orders o 
    JOIN public.laundry_outlets lo ON lo.id = o.outlet_id
    WHERE o.id = order_id AND lo.owner_id = auth.uid()
));

-- -------------------------------------------------------
-- TABEL 13: COMMISSION ENTRIES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE RESTRICT,
    rate_snapshot NUMERIC(5, 4) NOT NULL DEFAULT 0.0500,
    basis_amount NUMERIC(12, 2) NOT NULL,
    commission_amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- TABEL 14: LEDGER ENTRIES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- TABEL 15: PAYOUTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE RESTRICT,
    amount_gross NUMERIC(12, 2) NOT NULL,
    commission_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cash_commission_debt_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_net NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('held', 'eligible', 'processing', 'paid', 'blocked', 'failed')),
    eligible_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can view their own payouts" ON public.payouts;
CREATE POLICY "Partners can view their own payouts" ON public.payouts FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = outlet_id AND lo.owner_id = auth.uid()
));

-- -------------------------------------------------------
-- TABEL 16: REVIEWS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE RESTRICT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
CREATE POLICY "Public can view reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can create a review for their completed order" ON public.reviews;
CREATE POLICY "Customers can create a review for their completed order" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- -------------------------------------------------------
-- SEED DATA CONFLICT-SAFE (Outlet & Layanan Default)
-- -------------------------------------------------------
INSERT INTO public.laundry_outlets (id, name, address_text, service_area, operating_hours, is_active, photo_url)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'Bersih Laundry Setiabudi', 'Jl. Dr. Setiabudi No. 156, Bandung', 'Setiabudi, Gegerkalong', '08.00 - 20.00', true, 'https://images.unsplash.com/photo-1790876687829-7b27e0576036?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080'),
('a0000000-0000-0000-0000-000000000002', 'FreshFold Dago', 'Jl. Ir. H. Djuanda No. 88, Bandung', 'Dago, Coblong', '07.30 - 21.00', true, 'https://images.unsplash.com/photo-1765163076573-26499e530ec8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=900')
ON CONFLICT (id) DO UPDATE SET is_active = true;

INSERT INTO public.laundry_services (outlet_id, name, pricing_type, price, estimated_duration_hours, is_active)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'Cuci + Setrika', 'per_kg', 8000.00, 48, true),
('a0000000-0000-0000-0000-000000000001', 'Cuci Kering', 'per_kg', 6000.00, 24, true),
('a0000000-0000-0000-0000-000000000001', 'Express 6 Jam', 'per_kg', 14000.00, 6, true),
('a0000000-0000-0000-0000-000000000002', 'Cuci + Setrika', 'per_kg', 7500.00, 24, true),
('a0000000-0000-0000-0000-000000000002', 'Cuci Kering', 'per_kg', 5500.00, 24, true)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- IK301: TRIGGER PENDAFTARAN USER BARU (Logika Sisi Server)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  raw_role text;
  final_role text;
BEGIN
  raw_role := LOWER(COALESCE(new.raw_user_meta_data->>'role', 'customer'));
  IF raw_role IN ('partner', 'mitra') THEN
    final_role := 'partner';
  ELSE
    final_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    final_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -------------------------------------------------------
-- IK301: INDEX UNTUK OPTIMASI QUERY (Performa)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_outlet_status ON public.orders (outlet_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_outlets_area_active ON public.laundry_outlets (is_active, service_area);
CREATE INDEX IF NOT EXISTS idx_capacity_reservations_outlet_date ON public.capacity_reservations (outlet_id, service_date, status);

-- -------------------------------------------------------
-- IK301: TRANSAKSI ATOMIK SISI SERVER (Transaksi Multi-Langkah)
-- -------------------------------------------------------
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
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Kuantitas pesanan minimal harus lebih besar dari 0 (Diterima: %)', p_quantity;
    END IF;

    IF p_unit_price < 0 THEN
        RAISE EXCEPTION 'Harga satuan layanan tidak valid (Diterima: %)', p_unit_price;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.laundry_outlets WHERE id = p_outlet_id AND is_active = true) THEN
        RAISE EXCEPTION 'Outlet laundry tidak ditemukan atau sedang tidak aktif';
    END IF;

    IF p_payment_method = 'digital' THEN
        v_status := 'pending_payment';
        v_payment_deadline := now() + INTERVAL '15 minutes';
        v_partner_deadline := NULL;
    ELSE
        v_status := 'pending_partner';
        v_payment_deadline := NULL;
        v_partner_deadline := now() + INTERVAL '30 minutes';
    END IF;

    v_order_number := '#ML-' || to_char(now(), 'YYMMDD') || '-' || floor(1000 + random() * 9000)::text;

    -- Langkah 1: Insert header pesanan
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

    -- Langkah 2: Insert item snapshot
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

    -- Langkah 3: Insert status history
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

    -- Langkah 4: Tahan reservasi kapasitas
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
        RAISE EXCEPTION 'Transaksi pesanan dibatalkan (ROLLBACK): %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated, service_role;

-- -------------------------------------------------------
-- IK301: QUERY ANALITIK DASHBOARD (JOIN & Agregasi)
-- -------------------------------------------------------
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

GRANT SELECT ON public.v_partner_analytics TO anon, authenticated, service_role;
GRANT SELECT ON public.v_service_sales_report TO anon, authenticated, service_role;

