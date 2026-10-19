import { useState } from "react";
import { Brand } from "../../components/ui/Brand";
import { Button } from "../../components/ui/Button";
import {
  signIn,
  signUpWithRole,
  isSupabaseConfigured,
  UserProfile,
} from "../../services/supabase";

export function AuthPreview({
  onLogin,
}: {
  onLogin: (profile?: UserProfile) => void;
}) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [outletName, setOutletName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleSubmit = async () => {
    setErrorMsg("");
    setInfoMsg("");

    if (!email || !password) {
      setErrorMsg("Mohon masukkan email dan kata sandi.");
      return;
    }

    if (register && !fullName) {
      setErrorMsg("Mohon masukkan nama pemilik.");
      return;
    }

    if (register && !outletName) {
      setErrorMsg("Mohon masukkan nama outlet laundry.");
      return;
    }

    setLoading(true);

    try {
      if (register) {
        const { user, error } = await signUpWithRole({
          email,
          password,
          fullName,
          phone,
          role: "mitra",
          outletName,
        });

        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onLogin(user);
        }
      } else {
        const { user, error } = await signIn({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onLogin(user);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const title = register ? "Daftarkan Outlet Baru" : "Masuk Portal Mitra";
  const subtitle = register
    ? "Mulai kelola operasional dan terima pesanan laundry."
    : "Masuk untuk mengelola pesanan, layanan, dan outlet.";

  return (
    <div className="auth-overlay">
      <section className="auth-form">
        <div className="auth-login-shell">
          <Brand />
          <div className="auth-card">
            <div className="auth-heading">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span className="auth-eyebrow">Portal Mitra</span>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: isSupabaseConfigured
                      ? "var(--green)"
                      : "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: isSupabaseConfigured
                        ? "var(--green)"
                        : "#aaa",
                    }}
                  />
                  {isSupabaseConfigured ? "Supabase Live" : "Mode Simulasi"}
                </span>
              </div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--red-soft)",
                  color: "var(--red)",
                  fontSize: "11px",
                  marginBottom: "12px",
                }}
              >
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--green-soft)",
                  color: "var(--green)",
                  fontSize: "11px",
                  marginBottom: "12px",
                }}
              >
                {infoMsg}
              </div>
            )}

            {register && (
              <label>
                Nama outlet laundry
                <input
                  placeholder="Contoh: Bersih Laundry Setiabudi"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                />
              </label>
            )}

            {register && (
              <label>
                Nama pemilik
                <input
                  placeholder="Nama lengkap pemilik"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
            )}

            {register && (
              <label>
                Nomor telepon / WhatsApp
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            )}

            <label>
              Email Mitra
              <input
                type="email"
                placeholder="mitra@outlet.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Kata sandi
              <input
                type="password"
                placeholder={register ? "Minimal 8 karakter" : "Kata sandi"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </label>

            {!register && (
              <div className="auth-options">
                <label>
                  <input type="checkbox" defaultChecked /> Ingat saya
                </label>
                <button type="button">Lupa kata sandi?</button>
              </div>
            )}

            {register && (
              <p className="auth-terms">
                Dengan mendaftar, Anda menyetujui Syarat & Ketentuan Kemitraan
                serta Kebijakan Privasi MyLaundry.
              </p>
            )}

            <Button className="full" onClick={handleSubmit}>
              {loading
                ? "Memproses..."
                : register
                ? "Daftar sebagai Mitra"
                : "Masuk Mitra"}
            </Button>

            <p className="auth-switch">
              {register ? "Sudah memiliki akun mitra?" : "Belum terdaftar sebagai mitra?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setRegister(!register);
                  setErrorMsg("");
                  setInfoMsg("");
                }}
              >
                {register ? "Masuk" : "Daftar Outlet"}
              </button>
            </p>
          </div>

          <div className="auth-partner-entry">
            <p>
              Pelanggan laundry? Silakan gunakan aplikasi mobile Android{" "}
              <strong>MyLaundry</strong> untuk memesan.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
