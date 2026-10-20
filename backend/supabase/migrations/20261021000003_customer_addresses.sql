BEGIN;

CREATE OR REPLACE FUNCTION public.save_customer_addresses(
  p_addresses JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  item JSONB;
  address_id UUID;
  saved_ids UUID[] := ARRAY[]::UUID[];
  default_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Silakan login kembali.';
  END IF;

  IF jsonb_typeof(p_addresses) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Format alamat tidak valid.';
  END IF;

  IF jsonb_array_length(p_addresses) > 10 THEN
    RAISE EXCEPTION 'Maksimal 10 alamat.';
  END IF;

  SELECT COUNT(*)
  INTO default_count
  FROM jsonb_array_elements(p_addresses) AS entry
  WHERE entry->>'is_default' = 'true';

  IF jsonb_array_length(p_addresses) > 0
     AND default_count <> 1 THEN
    RAISE EXCEPTION 'Pilih tepat satu alamat utama.';
  END IF;

  -- Antrekan penyimpanan untuk akun yang sama.
  PERFORM id
  FROM public.profiles
  WHERE id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna tidak ditemukan.';
  END IF;

  -- Perubahan ini ikut dibatalkan jika ada error berikutnya.
  UPDATE public.addresses
  SET is_default = false
  WHERE user_id = current_user_id;

  FOR item IN
    SELECT value FROM jsonb_array_elements(p_addresses)
  LOOP
    IF length(trim(coalesce(item->>'label', '')))
       NOT BETWEEN 1 AND 40 THEN
      RAISE EXCEPTION 'Label alamat wajib diisi, maksimal 40 karakter.';
    END IF;

    IF length(trim(coalesce(item->>'address_text', '')))
       NOT BETWEEN 5 AND 500 THEN
      RAISE EXCEPTION 'Alamat lengkap harus berisi 5–500 karakter.';
    END IF;

    address_id := NULLIF(item->>'id', '')::UUID;

    IF address_id IS NULL THEN
      INSERT INTO public.addresses (
        user_id,
        label,
        address_text,
        is_default
      )
      VALUES (
        current_user_id,
        trim(item->>'label'),
        trim(item->>'address_text'),
        coalesce(item->>'is_default' = 'true', false)
      )
      RETURNING id INTO address_id;

    ELSE
      IF address_id = ANY(saved_ids) THEN
        RAISE EXCEPTION 'Alamat duplikat.';
      END IF;

      UPDATE public.addresses
      SET
        label = trim(item->>'label'),
        address_text = trim(item->>'address_text'),
        is_default = coalesce(item->>'is_default' = 'true', false),
        latitude = CASE
          WHEN address_text IS DISTINCT FROM trim(item->>'address_text')
          THEN NULL
          ELSE latitude
        END,
        longitude = CASE
          WHEN address_text IS DISTINCT FROM trim(item->>'address_text')
          THEN NULL
          ELSE longitude
        END
      WHERE id = address_id
        AND user_id = current_user_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Alamat tidak ditemukan atau bukan milik Anda.';
      END IF;
    END IF;

    saved_ids := array_append(saved_ids, address_id);
  END LOOP;

  -- Hapus alamat yang dikeluarkan dari daftar oleh pengguna.
  DELETE FROM public.addresses
  WHERE user_id = current_user_id
    AND NOT (id = ANY(saved_ids));
END;
$$;

REVOKE ALL
ON FUNCTION public.save_customer_addresses(JSONB)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.save_customer_addresses(JSONB)
TO authenticated;

COMMIT;