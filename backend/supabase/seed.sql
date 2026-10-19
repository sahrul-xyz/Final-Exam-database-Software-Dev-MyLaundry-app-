-- Seed data untuk MyLaundry local development

-- Dummy Outlets & Services
-- Catatan: ID owner merujuk ke auth.users, pastikan membuat user terlebih dahulu atau insert saat auth siap
INSERT INTO public.laundry_outlets (id, owner_id, name, address_text, service_area, operating_hours, is_active, photo_url)
VALUES 
('a0000000-0000-0000-0000-000000000001', NULL, 'Bersih Laundry Setiabudi', 'Jl. Dr. Setiabudi No. 156, Bandung', 'Setiabudi, Gegerkalong, Sukasari', '08.00 - 20.00', true, 'https://images.unsplash.com/photo-1790876687829-7b27e0576036?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080'),
('a0000000-0000-0000-0000-000000000002', NULL, 'FreshFold Dago', 'Jl. Ir. H. Djuanda No. 88, Bandung', 'Dago, Coblong, Sekeloa', '07.30 - 21.00', true, 'https://images.unsplash.com/photo-1765163076573-26499e530ec8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=900')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.laundry_services (outlet_id, name, pricing_type, price, estimated_duration_hours, is_active)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'Cuci + Setrika', 'per_kg', 8000.00, 48, true),
('a0000000-0000-0000-0000-000000000001', 'Cuci Kering', 'per_kg', 6000.00, 24, true),
('a0000000-0000-0000-0000-000000000001', 'Express 6 Jam', 'per_kg', 14000.00, 6, true),
('a0000000-0000-0000-0000-000000000002', 'Cuci + Setrika', 'per_kg', 7500.00, 24, true),
('a0000000-0000-0000-0000-000000000002', 'Cuci Kering', 'per_kg', 5500.00, 24, true)
ON CONFLICT DO NOTHING;
