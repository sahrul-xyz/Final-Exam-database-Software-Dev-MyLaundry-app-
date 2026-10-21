-- ====================================================================
-- Migration: Outlet Geolocation (Google Maps)
-- Menambahkan kolom latitude/longitude pada tabel laundry_outlets agar
-- outlet dapat ditampilkan sebagai marker pada peta Google Maps di
-- aplikasi mobile, sekaligus membuka navigasi ke aplikasi Google Maps.
-- ====================================================================

-- 1. TAMBAHKAN KOLOM KOORDINAT (idempotent)
ALTER TABLE public.laundry_outlets
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. VALIDASI RENTANG KOORDINAT WGS84 (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'laundry_outlets_latitude_check'
    ) THEN
        ALTER TABLE public.laundry_outlets
            ADD CONSTRAINT laundry_outlets_latitude_check
            CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'laundry_outlets_longitude_check'
    ) THEN
        ALTER TABLE public.laundry_outlets
            ADD CONSTRAINT laundry_outlets_longitude_check
            CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
    END IF;
END $$;

-- 3. INDEX PARSIAL UNTUK QUERY PETA (hanya outlet aktif yang punya koordinat)
CREATE INDEX IF NOT EXISTS idx_outlets_geolocation
ON public.laundry_outlets (latitude, longitude)
WHERE is_active = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. KOORDINAT DEFAULT UNTUK OUTLET CONTOH (Kota Bandung)
UPDATE public.laundry_outlets
SET latitude = -6.858430,
    longitude = 107.590030,
    updated_at = timezone('utc'::text, now())
WHERE id = 'a0000000-0000-0000-0000-000000000001'
  AND latitude IS NULL;

UPDATE public.laundry_outlets
SET latitude = -6.888760,
    longitude = 107.613590,
    updated_at = timezone('utc'::text, now())
WHERE id = 'a0000000-0000-0000-0000-000000000002'
  AND latitude IS NULL;

-- 5. VIEW BANTUAN: OUTLET TERDAFTAR DI PETA
-- security_invoker = true agar view tetap tunduk pada RLS policies
-- tabel laundry_outlets (tidak membypass RLS untuk role anon/authenticated).
DROP VIEW IF EXISTS public.outlets_with_coordinates;
CREATE VIEW public.outlets_with_coordinates
WITH (security_invoker = true) AS
SELECT
    o.id,
    o.name,
    o.address_text,
    o.service_area,
    o.operating_hours,
    o.photo_url,
    o.is_active,
    o.latitude,
    o.longitude
FROM public.laundry_outlets o
WHERE o.latitude IS NOT NULL
  AND o.longitude IS NOT NULL;

-- 6. GRANT SELECT pada view untuk role publik Supabase
GRANT SELECT ON public.outlets_with_coordinates TO anon, authenticated;
