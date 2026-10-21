

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

