import { useState, useEffect } from "react";
import { Brand } from "./components/ui/Brand";
import { Icon } from "./components/ui/Icon";
import { AuthPreview } from "./features/auth/AuthPreview";
import { PartnerDashboardPage } from "./pages/PartnerDashboardPage";
import { CustomerNoticePage } from "./pages/CustomerNoticePage";
import {
  getCurrentProfile,
  signOut,
  UserProfile,
  isSupabaseConfigured,
  supabase,
} from "./services/supabase";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Cek sesi yang sudah ada saat aplikasi dimuat
    getCurrentProfile().then((profile) => {
      if (profile) {
        setCurrentUser(profile);
      }
      setCheckingAuth(false);
    });

    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await getCurrentProfile();
          setCurrentUser(profile);
        } else {
          setCurrentUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          background: "var(--canvas)",
          fontFamily: "var(--font-sans, sans-serif)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Brand />
          <p style={{ marginTop: "16px", color: "var(--muted)", fontSize: "13px" }}>
            Memuat Portal Mitra...
          </p>
        </div>
      </div>
    );
  }

  // Jika belum login
  if (!currentUser) {
    return (
      <AuthPreview
        onLogin={(profile) => {
          if (profile) {
            setCurrentUser(profile);
          } else {
            // fallback mock user
            setCurrentUser({
              id: "mock-partner-id",
              email: "mitra@outlet.id",
              fullName: "Bersih Laundry",
              role: "mitra",
            });
          }
        }}
      />
    );
  }

  // Jika akun adalah pelanggan, tampilkan notice khusus mobile app
  if (currentUser.role === "pelanggan") {
    return (
      <CustomerNoticePage
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // Tampilan Dashboard Mitra
  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <div className="signed-role">
          <span>Masuk sebagai</span>
          <strong>Mitra Laundry</strong>
          {currentUser && (
            <small style={{ color: "var(--muted)", marginLeft: "4px" }}>
              ({currentUser.fullName})
            </small>
          )}
        </div>
        <div className="topbar-meta">
          <span
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "6px",
              background: isSupabaseConfigured ? "var(--green-soft)" : "#eee",
              color: isSupabaseConfigured ? "var(--green)" : "#666",
              fontWeight: 600,
            }}
          >
            {isSupabaseConfigured ? "● Supabase Terhubung" : "○ Mode Simulasi"}
          </span>
          <button type="button" onClick={handleLogout}>Keluar</button>
          <b>Bahasa Indonesia</b>
        </div>
        <button type="button" className="logout-mobile" onClick={handleLogout}>
          <Icon name="arrow" size={16} /> Keluar
        </button>
      </header>

      <PartnerDashboardPage currentUser={currentUser} />
    </div>
  );
}
