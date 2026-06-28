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
    });      navigate(redirectTo, { replace: true });
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
    <main className="login-page">
      <section className="login-visual-panel">
        <Link to="/" className="login-brand">
          <span>S</span>
          <div>
            <strong>Sisidang</strong>
            <small>Sistem Administrasi Skripsi</small>
          </div>
        </Link>

        <div className="login-hero-copy">
          <p className="eyebrow">Universitas Pancasila</p>
          <h1>Kelola proses skripsi dari seminar proposal sampai finalisasi.</h1>
          <p>
            Login untuk mengakses dashboard sesuai role: mahasiswa, dosen,
            koordinator, ketua prodi, staf prodi, atau admin.
          </p>
        </div>

        <div className="login-feature-grid">
          <article>
            <strong>RBAC</strong>
            <span>Menu sesuai role</span>
          </article>

          <article>
            <strong>Workflow</strong>
            <span>End-to-end skripsi</span>
          </article>

          <article>
            <strong>Audit</strong>
            <span>Aktivitas tercatat</span>
          </article>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="auth-card login-card">
          <div>
            <p className="eyebrow">Masuk Sistem</p>
            <h2>Login Sisidang</h2>
            <p className="muted">
              Gunakan identifier/NPM/NIDN dan password yang sudah terdaftar.
            </p>
          </div>

          {error ? <div className="alert-error">{error}</div> : null}

          <form className="form-stack" onSubmit={handleSubmit}>
            <label>
              <span>Identifier</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="admin / NPM / NIDN"
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
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="demo-login-box">
            <strong>Akun demo cepat</strong>
            <p>
              Admin: <code>admin</code> / <code>ChangeMe123!</code>
            </p>
            <p>
              Mahasiswa: <code>4519210110</code> / <code>Password123!</code>
            </p>
          </div>

          <Link to="/" className="text-link">
            Kembali ke Dashboard Publik
          </Link>
        </div>
      </section>
    </main>
  );
}