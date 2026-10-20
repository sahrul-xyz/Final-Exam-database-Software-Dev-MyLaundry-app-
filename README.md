# MyLaundry Monorepo

> **On-Demand Laundry Marketplace Platform**  
> Final Project Submission for **IK301 (Advanced Database Systems)** & **IK102 (Software Development Fundamentals)**.

---

## 🚀 Quickstart Guide (Under 15 Minutes)

Follow these steps to run the complete MyLaundry platform locally.

### 1. Prerequisites & System Requirements
- **Node.js**: v18.x or v20.x ([Download Node.js](https://nodejs.org/))
- **npm**: v9.x or higher
- **Git**: For version control
- **Web Browser**: Chrome, Edge, or Firefox (for Partner Dashboard)
- **Expo Go App** (optional): On Android physical device, or Android Studio Emulator

---

### 2. Environment Setup

Copy the example environment files in both applications:

```bash
# Dashboard Web
cp frontend/dashboard/.env.example frontend/dashboard/.env

# Mobile App
cp frontend/mobile/.env.example frontend/mobile/.env
```

> **Note:** The default `.env` files point to our active cloud Supabase test instance. If you run Supabase locally, set the URL to `http://127.0.0.1:54321`.

#### Google Maps API Key (untuk fitur peta di aplikasi mobile)

```bash
# Isi dengan API key milik Anda pada file frontend/mobile/.env
# (Google Maps JavaScript API -> dipakai di dalam WebView peta)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

Langkah mendapatkan key:
1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat/pilih project.
2. **APIs & Services → Library** → aktifkan **Maps JavaScript API**.
3. **Credentials → Create Credentials → API key**.
4. Atur *Application restrictions* → **HTTP referrers**: `localhost*` (peta dirender di dalam WebView dengan base URL `https://localhost/`). > Kalau Google menolak dengan `RefererNotAllowedMapError`, ubah *Application restrictions* menjadi **None** dan *API restrictions* menjadi **Maps JavaScript API** saja.
5. Atur *API restrictions* → **Maps JavaScript API**.
6. Salin key ke `frontend/mobile/.env`, lalu jalankan `npx expo start -c` (clear cache).
7. Verifikasi: `cd frontend/mobile && npm run check:maps`

> Key ini dibaca oleh `frontend/mobile/app.config.ts` dan otomatis disisipkan ke `android.config.googleMaps.apiKey` serta `ios.config.googleMapsApiKey` saat build.
> **Bila key belum diisi**, peta otomatis memakai OpenStreetMap (tanpa API key) sehingga tetap tampil.

---

### 3. Running the Applications

#### A. Partner Web Dashboard
```bash
cd frontend/dashboard
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

#### B. Customer Mobile App
```bash
cd frontend/mobile
npm install
npm run start
```
- Press `w` to open in web browser for a quick preview, or
- Scan the QR code using the **Expo Go** app on your Android device.

---

### 4. Running Automated Tests (Single Command)

All automated unit and business rule tests can be run with a single command:

```bash
cd frontend/mobile
npm test
```

**Test Suite Coverage (25 Automated Tests):**
- Subtotal calculation & minimum quantity validation (`quantity >= 1`)
- Marketplace commission calculation (5% snapshot)
- Order expiration rules (15-min digital payment deadline & 30-min partner response deadline)
- Customer complaint window eligibility (strictly within 1 hour of completion)
- Order status state-machine lifecycle & legal transition validation
- Rupiah currency and Indonesian localized date formatters
- Map coordinate validation, region calculation & HTML map builder (Google/OSM)
---

## 🔑 Test Accounts (Akun Pengujian)

Use these credentials to test the application flows:

| Role | Email | Password | Scope & Notes |
|---|---|---|---|
| **Partner (Mitra)** | `mitra@mylaundry.com` | `password123` | Manages "Bersih Laundry Setiabudi" outlet, updates orders, changes service prices, views live analytics. |
| **Customer (Pelanggan)** | `pelanggan@mylaundry.com` | `password123` | Searches outlets, places orders via atomic transactions, tracks order progress in real-time, submits reviews. |

*You can also register new customer or partner accounts directly through the registration forms.*

---

## 🗺️ Fitur Peta Outlet (Google Maps)

Seluruh interaksi peta berlangsung **di dalam aplikasi** — tidak ada perpindahan ke aplikasi Google Maps.

| Kemampuan | Implementasi |
|---|---|
| Peta in-app | Google Maps **JavaScript API** di dalam `react-native-webview` (render penuh, 100% di dalam app) |
| API key | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` → dipakai sebagai key *Maps JavaScript API* |
| **Tema** | Tampilan **standar/bawaan** — Google Maps tanpa custom `styles`, OpenStreetMap tanpa filter warna |
| Marker outlet | Koordinat WGS84 dari kolom `latitude` / `longitude` pada tabel `laundry_outlets` |
| Detail outlet | Ketuk marker → popup berisi nama, alamat, rating, jarak, harga + tombol **Pesan** |
| Lokasi pengguna | `expo-location` dengan tombol "◎" (pusat peta ke posisi perangkat) |
| Fallback | Bila key kosong/tidak valid atau offline → otomatis beralih ke **OpenStreetMap** (Leaflet) |

> **Mengapa WebView, bukan `react-native-maps`?**
> Google Maps SDK native **tidak bisa dipakai di Expo Go** — API key bawaan Expo Go sudah tidak valid sehingga peta tampil gelap/hitam (`Google Android Maps SDK host.exp.exponent E Authorization failure`). Dengan WebView, peta **selalu tampil** di Expo Go, Android Emulator, maupun build production, karena hanya butuh koneksi internet.

Alur klik: `Beranda → Lihat peta` membuka **popup peta** (bottom sheet modal) di atas halaman → ketuk marker untuk melihat detail outlet → **Pesan** untuk lanjut memesan.

---

## 📁 Repository Structure

Adheres strictly to PRD v1.2 specifications:

```text
MyLaundry/
├── frontend/
│   ├── mobile/          # Customer Mobile App (React Native + TypeScript + Expo)
│   │   ├── src/
│   │   │   ├── components/  # Order modal, outlet cards, headers
│   │   │   ├── screens/     # Home, Map, Orders, Profile, Auth screens
│   │   │   ├── services/    # Supabase client, atomic RPC calls
│   │   │   ├── types/       # TypeScript schemas & status enums
│   │   │   └── utils/       # Formatters, business rule helpers, map HTML builder
│   │   ├── tests/           # Automated Jest test suites (25 tests)
│   │   └── package.json
│   └── dashboard/       # Partner Web Dashboard (React + Vite + TypeScript)
│       ├── src/
│       │   ├── components/  # Layout shell, UI badges, buttons
│       │   ├── features/    # Partner dashboard, weighing & order management
│       │   ├── pages/       # Partner & notice pages
│       │   ├── services/    # Supabase service & analytical view queries
│       │   └── types/       # Data contracts
│       └── package.json
├── backend/
│   ├── supabase/        # Database migrations, RLS policies, Edge functions
│   │   ├── migrations/      # Versioned PostgreSQL migrations
│   │   ├── functions/       # TypeScript Deno Edge Functions
│   │   ├── setup_complete.sql # All-in-one database script
│   │   └── seed.sql         # Seed outlets and services
│   └── README.md
├── docs/
│   ├── MyLanundry_PRD.md               # Product Requirements Document (PRD v1.2)
│   ├── DATABASE_IK301_EVIDENCE.md      # Technical evidence for IK301 (Transactions, Indexes, Analytics)
│   └── Kerangka_Wawancara_MyLanundry_V1.md # User research & pre-interview validation framework
├── .gitignore
└── README.md
```

---

## 🗄️ Database & Technical Evidence (IK301)

Detailed technical proofs are documented in **[`docs/DATABASE_IK301_EVIDENCE.md`](file:///c:/KULIAH/MyLaundry/docs/DATABASE_IK301_EVIDENCE.md)**:

1. **Relational Model (16 Tables):** Complete schema with explanation of 3NF normalization and deliberate denormalization (price & commission snapshots).
2. **Data Integrity:** Primary keys (UUIDv4), Foreign keys with `ON DELETE CASCADE/RESTRICT`, check constraints on prices, quantities, ratings, and unique constraints.
3. **Atomic Multi-Step Transaction:** `create_order_atomic` PL/pgSQL stored function wrapping orders, order items, audit history, and capacity reservations in an all-or-nothing ACID transaction.
4. **Server-Side Logic:** `on_auth_user_created` trigger and `create_order_atomic` stored procedure.
5. **Query Performance (Indexing):** 5 composite b-tree indexes with `EXPLAIN ANALYZE` proof showing query execution improvement from sequential scan (Seq Scan) to index scan (Bitmap Index Scan).
6. **Analytics (JOIN & Aggregation):** `v_partner_analytics` and `v_service_sales_report` analytical database views utilizing multiple `JOIN`s, `GROUP BY`, and aggregate functions (`SUM`, `COUNT`, `AVG`, `ROUND`).

---

## 🤖 AI Usage Statement

In accordance with Section 7 of the Ujian Akhir Startup Pitch guidelines:

- **AI Tools Used:** Google Antigravity / Gemini 3.8 Flash.
- **Purpose and Scope:**
  - Automated test scaffolding and test assertion design (`tests/orderBusinessRules.test.ts`).
  - Query plan benchmarking and indexing structure review for PostgreSQL.
  - Refactoring and sanitization of codebase (removing dead code and stabilizing Realtime WebSocket listeners).
- **Academic Integrity Statement:** All application architectures, data models, business rules, and technical implementations have been reviewed, verified, and are fully understood by each team member for defense during the live presentation.
