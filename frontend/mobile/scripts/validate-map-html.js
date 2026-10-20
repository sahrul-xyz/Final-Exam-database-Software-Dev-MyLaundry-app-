const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

// Transpilasi utils/maps.ts -> JS lalu evaluasi di sandbox
const src = fs.readFileSync(
  path.join(__dirname, "..", "src", "utils", "maps.ts"),
  "utf8"
);

const transpiled = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;

const sandbox = { exports: {}, module: { exports: {} }, require };
sandbox.module.exports = sandbox.exports;
vm.createContext(sandbox);
try {
  vm.runInContext(transpiled, sandbox, { filename: "maps.js" });
  console.log("OK: utils/maps.ts bisa dikompilasi & dievaluasi");
} catch (e) {
  console.error("GAGAL evaluate:", e.message);
  process.exit(1);
}

const { buildMapHtml } = sandbox.module.exports;

const html = buildMapHtml({
  apiKey: "TEST_KEY",
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

fs.writeFileSync(
  path.join(__dirname, "..", "map-preview.html"),
  html,
  "utf8"
);

// Ekstrak semua <script> inline (tanpa src) dan cek sintaksnya
const inlineScripts = [];
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) {
  inlineScripts.push(m[1]);
}

console.log("Jumlah script inline:", inlineScripts.length);

let failed = false;
inlineScripts.forEach((code, i) => {
  try {
    new vm.Script(code);
    console.log(`  script #${i + 1}: sintaks OK (${code.length} karakter)`);
  } catch (e) {
    failed = true;
    console.error(`  script #${i + 1}: SYNTAX ERROR -> ${e.message}`);
  }
});

// Cek struktur penting
const checks = [
  ["ada <div id=\"map\">", html.includes('id="map"')],
  ["ada script src Google Maps", html.includes("maps.googleapis.com/maps/api/js")],
  ["ada 2 outlet di payload", (html.match(/"name":/g) || []).length === 2],
  ["koordinat outlet ikut ter-embed", html.includes('"lat":-6.85843')],
  ["ada handler Pesan", html.includes("data-order")],
  ["ada postMessage ke RN", html.includes("ReactNativeWebView.postMessage")],
  ["tidak ada tag script terputus", !html.includes("</script><script>")],
];

checks.forEach(([label, ok]) => {
  console.log(`  ${ok ? "[OK]  " : "[FAIL]"} ${label}`);
  if (!ok) failed = true;
});

process.exit(failed ? 1 : 0);
