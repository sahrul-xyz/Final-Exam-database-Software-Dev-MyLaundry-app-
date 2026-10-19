# MyLaundry Monorepo

Marketplace Jasa Laundry berbasis platform Android (Pelanggan) dan Dashboard Web (Mitra).

## 📁 Struktur Repositori

Sesuai dengan spesifikasi PRD v1.2:

```text
MyLaundry/
├── frontend/
│   ├── mobile/          # Aplikasi Mobile Pelanggan (React Native + TypeScript)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── navigation/
│   │   │   ├── screens/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── tests/
│   │   └── package.json
│   └── dashboard/       # Dashboard Web Mitra & Admin (React + Vite + TypeScript)
│       ├── src/
│       │   ├── components/
│       │   ├── features/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
├── backend/
│   ├── supabase/        # Database PostgreSQL, RLS, Migrations, Edge Functions
│   │   ├── migrations/
│   │   ├── functions/
│   │   ├── seed.sql
│   │   └── config.toml
│   └── README.md
├── docs/
│   └── MyLanundry_PRD.md # Dokumen Spesifikasi Kebutuhan Produk (PRD)
├── .gitignore
└── README.md
```

## 🚀 Memulai Pengembangan

### 1. Dashboard Web Mitra
Masuk ke direktori `frontend/dashboard`:
```bash
cd frontend/dashboard
npm install
npm run dev
```

### 2. Mobile App Pelanggan
Masuk ke direktori `frontend/mobile`:
```bash
cd frontend/mobile
npm install
npm run start
```

### 3. Backend Supabase
Gunakan Supabase CLI untuk menjalankan database lokal:
```bash
cd backend/supabase
supabase start
```
