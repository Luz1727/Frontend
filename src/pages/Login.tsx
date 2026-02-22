// LoginMinimalistLuxe.tsx (Premium Glass + Luxe + Partículas)
// ✅ Con toda la lógica original de roles y navegación
// ✅ Eliminado completamente la sección de accesos de prueba
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

// ===== TYPES (preservados del original) =====
type User = {
  id: number;
  name: string;
  email: string;
  role: "editorial" | "dictaminador" | "autor";
};

type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

// ✅ Rutas por rol (igual que el original)
const HOME_BY_ROLE: Record<User["role"], string> = {
  editorial: "/",
  dictaminador: "/dictaminador/Dictaminador",
  autor: "/autor/mis-envios",
};

// ✅ Validación de "from" (igual que el original)
function isAllowedFrom(role: User["role"], from: string) {
  if (!from) return false;
  if (from === "/login") return false;

  if (role === "editorial") {
    return ["/", "/convocatorias", "/libros", "/capitulos", "/dictamenes", "/constancias", "/usuarios"].some(
      (p) => from === p || from.startsWith(p + "/")
    );
  }

  if (role === "dictaminador") return from.startsWith("/dictaminador");
  if (role === "autor") return from.startsWith("/autor");

  return false;
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const canSubmit = useMemo(() => {
    return !!email.trim() && !!password.trim() && !loading;
  }, [email, password, loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Ingresa tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      // ✅ Guardar token y usuario (igual que el original)
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ Lógica de redirección por rol (igual que el original)
      const from = (history.state?.usr?.from as string | undefined) ?? "";
      const fallback = HOME_BY_ROLE[data.user.role];
      const target = isAllowedFrom(data.user.role, from) ? from : fallback;
      
      nav(target, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        "No se pudo iniciar sesión. Verifica tus credenciales.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* ===== CSS global embebido (partículas + keyframes) ===== */}
      <style>{CSS_GLOBAL}</style>

      {/* ===== Left: Brand / Story ===== */}
      <section style={styles.left}>
        <div style={styles.leftBgGrid} aria-hidden />
        <div style={styles.leftBlob1} aria-hidden />
        <div style={styles.leftBlob2} aria-hidden />

        {/* Partículas decorativas */}
        <div className="luxe-particles" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={`p p-${i + 1}`} />
          ))}
        </div>

        <header style={styles.brandRow}>
          <div style={styles.brandMark}>
            <div style={styles.brandDot} />
          </div>
          <div style={styles.brandTextWrap}>
            <div style={styles.brandName}>EDITORIAL</div>
            <div style={styles.brandTag}>Plataforma de gestión editorial</div>
          </div>
        </header>

        <div style={styles.centerCopy}>
          <h2 style={styles.heroTitle}>
            Donde los <span style={styles.heroAccent}>manuscritos</span> se convierten en libros.
          </h2>

          <p style={styles.heroSubtitle}>
            Accede para administrar capítulos, versiones, dictámenes y evaluación con un flujo claro y profesional.
          </p>

          <div style={styles.quoteCard}>
            <div style={styles.quoteTop}>
              <span style={styles.quoteIcon} aria-hidden>❝</span>
              <p style={styles.quote}>
                Los libros son espejos: solo se ve en ellos lo que ya llevas dentro.
              </p>
            </div>
            <div style={styles.quoteAuthor}>— Carlos Ruiz Zafón</div>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <div style={styles.statNum}>15K+</div>
              <div style={styles.statLbl}>Libros publicados</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <div style={styles.statNum}>500+</div>
              <div style={styles.statLbl}>Autores</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <div style={styles.statNum}>3.2M</div>
              <div style={styles.statLbl}>Lectores alcanzados</div>
            </div>
          </div>
        </div>

        <footer style={styles.leftFooter}>
          <div style={styles.footerPill}>
            <span style={styles.pillDot} />
            Seguridad & control por roles
          </div>
          <div style={styles.footerMini}>© {new Date().getFullYear()} Editorial Suite</div>
        </footer>
      </section>

      {/* ===== Right: Form ===== */}
      <section style={styles.right}>
        <div style={styles.formShell}>
          <div style={styles.formHeader}>
            <div style={styles.formKicker}>Iniciar sesión</div>
            <h1 style={styles.formTitle}>Bienvenido de vuelta</h1>
            <p style={styles.formSubtitle}>Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={submit} style={styles.form}>
            {/* Email */}
            <label style={styles.field}>
              <span style={styles.label}>Correo</span>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon} aria-hidden>@</span>
                <input
                  style={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu_correo@dominio.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>
            </label>

            {/* Password */}
            <label style={styles.field}>
              <span style={styles.label}>Contraseña</span>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon} aria-hidden>●</span>
                <input
                  style={styles.input}
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            {/* Error */}
            {errorMsg && (
              <div style={styles.errorBox} role="alert">
                <div style={styles.errorDot} />
                <div>{errorMsg}</div>
              </div>
            )}

            {/* Actions - Solo checkbox */}
            <div style={styles.actionsRow}>
              <label style={styles.remember}>
                <input style={styles.checkbox} type="checkbox" />
                <span>Recordarme</span>
              </label>
            </div>

            {/* Button */}
            <button
              style={{
                ...styles.button,
                ...(!canSubmit ? styles.buttonDisabled : {}),
              }}
              type="submit"
              disabled={!canSubmit}
            >
              <span style={styles.btnGlow} aria-hidden />
              <span style={styles.btnText}>{loading ? "Accediendo..." : "Acceder"}</span>
              <span style={styles.btnShimmer} aria-hidden />
            </button>

            {/* Divider */}
            <div style={styles.dividerRow}>
              <div style={styles.dividerLine} />
              <div style={styles.dividerText}>Editorial Suite</div>
              <div style={styles.dividerLine} />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

