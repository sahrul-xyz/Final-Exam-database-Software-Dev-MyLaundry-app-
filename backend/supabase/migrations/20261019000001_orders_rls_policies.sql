-- Migration: Add INSERT & UPDATE policies for orders, order_items, and order_status_history
-- Sesuai dengan spesifikasi PRD Bab 9.3 & 9.4

-- 1. ORDERS
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

-- 2. ORDER ITEMS
CREATE POLICY "Customers can insert order items" 
    ON public.order_items FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND o.customer_id = auth.uid()
    ));

-- 3. ORDER STATUS HISTORY
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
