import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname || "/app";

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await login({
        identifier,
        password
      });

      navigate(redirectTo, { replace: true });
    } catch (loginError: unknown) {
      setError(
        getApiErrorMessage(
          loginError,
          "Login gagal. Periksa identifier dan password."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-up">
      <section className="auth-hero">
        <div className="auth-brand-card">
          <img
            src="/logo-up.png"
            alt="Logo Universitas Pancasila"
            className="auth-logo"
          />

          <div>
            <p className="auth-eyebrow">Universitas Pancasila</p>
            <h1>Sisidang Teknik Informatika</h1>
            <p>
              Sistem administrasi skripsi untuk pendaftaran seminar proposal,
              bimbingan, jadwal sidang, nilai, revisi, dan finalisasi.
            </p>
          </div>
        </div>

        <div className="auth-feature-grid">
          <article>
            <strong>Terstruktur</strong>
            <span>Alur skripsi dari proposal sampai finalisasi.</span>
          </article>

          <article>
            <strong>Responsif</strong>
            <span>Nyaman dipakai di laptop, tablet, dan ponsel.</span>
          </article>

          <article>
            <strong>Terpantau</strong>
            <span>Progress bimbingan dan status sidang lebih jelas.</span>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-head">
          <img
            src="/logo-up.png"
            alt="Logo Universitas Pancasila"
            className="auth-panel-logo"
          />

          <div>
            <p className="eyebrow">Masuk Aplikasi</p>
            <h2>Selamat Datang</h2>
            <p className="muted">
              Gunakan akun mahasiswa, dosen, atau admin yang sudah terdaftar.
            </p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Identifier / NPM / NIDN / Email</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Contoh: admin atau 4519210110"
              autoComplete="username"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </label>

          {error ? <div className="alert-error">{error}</div> : null}

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Masuk Dashboard"}
          </button>
        </form>

        <div className="auth-footer-note">
          <span>Ingin melihat jadwal sidang?</span>
          <Link to="/">Buka Dashboard Publik</Link>
        </div>
      </section>
    </main>
  );
}