/* =========================
   Styles (premium + responsive)
========================= */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: "#0B0B10",
  },

  /* LEFT */
  left: {
    position: "relative",
    padding: "56px 56px",
    overflow: "hidden",
    color: "rgba(255,255,255,0.92)",
    background: "radial-gradient(1200px 700px at 20% 10%, rgba(139,92,246,.35), transparent 55%), radial-gradient(900px 600px at 80% 70%, rgba(34,211,238,.22), transparent 55%), linear-gradient(145deg, #07070B 0%, #0D0D14 55%, #0A0A10 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  leftBgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    opacity: 0.25,
    pointerEvents: "none",
    maskImage: "radial-gradient(700px 450px at 25% 20%, black 45%, transparent 70%)",
    WebkitMaskImage: "radial-gradient(700px 450px at 25% 20%, black 45%, transparent 70%)",
  },
  leftBlob1: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 999,
    background: "radial-gradient(circle at 30% 30%, rgba(212,175,55,.35), rgba(212,175,55,0) 60%)",
    top: -140,
    left: -160,
    filter: "blur(2px)",
    opacity: 0.8,
    pointerEvents: "none",
  },
  leftBlob2: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 999,
    background: "radial-gradient(circle at 60% 40%, rgba(139,92,246,.35), rgba(139,92,246,0) 62%)",
    bottom: -220,
    right: -220,
    filter: "blur(2px)",
    opacity: 0.9,
    pointerEvents: "none",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    zIndex: 1,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 18px 50px rgba(0,0,0,.35)",
    display: "grid",
    placeItems: "center",
    backdropFilter: "blur(10px)",
  },
  brandDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "linear-gradient(135deg, #D4AF37 0%, #F2E7A0 45%, #8B5CF6 100%)",
    boxShadow: "0 10px 30px rgba(212,175,55,.25)",
  },
  brandTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  brandName: {
    fontWeight: 800,
    letterSpacing: "4px",
    fontSize: 13,
    opacity: 0.92,
  },
  brandTag: {
    fontSize: 12,
    color: "rgba(255,255,255,.65)",
  },

  centerCopy: {
    zIndex: 1,
    maxWidth: 560,
    marginTop: 26,
    marginBottom: 26,
  },
  heroTitle: {
    margin: 0,
    fontSize: 44,
    lineHeight: 1.08,
    letterSpacing: "-1.2px",
    fontWeight: 800,
  },
  heroAccent: {
    background: "linear-gradient(90deg, #D4AF37 0%, #F2E7A0 35%, #22D3EE 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  heroSubtitle: {
    marginTop: 16,
    marginBottom: 22,
    fontSize: 15,
    lineHeight: 1.7,
    color: "rgba(255,255,255,.72)",
    maxWidth: 520,
  },
  quoteCard: {
    marginTop: 18,
    padding: "18px 18px",
    borderRadius: 18,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 18px 60px rgba(0,0,0,.35)",
    backdropFilter: "blur(10px)",
  },
  quoteTop: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  quoteIcon: {
    fontSize: 20,
    lineHeight: "20px",
    opacity: 0.8,
    transform: "translateY(2px)",
  },
  quote: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.65,
    color: "rgba(255,255,255,.85)",
  },
  quoteAuthor: {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(255,255,255,.6)",
  },

  statsRow: {
    marginTop: 22,
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 130,
  },
  statNum: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.6px",
    background: "linear-gradient(90deg, #D4AF37 0%, #F2E7A0 35%, #8B5CF6 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  statLbl: {
    fontSize: 12,
    color: "rgba(255,255,255,.62)",
  },
  statDivider: {
    width: 1,
    height: 34,
    background: "rgba(255,255,255,.14)",
  },

  leftFooter: {
    zIndex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  footerPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    backdropFilter: "blur(10px)",
    color: "rgba(255,255,255,.75)",
    fontSize: 12,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(34,211,238,.9)",
    boxShadow: "0 0 0 4px rgba(34,211,238,.12)",
  },
  footerMini: {
    fontSize: 12,
    color: "rgba(255,255,255,.52)",
  },

  /* RIGHT */
  right: {
    background: "radial-gradient(900px 650px at 70% 20%, rgba(139,92,246,.10), transparent 55%), linear-gradient(180deg, #0C0C12 0%, #0A0A10 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  formShell: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: "28px 26px",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 30px 90px rgba(0,0,0,.55)",
    backdropFilter: "blur(14px)",
  },
  formHeader: {
    marginBottom: 18,
  },
  formKicker: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(212,175,55,.10)",
    border: "1px solid rgba(212,175,55,.22)",
    color: "rgba(242,231,160,.95)",
    fontSize: 12,
    letterSpacing: "0.3px",
    marginBottom: 10,
  },
  formTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: "-0.8px",
    color: "rgba(255,255,255,.92)",
  },
  formSubtitle: {
    margin: "8px 0 0 0",
    fontSize: 13,
    lineHeight: 1.6,
    color: "rgba(255,255,255,.65)",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: "rgba(255,255,255,.70)",
  },

  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 12px",
    borderRadius: 16,
    background: "rgba(0,0,0,.22)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)",
  },
  inputIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
    color: "rgba(255,255,255,.78)",
    fontSize: 13,
    userSelect: "none",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "rgba(255,255,255,.92)",
    fontSize: 14,
    padding: "2px 0",
    width: "100%",
  },

  eyeBtn: {
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.80)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
    transition: "transform .12s ease, background .2s ease",
    userSelect: "none",
  },

  errorBox: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "12px 12px",
    borderRadius: 16,
    background: "rgba(211,47,47,.14)",
    border: "1px solid rgba(211,47,47,.28)",
    color: "rgba(255,255,255,.92)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  errorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(255,99,99,.95)",
    boxShadow: "0 0 0 4px rgba(255,99,99,.16)",
    transform: "translateY(4px)",
    flex: "0 0 auto",
  },

  actionsRow: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 2,
  },
  remember: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "rgba(255,255,255,.70)",
    userSelect: "none",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#D4AF37",
  },

  button: {
    position: "relative",
    overflow: "hidden",
    marginTop: 10,
    width: "100%",
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(135deg, rgba(212,175,55,.95) 0%, rgba(242,231,160,.92) 40%, rgba(139,92,246,.92) 100%)",
    color: "#0B0B10",
    fontWeight: 900,
    letterSpacing: "0.6px",
    cursor: "pointer",
    boxShadow: "0 24px 70px rgba(0,0,0,.45)",
    transform: "translateZ(0)",
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    filter: "saturate(.8)",
  },
  btnText: {
    position: "relative",
    zIndex: 2,
  },
  btnGlow: {
    position: "absolute",
    inset: -2,
    background: "radial-gradient(600px 160px at 50% -20%, rgba(255,255,255,.60), transparent 60%)",
    opacity: 0.55,
    zIndex: 1,
    pointerEvents: "none",
  },
  btnShimmer: {
    position: "absolute",
    top: 0,
    left: "-40%",
    height: "100%",
    width: "40%",
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)",
    transform: "skewX(-18deg)",
    opacity: 0.55,
    animation: "shimmer 2.6s ease-in-out infinite",
    pointerEvents: "none",
  },

  dividerRow: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "rgba(255,255,255,.55)",
  },
  dividerLine: {
    height: 1,
    flex: 1,
    background: "rgba(255,255,255,.14)",
  },
  dividerText: {
    fontSize: 11,
    letterSpacing: "1.8px",
    textTransform: "uppercase",
  },
};

