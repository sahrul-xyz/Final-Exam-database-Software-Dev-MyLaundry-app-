import { Brand } from "../components/ui/Brand";
import { Button } from "../components/ui/Button";
import { UserProfile } from "../services/supabase";

export function CustomerNoticePage({
  currentUser,
  onLogout,
}: {
  currentUser?: UserProfile | null;
  onLogout: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: "24px",
        background: "var(--canvas)",
      }}
    >
      <div
        style={{
          width: "min(100%, 460px)",
          background: "white",
          borderRadius: "24px",
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--line)",
        }}
      >
        <Brand />
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "var(--blue-100)",
            color: "var(--blue-600)",
            fontSize: "26px",
            display: "grid",
            placeItems: "center",
            margin: "24px auto 16px",
          }}
        >
          📱
        </div>
        <h2 style={{ fontSize: "20px", color: "var(--blue-950)", marginBottom: "8px" }}>
          Khusus Mitra Laundry
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Halo <strong>{currentUser?.fullName || "Pelanggan"}</strong>, akun Anda
          terdaftar sebagai <strong>Pelanggan</strong>. Web Dashboard ini khusus untuk
          pengelolaan outlet bagi Mitra Laundry.
          <br /><br />
          Untuk mencari outlet dan memesan laundry, silakan gunakan aplikasi mobile
          <strong> MyLaundry (Android)</strong>.
        </p>
        <Button className="full" onClick={onLogout}>
          Keluar / Masuk Sebagai Mitra
        </Button>
      </div>
    </div>
  );
}
