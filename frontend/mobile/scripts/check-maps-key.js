/**
 * Pengecek konfigurasi Google Maps API key.
 *
 * Memastikan:
 *  1. File .env ada
 *  2. EXPO_PUBLIC_GOOGLE_MAPS_API_KEY terisi
 *  3. Format key sesuai (AIza... 39 karakter)
 *  4. Key tersembunyi ke dalam konfigurasi Expo (android/ios/extra)
 *  5. Key ikut ter-inline ke dalam bundle yang disajikan dev server
 *
 * Jalankan: npm run check:maps
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

let failed = false;

function ok(label, detail) {
  console.log(
    `${GREEN}[OK]${RESET}   ${label}${detail ? ` ${DIM}${detail}${RESET}` : ""}`
  );
}

function fail(label, detail) {
  failed = true;
  console.log(
    `${RED}[GAGAL]${RESET} ${label}${detail ? ` ${DIM}${detail}${RESET}` : ""}`
  );
}

function warn(label, detail) {
  console.log(
    `${YELLOW}[INFO]${RESET} ${label}${detail ? ` ${DIM}${detail}${RESET}` : ""}`
  );
}

function fetchBundle() {
  return new Promise((resolve, reject) => {
    const req = http.get(
      "http://127.0.0.1:8081/index.bundle?platform=android&dev=true&minify=false",
      { timeout: 120000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function main() {
  // 1. File .env
  if (!fs.existsSync(ENV_PATH)) {
    fail("File .env tidak ditemukan", "salin dari .env.example");
    return Promise.resolve();
  }
  ok("File .env ditemukan");

  // 2. Isi API key
  const envContent = fs.readFileSync(ENV_PATH, "utf8");
  const match = envContent.match(/^EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=(.*)$/m);
  const apiKey = match ? match[1].trim() : "";

  if (!apiKey) {
    fail("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY kosong");
    console.log(
      `\n  ${YELLOW}Isi dulu di file ${path.relative(
        process.cwd(),
        ENV_PATH
      )}${RESET}\n` + `  ${DIM}EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...${RESET}\n`
    );
    return Promise.resolve();
  }
  ok("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY terisi", `(${apiKey.length} karakter)`);

  // 3. Format key
  if (!/^AIza[0-9A-Za-z_-]{35}$/.test(apiKey)) {
    warn(
      "Format key tidak standar",
      "(key Google Maps biasanya diawali 'AIza' dan panjang 39 karakter)"
    );
  } else {
    ok("Format API key valid", "(AIza... , 39 karakter)");
  }

  // 4. Key masuk ke konfigurasi Expo
  //    Pakai --type introspect karena "public" membuang android.config/ios.config
  try {
    const configOutput = execSync(
      "npx expo config --type introspect --json",
      {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    );
    const jsonStart = configOutput.indexOf("{");
    const config = JSON.parse(configOutput.slice(jsonStart));

    const iosKey = config.ios?.config?.googleMapsApiKey;
    const androidKey = config.android?.config?.googleMaps?.apiKey;
    const extraKey = config.extra?.googleMapsApiKey;

    if (iosKey === apiKey) ok("iOS  config.googleMapsApiKey terisi");
    else fail("iOS  config.googleMapsApiKey tidak sesuai");

    if (androidKey === apiKey) ok("Android config.googleMaps.apiKey terisi");
    else fail("Android config.googleMaps.apiKey tidak sesuai");

    if (extraKey === apiKey) ok("extra.googleMapsApiKey terisi");
    else fail("extra.googleMapsApiKey tidak sesuai");
  } catch (e) {
    fail("Gagal membaca konfigurasi Expo", e.message);
  }

  // 5. Key ter-inline ke bundle yang disajikan dev server
  return fetchBundle()
    .then((bundle) => {
      if (bundle.includes(apiKey)) {
        ok("API key ter-inline di dalam bundle JavaScript");
      } else {
        fail(
          "API key belum ter-inline di bundle",
          "restart server: npx expo start -c"
        );
      }
    })
    .catch(() => {
      warn(
        "Dev server tidak aktif (bundle tidak diperiksa)",
        "jalankan `npx expo start` lalu ulangi"
      );
    });
}

main()
  .catch((e) => {
    fail("Error tidak terduga", e.message);
  })
  .then(() => {
    console.log(
      failed
        ? `\n${RED}Konfigurasi belum lengkap.${RESET}\n`
        : `\n${GREEN}Konfigurasi Google Maps siap.${RESET}\n`
    );
    process.exit(failed ? 1 : 0);
  });