/* =========================
   CSS global embebido (partículas + shimmer)
========================= */
const CSS_GLOBAL = `
/* ===== Partículas ===== */
.luxe-particles{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.75;
  filter: saturate(1.05);
  z-index: 0;
}

.luxe-particles .p{
  position:absolute;
  width: 6px;
  height: 6px;
  border-radius:999px;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.85), rgba(255,255,255,0) 70%);
  box-shadow:
    0 0 18px rgba(34,211,238,.12),
    0 0 26px rgba(139,92,246,.12);
  animation: floaty var(--dur, 12s) ease-in-out infinite;
  transform: translate3d(0,0,0) scale(var(--s,1));
  opacity: var(--op, .55);
}

.luxe-particles .p::after{
  content:"";
  position:absolute;
  inset:-10px;
  border-radius:999px;
  background: radial-gradient(circle, rgba(212,175,55,.10), transparent 65%);
  filter: blur(6px);
  opacity: .8;
}

@keyframes floaty{
  0%   { transform: translate3d(0,0,0) scale(var(--s,1)); }
  50%  { transform: translate3d(var(--x, 40px), var(--y, -60px), 0) scale(var(--s,1)); }
  100% { transform: translate3d(0,0,0) scale(var(--s,1)); }
}

/* posiciones + variaciones (14 partículas) */
.p-1  { left: 8%;  top: 16%; --x: 30px; --y: -70px; --dur: 10s; --op:.55; --s:1.0; }
.p-2  { left: 18%; top: 62%; --x: 45px; --y: -55px; --dur: 13s; --op:.35; --s:.9; }
.p-3  { left: 26%; top: 32%; --x: 20px; --y: -80px; --dur: 11s; --op:.45; --s:1.2; }
.p-4  { left: 34%; top: 74%; --x: 60px; --y: -40px; --dur: 15s; --op:.28; --s:.85; }
.p-5  { left: 44%; top: 18%; --x: 35px; --y: -65px; --dur: 12s; --op:.50; --s:1.1; }
.p-6  { left: 52%; top: 55%; --x: 55px; --y: -75px; --dur: 16s; --op:.30; --s:.9; }
.p-7  { left: 60%; top: 30%; --x: 25px; --y: -55px; --dur: 14s; --op:.40; --s:1.0; }
.p-8  { left: 68%; top: 70%; --x: 40px; --y: -85px; --dur: 17s; --op:.26; --s:1.25; }
.p-9  { left: 76%; top: 22%; --x: 65px; --y: -45px; --dur: 13s; --op:.42; --s:.95; }
.p-10 { left: 84%; top: 58%; --x: 30px; --y: -75px; --dur: 12s; --op:.30; --s:1.15; }
.p-11 { left: 12%; top: 40%; --x: 70px; --y: -35px; --dur: 18s; --op:.22; --s:1.35; }
.p-12 { left: 40%; top: 48%; --x: 20px; --y: -90px; --dur: 19s; --op:.18; --s:1.6; }
.p-13 { left: 72%; top: 44%; --x: 55px; --y: -55px; --dur: 15s; --op:.25; --s:1.4; }
.p-14 { left: 90%; top: 14%; --x: 35px; --y: -95px; --dur: 20s; --op:.22; --s:1.8; }

/* ===== Shimmer ===== */
@keyframes shimmer {
  0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
  15%{ opacity: .55; }
  100% { transform: translateX(320%) skewX(-18deg); opacity: 0; }
}

/* Hover effects */
.eyeBtn:hover {
  background: rgba(255,255,255,.12);
  transform: scale(1.02);
}
`