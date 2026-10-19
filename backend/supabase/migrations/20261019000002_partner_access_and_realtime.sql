-- Migration: Partner Access Policies & Realtime Publication
-- Sesuai dengan spesifikasi PRD v1.2 Bab 9.3 (RLS) & Bab 9.7 (Realtime)

-- 1. Orders RLS Policies for Partners
DROP POLICY IF EXISTS "Partners can view orders for their outlets" ON public.orders;
CREATE POLICY "Partners can view orders for their outlets" ON public.orders 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets o 
        WHERE o.id = outlet_id AND (o.owner_id = auth.uid() OR o.owner_id IS NULL)
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
    )
);

DROP POLICY IF EXISTS "Partners can update orders for their outlets" ON public.orders;
CREATE POLICY "Partners can update orders for their outlets" ON public.orders 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets lo 
        WHERE lo.id = outlet_id AND (lo.owner_id = auth.uid() OR lo.owner_id IS NULL)
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role IN ('partner', 'mitra')
    )
);

-- 2. Order Items RLS Policies for Partners
DROP POLICY IF EXISTS "Order parties can view items" ON public.order_items;
CREATE POLICY "Order parties can view items" ON public.order_items 
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

DROP POLICY IF EXISTS "Partners can update order items" ON public.order_items;
CREATE POLICY "Partners can update order items" ON public.order_items 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (
            EXISTS (
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

-- 3. Order Status History Policies
DROP POLICY IF EXISTS "Parties can insert status history" ON public.order_status_history;
CREATE POLICY "Parties can insert status history" ON public.order_status_history 
FOR INSERT WITH CHECK (
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

DROP POLICY IF EXISTS "Order parties can view status history" ON public.order_status_history;
CREATE POLICY "Order parties can view status history" ON public.order_status_history 
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

-- 4. Laundry Outlets & Services Policies for Partners
DROP POLICY IF EXISTS "Partners can insert their own outlets" ON public.laundry_outlets;
CREATE POLICY "Partners can insert their own outlets" ON public.laundry_outlets 
FOR INSERT WITH CHECK (
    auth.uid() = owner_id
);

DROP POLICY IF EXISTS "Partners can manage their own outlets" ON public.laundry_outlets;
CREATE POLICY "Partners can manage their own outlets" ON public.laundry_outlets 
FOR ALL USING (
    owner_id IS NULL OR auth.uid() = owner_id
);

DROP POLICY IF EXISTS "Partners can manage services for their outlet" ON public.laundry_services;
CREATE POLICY "Partners can manage services for their outlet" ON public.laundry_services 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.laundry_outlets o 
        WHERE o.id = outlet_id AND (o.owner_id = auth.uid() OR o.owner_id IS NULL)
    )
);

-- 5. Realtime Publication
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
