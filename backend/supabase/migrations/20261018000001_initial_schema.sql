-- MyLaundry Initial Database Schema Migration
-- Sesuai dengan spesifikasi PRD v1.2 Bab 9.3

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Pelanggan & Mitra)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'partner', 'pelanggan', 'mitra', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger otomatis saat user mendaftar lewat Supabase Auth
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

-- 2. ADDRESSES (Alamat Pelanggan)
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

CREATE POLICY "Users can manage their own addresses" 
    ON public.addresses FOR ALL 
    USING (auth.uid() = user_id);

-- 3. LAUNDRY OUTLETS (Outlet Mitra)
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

CREATE POLICY "Public can view active outlets" 
    ON public.laundry_outlets FOR SELECT 
    USING (is_active = true OR auth.uid() = owner_id);

CREATE POLICY "Partners can manage their own outlets" 
    ON public.laundry_outlets FOR ALL 
    USING (auth.uid() = owner_id);

-- 4. LAUNDRY SERVICES (Layanan & Harga)
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

CREATE POLICY "Public can view active services" 
    ON public.laundry_services FOR SELECT 
    USING (is_active = true OR EXISTS (
        SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
    ));

CREATE POLICY "Partners can manage services for their outlet" 
    ON public.laundry_services FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
    ));

-- 5. OUTLET DAILY CAPACITY (Kapasitas Harian Outlet)
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

CREATE POLICY "Partners can view and manage capacity" 
    ON public.outlet_daily_capacity FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
    ));

-- 6. ORDERS (Header Pesanan)
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

CREATE POLICY "Customers can view their own orders" 
    ON public.orders FOR SELECT 
    USING (auth.uid() = customer_id);

CREATE POLICY "Partners can view orders for their outlets" 
    ON public.orders FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.laundry_outlets o WHERE o.id = outlet_id AND o.owner_id = auth.uid()
    ));

CREATE POLICY "Customers can insert their own orders" 
    ON public.orders FOR INSERT 
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own orders" 
    ON public.orders FOR UPDATE 
    USING (auth.uid() = customer_id);

CREATE POLICY "Partners can update orders for their outlets" 
    ON public.orders FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.laundry_outlets lo 
        WHERE lo.id = outlet_id AND lo.owner_id = auth.uid()
    ));

-- 7. ORDER ITEMS (Snapshot Item & Harga)
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

CREATE POLICY "Order parties can view items" 
    ON public.order_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    ));

CREATE POLICY "Customers can insert order items" 
    ON public.order_items FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND o.customer_id = auth.uid()
    ));

-- 8. CAPACITY RESERVATIONS (Reservasi Kapasitas kg)
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

-- 9. ORDER STATUS HISTORY (Audit Trail Transisi Status)
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

CREATE POLICY "Order parties can view status history" 
    ON public.order_status_history FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    ));

CREATE POLICY "Order parties can insert status history" 
    ON public.order_status_history FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    ));

-- 10. PAYMENTS (Simulasi Pembayaran)
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

-- 11. PRICE ADJUSTMENTS (Penyesuaian Biaya Aktual)
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

CREATE POLICY "Order parties can view price adjustments" 
    ON public.price_adjustments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    ));

-- 12. COMPLAINTS (Pengajuan Komplain Pelanggan)
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

CREATE POLICY "Order parties can view complaints" 
    ON public.complaints FOR SELECT 
    USING (auth.uid() = customer_id OR EXISTS (
        SELECT 1 FROM public.orders o 
        JOIN public.laundry_outlets lo ON lo.id = o.outlet_id
        WHERE o.id = order_id AND lo.owner_id = auth.uid()
    ));

-- 13. COMMISSION ENTRIES (Perhitungan Komisi Marketplace)
CREATE TABLE IF NOT EXISTS public.commission_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.laundry_outlets(id) ON DELETE RESTRICT,
    rate_snapshot NUMERIC(5, 4) NOT NULL DEFAULT 0.0500, -- default 5%
    basis_amount NUMERIC(12, 2) NOT NULL,
    commission_amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

-- 14. LEDGER ENTRIES (Buku Besar Simulasi)
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

-- 15. PAYOUTS (Simulasi Pencairan Dana Mitra)
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

CREATE POLICY "Partners can view their own payouts" 
    ON public.payouts FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.laundry_outlets lo WHERE lo.id = outlet_id AND lo.owner_id = auth.uid()
    ));

-- 16. REVIEWS (Ulasan & Rating)
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

CREATE POLICY "Public can view reviews" 
    ON public.reviews FOR SELECT 
    USING (true);

CREATE POLICY "Customers can create a review for their completed order" 
    ON public.reviews FOR INSERT 
    WITH CHECK (auth.uid() = customer_id);
