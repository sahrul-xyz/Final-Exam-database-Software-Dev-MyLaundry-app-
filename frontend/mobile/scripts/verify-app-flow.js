const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim() : "";
};

const url = get("EXPO_PUBLIC_SUPABASE_URL");
const key = get("EXPO_PUBLIC_SUPABASE_ANON_KEY");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("URL :", url);
  console.log("KEY :", key.slice(0, 20) + "...");
  console.log("");

  // 1. Sign in (sama seperti signInCustomer di app)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "pelanggan@mylaundry.com",
    password: "password123",
  });
  if (authError) {
    console.log("[GAGAL] signIn:", authError.message);
    process.exit(1);
  }
  console.log("[OK]   signIn  ->", authData.user.id);

  // 2. Ambil profile (sama seperti app)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", authData.user.id)
    .maybeSingle();
  console.log("[OK]   profile ->", JSON.stringify(profile));

  // 3. getLiveOutlets versi resilient (sama seperti app)
  const OUTLET_COORDINATE_FALLBACK = {
    "a0000000-0000-0000-0000-000000000001": { latitude: -6.85843, longitude: 107.59003 },
    "a0000000-0000-0000-0000-000000000002": { latitude: -6.88876, longitude: 107.61359 },
  };

  let { data, error } = await supabase
    .from("laundry_outlets")
    .select(`id, name, address_text, is_active, photo_url, latitude, longitude, created_at, laundry_services ( price )`)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("[INFO] query dgn koordinat gagal:", error.message.slice(0, 60));
    console.log("[INFO] -> fallback ke query tanpa koordinat");
    const retry = await supabase
      .from("laundry_outlets")
      .select(`id, name, address_text, is_active, photo_url, created_at, laundry_services ( price )`)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (retry.error) {
      console.log("[GAGAL] retry:", retry.error.message);
      process.exit(1);
    }
    data = retry.data.map((item) => {
      const c = OUTLET_COORDINATE_FALLBACK[item.id];
      return { ...item, latitude: c?.latitude ?? null, longitude: c?.longitude ?? null };
    });
  }

  const outlets = data.map((item, idx) => ({
    name: item.name,
    address: item.address_text,
    lat: item.latitude,
    lng: item.longitude,
    hasCoord: item.latitude != null && item.longitude != null,
  }));
  console.log("[OK]   outlets ->", outlets.length, "data");
  outlets.forEach((o) =>
    console.log(
      "        - " + o.name + " | " + o.address + " | koordinat: " +
      (o.hasCoord ? o.lat + ", " + o.lng : "(TIDAK ADA)")
    )
  );

  const withCoord = outlets.filter((o) => o.hasCoord).length;
  console.log("");
  console.log(
    withCoord > 0
      ? "[OK]   " + withCoord + "/" + outlets.length + " outlet punya koordinat -> PETA AKAN TAMPIL"
      : "[WARN] tidak ada outlet dengan koordinat -> peta kosong"
  );
}

main().catch((e) => {
  console.log("[ERROR]", e.message);
  process.exit(1);
});
