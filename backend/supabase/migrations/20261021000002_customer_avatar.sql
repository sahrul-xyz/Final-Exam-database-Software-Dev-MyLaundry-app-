BEGIN;

-- Simpan lokasi foto milik pengguna.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- Bucket private, maksimal 5 MB per foto.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'customer-avatars',
  'customer-avatars',
  false,
  5242880,
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Pengguna hanya bisa membaca foto dalam folder akunnya.
DROP POLICY IF EXISTS "customer_avatar_read"
ON storage.objects;

CREATE POLICY "customer_avatar_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Pengguna hanya bisa mengunggah ke folder akunnya.
DROP POLICY IF EXISTS "customer_avatar_insert"
ON storage.objects;

CREATE POLICY "customer_avatar_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Pengguna hanya bisa menghapus foto dalam folder akunnya.
DROP POLICY IF EXISTS "customer_avatar_delete"
ON storage.objects;

CREATE POLICY "customer_avatar_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;