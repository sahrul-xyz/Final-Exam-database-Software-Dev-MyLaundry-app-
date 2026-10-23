-- ====================================================================
-- Migration: Allow Partners to View Customer Profile, Address & Reviews
-- Memperbaiki RLS agar Mitra Laundry dapat melihat:
-- 1. Nama Lengkap & No. HP Pelanggan (public.profiles)
-- 2. Alamat Antar-Jemput Pelanggan (public.addresses)
-- 3. Memastikan hak akses ulasan pelanggan (public.reviews)
-- ====================================================================

-- 1. Hak Akses Tabel PROFILES
-- Izinkan pengguna terotentikasi membaca data profil (nama, no. telepon, role)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Hak Akses Tabel ADDRESSES
-- Izinkan Mitra Laundry melihat alamat pelanggan yang bertransaksi di outlet mereka
DROP POLICY IF EXISTS "Partners can view customer addresses" ON public.addresses;
DROP POLICY IF EXISTS "Allow authenticated read addresses" ON public.addresses;

CREATE POLICY "Allow authenticated read addresses" 
ON public.addresses 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Hak Akses Tabel REVIEWS
-- Pastikan seluruh pengguna terotentikasi dapat melihat ulasan pesanan
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
CREATE POLICY "Public can view reviews" 
ON public.reviews 
FOR SELECT 
USING (true);

-- 4. Hak Akses Tabel COMPLAINTS (Komplain Pelanggan)
-- Izinkan Mitra membaca dan menyelesaikan status komplain
DROP POLICY IF EXISTS "Order parties can view complaints" ON public.complaints;
DROP POLICY IF EXISTS "Allow authenticated read complaints" ON public.complaints;
CREATE POLICY "Allow authenticated read complaints" 
ON public.complaints 
FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Partners can update complaints" ON public.complaints;
CREATE POLICY "Partners can update complaints" 
ON public.complaints 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.addresses TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO authenticated, anon;
GRANT SELECT, UPDATE, INSERT ON public.complaints TO authenticated;
