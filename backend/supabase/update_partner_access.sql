-- =======================================================
-- MYLAUNDRY - PARTNER ACCESS & REALTIME POLICIES
-- File: backend/supabase/update_partner_access.sql
-- =======================================================

-- 1. Berikan akses pada Mitra untuk melihat & mengelola pesanan KHUSUS untuk outlet miliknya sendiri
DROP POLICY IF EXISTS "Partners can view orders for their outlets" ON public.orders;
CREATE POLICY "Partners can view orders for their outlets" ON public.orders 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets o 
        WHERE o.id = outlet_id AND o.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Partners can update orders for their outlets" ON public.orders;
CREATE POLICY "Partners can update orders for their outlets" ON public.orders 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets lo 
        WHERE lo.id = outlet_id AND lo.owner_id = auth.uid()
    )
);

-- 2. Kebijakan akses item pesanan (order_items) untuk Mitra
DROP POLICY IF EXISTS "Order parties can view items" ON public.order_items;
CREATE POLICY "Order parties can view items" ON public.order_items 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo 
                WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS "Partners can update order items" ON public.order_items;
CREATE POLICY "Partners can update order items" ON public.order_items 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            EXISTS (
                SELECT 1 FROM public.laundry_outlets lo 
                WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    )
);

-- 3. Kebijakan status history untuk Mitra
DROP POLICY IF EXISTS "Parties can insert status history" ON public.order_status_history;
CREATE POLICY "Parties can insert status history" ON public.order_status_history 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo 
                WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS "Order parties can view status history" ON public.order_status_history;
CREATE POLICY "Order parties can view status history" ON public.order_status_history 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND (
            o.customer_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.laundry_outlets lo 
                WHERE lo.id = o.outlet_id AND lo.owner_id = auth.uid()
            )
        )
    )
);

-- 4. Izinkan Mitra memasukkan dan memperbarui informasi outlet miliknya
DROP POLICY IF EXISTS "Partners can claim or update outlets" ON public.laundry_outlets;
DROP POLICY IF EXISTS "Partners can manage their own outlets" ON public.laundry_outlets;

CREATE POLICY "Partners can insert their own outlets" ON public.laundry_outlets 
FOR INSERT WITH CHECK (
    auth.uid() = owner_id
);

CREATE POLICY "Partners can manage their own outlets" ON public.laundry_outlets 
FOR ALL USING (
    owner_id IS NULL OR auth.uid() = owner_id
);

-- Izinkan mitra mengelola layanan outlet miliknya
DROP POLICY IF EXISTS "Partners can manage services for their outlet" ON public.laundry_services;
CREATE POLICY "Partners can manage services for their outlet" ON public.laundry_services 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets o 
        WHERE o.id = outlet_id AND (o.owner_id = auth.uid() OR o.owner_id IS NULL)
    )
);

-- 5. Aktifkan Realtime Replication untuk tabel transaksi utama
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.laundry_outlets;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 6. Hubungkan akun sahrul25xyz@gmail.com ke outlet nyata & aktifkan agar langsung tampil di mobile
DO $$
DECLARE
    v_partner_id UUID;
    v_outlet_id UUID;
BEGIN
    -- Cari ID user akun sahrul25xyz
    SELECT id INTO v_partner_id FROM auth.users WHERE email = 'sahrul25xyz@gmail.com' LIMIT 1;
    
    IF v_partner_id IS NOT NULL THEN
        -- Pastikan role di profiles adalah partner
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (v_partner_id, 'Sahrul Partner', 'partner')
        ON CONFLICT (id) DO UPDATE SET role = 'partner';

        -- Cek apakah mitra ini sudah memiliki record outlet
        SELECT id INTO v_outlet_id FROM public.laundry_outlets WHERE owner_id = v_partner_id LIMIT 1;
        
        IF v_outlet_id IS NULL THEN
            -- Berikan kepemilikan outlet utama ke akun sahrul25xyz
            UPDATE public.laundry_outlets 
            SET owner_id = v_partner_id,
                name = 'Sahrul Laundry Express',
                address_text = 'Jl. Dr. Setiabudi No. 156, Bandung',
                is_active = true 
            WHERE id = 'a0000000-0000-0000-0000-000000000001';
            
            v_outlet_id := 'a0000000-0000-0000-0000-000000000001';
        ELSE
            UPDATE public.laundry_outlets SET is_active = true WHERE id = v_outlet_id;
        END IF;

        -- Pastikan layanan cuci tersedia untuk outlet ini
        INSERT INTO public.laundry_services (outlet_id, name, pricing_type, price, estimated_duration_hours, is_active)
        VALUES 
        (v_outlet_id, 'Cuci + Setrika', 'per_kg', 8000.00, 48, true),
        (v_outlet_id, 'Cuci Kering', 'per_kg', 6000.00, 24, true),
        (v_outlet_id, 'Express 6 Jam', 'per_kg', 14000.00, 6, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

