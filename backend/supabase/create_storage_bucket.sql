-- ==============================================================================
-- SETUP SUPABASE STORAGE: BUCKET 'outlet-photos'
-- ==============================================================================
-- Jalankan script ini di Supabase SQL Editor jika ingin mengaktifkan
-- upload file langsung ke Supabase Storage.
-- ==============================================================================

-- 1. Buat bucket 'outlet-photos' jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('outlet-photos', 'outlet-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Policy agar siapapun (pelanggan & mitra) bisa melihat foto outlet secara publik
DROP POLICY IF EXISTS "Public can view outlet photos" ON storage.objects;
CREATE POLICY "Public can view outlet photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'outlet-photos');

-- 3. Policy agar mitra terautentikasi bisa mengunggah (INSERT) foto outlet
DROP POLICY IF EXISTS "Partners can upload outlet photos" ON storage.objects;
CREATE POLICY "Partners can upload outlet photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'outlet-photos');

-- 4. Policy agar mitra terautentikasi bisa memperbarui (UPDATE) foto outlet
DROP POLICY IF EXISTS "Partners can update outlet photos" ON storage.objects;
CREATE POLICY "Partners can update outlet photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'outlet-photos');
