/**
 * Uji render nyata: memuat HTML peta di Chromium headless untuk memastikan
 * Google Maps JavaScript API termuat, peta terinisialisasi, marker dibuat,
 * dan tombol "Pesan" pada InfoWindow berfungsi.
 *
 * Jalankan: node scripts/validate-map-render.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");
const puppeteer = require(
  path.join(
    process.env.LOCALAPPDATA,
    "Temp",
    "opencode",
    "qrtool",
    "node_modules",
    "puppeteer-core"
  )
);

const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const src = fs.readFileSync(
  path.join(__dirname, "..", "src", "utils", "maps.ts"),
  "utf8"
);
const transpiled = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
}).outputText;

const sandbox = { exports: {}, module: { exports: {} }, require };
sandbox.module.exports = sandbox.exports;
vm.createContext(sandbox);
vm.runInContext(transpiled, sandbox, { filename: "maps.js" });
const { buildMapHtml } = sandbox.module.exports;

const html = buildMapHtml({
  apiKey: process.env.GMAPS_KEY || "TEST_KEY",
  provider: process.env.MAP_PROVIDER || "osm",
  outlets: [
    {
      id: "a1",
      name: "Bersih Laundry Setiabudi",
      address: "Jl. Dr. Setiabudi No. 156, Bandung",
      distance: "0,8 km",
      rating: "4,9",
      price: "Rp8.000 /kg",
      latitude: -6.85843,
      longitude: 107.59003,
    },
    {
      id: "a2",
      name: "FreshFold Dago",
      address: "Jl. Ir. H. Djuanda No. 88, Bandung",
      distance: "1,4 km",
      rating: "4,8",
      price: "Rp7.500 /kg",
      latitude: -6.88876,
      longitude: 107.61359,
    },
  ],
  center: { latitude: -6.873, longitude: 107.601 },
});

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 800, deviceScaleFactor: 2 });

  // Tangkap pesan dari halaman (simulasi ReactNativeWebView)
  await page.evaluateOnNewDocument(() => {
    window.__messages = [];
    window.ReactNativeWebView = {
      postMessage: (data) => window.__messages.push(data),
    };
  });

  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  // Tulis ke file lalu buka via file:// agar evaluateOnNewDocument ikut jalan
  const htmlPath = path.join(__dirname, "..", "map-preview.html");
  fs.writeFileSync(htmlPath, html, "utf8");
  await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const hasGoogle = typeof google !== "undefined" && !!google.maps;
    const hasLeaflet = typeof L !== "undefined";
    const mapEl = document.getElementById("map");
    const tiles = document.querySelectorAll(
      ".gm-style img, .leaflet-tile"
    );
    let loadedTiles = 0;
    tiles.forEach((t) => {
      if (t.tagName === "IMG" && t.naturalWidth > 0) loadedTiles++;
      else if (t.tagName !== "IMG") loadedTiles++;
    });
    return {
      hasGoogle,
      hasLeaflet,
      mapHeight: mapEl ? mapEl.getBoundingClientRect().height : 0,
      tileCount: tiles.length,
      loadedTiles,
      hasMessageBridge: typeof window.ReactNativeWebView === "object",
      messages: window.__messages || [],
      bodyText: document.body.innerText.slice(0, 200),
    };
  });

  // Klik marker pertama lalu cek InfoWindow/Popup + tombol Pesan
  let infoWindow = null;
  try {
    const markerClicked = await page.evaluate(() => {
      const marker = document.querySelector(".gm-marker, .leaflet-marker-icon");
      if (!marker) return false;
      marker.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
      );
      return true;
    });

    if (markerClicked) {
      await new Promise((r) => setTimeout(r, 1500));
      infoWindow = await page.evaluate(() => {
        const button = document.querySelector("[data-order]");
        if (!button) return { found: false };
        button.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
        );
        return { found: true, label: button.textContent };
      });
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (e) {
    infoWindow = { found: false, error: e.message };
  }

  const messages = await page.evaluate(() => window.__messages || []);

  const shotPath = path.join(__dirname, "..", "map-preview.png");
  await page.screenshot({ path: shotPath });

  console.log("=== Hasil Uji Render Peta ===");
  console.log("Google Maps JS API termuat :", result.hasGoogle);
  console.log("Leaflet termuat             :", result.hasLeaflet);
  console.log("Tinggi elemen #map         :", result.mapHeight, "px");
  console.log("Jumlah tile                :", result.tileCount);
  console.log("Tile berhasil dimuat       :", result.loadedTiles);
  console.log("Bridge RN tersedia         :", result.hasMessageBridge);
  console.log("Marker diklik & popup       :", JSON.stringify(infoWindow));
  console.log("Pesan terkirim ke RN       :", JSON.stringify(messages));
  console.log("Screenshot                  :", shotPath);
  if (errors.length) {
    console.log("--- error terdeteksi ---");
    errors.slice(0, 8).forEach((e) => console.log("   ", e));
  }

  await browser.close();

  const ok =
    result.mapHeight > 100 &&
    result.loadedTiles > 0 &&
    infoWindow &&
    infoWindow.found === true &&
    messages.length > 0;
  console.log(ok ? "\nHASIL: PETA BERHASIL RENDER" : "\nHASIL: PERLU PERIKSA");
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
