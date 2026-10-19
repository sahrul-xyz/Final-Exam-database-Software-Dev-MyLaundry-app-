-- ====================================================================
-- Migration: Complete Tables & RLS Policies (Financials, Complaints, etc.)
-- Sesuai dengan spesifikasi PRD v1.2 Bab 9.3 & 9.4
-- Aman dijalankan langsung di Supabase SQL Editor
-- ====================================================================

-- Pastikan UUID extension aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TABEL: PAYMENTS (Simulasi Pembayaran)
-- --------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Order parties can view payments" ON public.payments;
CREATE POLICY "Order parties can view payments" ON public.payments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo
                WHERE lo.id = o.outlet_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
            )
        )
    )
);

DROP POLICY IF EXISTS "Customers can insert payments for their orders" ON public.payments;
CREATE POLICY "Customers can insert payments for their orders" ON public.payments
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
);

-- --------------------------------------------------------------------
-- 2. TABEL: PRICE ADJUSTMENTS (Penyesuaian Biaya Aktual)
-- --------------------------------------------------------------------
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
CREATE POLICY "Order parties can view price adjustments" ON public.price_adjustments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
            )
        )
    )
);

DROP POLICY IF EXISTS "Partners can insert price adjustments" ON public.price_adjustments;
CREATE POLICY "Partners can insert price adjustments" ON public.price_adjustments
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.laundry_outlets lo ON lo.id = o.outlet_id
        WHERE o.id = order_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
    )
);

DROP POLICY IF EXISTS "Customers can respond to price adjustments" ON public.price_adjustments;
CREATE POLICY "Customers can respond to price adjustments" ON public.price_adjustments
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
);

-- --------------------------------------------------------------------
-- 3. TABEL: COMPLAINTS (Pengajuan & Penanganan Komplain)
-- --------------------------------------------------------------------
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
CREATE POLICY "Order parties can view complaints" ON public.complaints
FOR SELECT USING (
    auth.uid() = customer_id OR EXISTS (
        SELECT 1 FROM public.orders o 
        JOIN public.laundry_outlets lo ON lo.id = o.outlet_id
        WHERE o.id = order_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
    )
);

DROP POLICY IF EXISTS "Customers can submit complaints" ON public.complaints;
CREATE POLICY "Customers can submit complaints" ON public.complaints
FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Partners can resolve complaints" ON public.complaints;
CREATE POLICY "Partners can resolve complaints" ON public.complaints
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.laundry_outlets lo ON lo.id = o.outlet_id
        WHERE o.id = order_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
    )
);

-- --------------------------------------------------------------------
-- 4. TABEL: CAPACITY RESERVATIONS (Reservasi Kapasitas Harian)
-- --------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Users can view capacity reservations" ON public.capacity_reservations;
CREATE POLICY "Users can view capacity reservations" ON public.capacity_reservations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo
                WHERE lo.id = o.outlet_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
            )
        )
    )
);

DROP POLICY IF EXISTS "Customers can create capacity reservations" ON public.capacity_reservations;
CREATE POLICY "Customers can create capacity reservations" ON public.capacity_reservations
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
);

-- --------------------------------------------------------------------
-- 5. TABEL: COMMISSION ENTRIES & LEDGER ENTRIES (Buku Besar & Komisi)
-- --------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Partners can view commission entries" ON public.commission_entries;
CREATE POLICY "Partners can view commission entries" ON public.commission_entries
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets lo
        WHERE lo.id = outlet_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
    )
);

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

DROP POLICY IF EXISTS "Partners can view ledger entries" ON public.ledger_entries;
CREATE POLICY "Partners can view ledger entries" ON public.ledger_entries
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets lo
        WHERE lo.id = outlet_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
    )
);

-- --------------------------------------------------------------------
-- 6. TABEL: PAYOUTS (Simulasi Pencairan Dana Mitra)
-- --------------------------------------------------------------------
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
CREATE POLICY "Partners can view their own payouts" ON public.payouts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets lo 
        WHERE lo.id = outlet_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
    )
);

-- --------------------------------------------------------------------
-- 7. REALTIME REPLICATION (Aman jika sudah ada)
-- --------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.price_adjustments;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;
