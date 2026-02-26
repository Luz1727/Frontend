// LoginUltraLuxe.tsx (Ultra Premium Glass + Border Glow + Responsive)
// ✅ Misma lógica original (roles + navegación + submit)
// ✅ Solo cambios visuales (estilos + clases + responsive)

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
      const msg = err?.response?.data?.detail ?? "No se pudo iniciar sesión. Verifica tus credenciales.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage" style={styles.page}>
      {/* ===== CSS global (responsive + keyframes + polish) ===== */}
      <style>{CSS_GLOBAL}</style>

      {/* ===== Left: Brand / Story ===== */}
      <section className="loginLeft" style={styles.left}>
        <div style={styles.leftBgGrid} aria-hidden />
        <div style={styles.leftBlob1} aria-hidden />
        <div style={styles.leftBlob2} aria-hidden />
        <div style={styles.leftNoise} aria-hidden />

        {/* Partículas decorativas */}
        <div className="luxe-particles" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={`p p-${i + 1}`} />
          ))}
        </div>

        <header style={styles.brandRow}>
          <div style={styles.brandMark} className="brandMark">
            <div style={styles.brandDot} />
          </div>
          <div style={styles.brandTextWrap}>
            <div style={styles.brandName}>EDITORIAL</div>
            <div style={styles.brandTag}>Plataforma de gestión editorial</div>
          </div>
        </header>

        <div style={styles.centerCopy}>
          <div style={styles.heroPill} className="heroPill">
            <span style={styles.heroPillDot} />
            Acceso seguro por roles
          </div>

          <h2 style={styles.heroTitle}>
            Donde los <span style={styles.heroAccent}>manuscritos</span> se convierten en libros.
          </h2>

          <p style={styles.heroSubtitle}>
            Administra capítulos, versiones y dictámenes con un flujo claro, elegante y confiable.
          </p>

          <div style={styles.quoteCard} className="quoteCard">
            <div style={styles.quoteTop}>
              <span style={styles.quoteIcon} aria-hidden>
                ❝
              </span>
              <p style={styles.quote}>Los libros son espejos: solo se ve en ellos lo que ya llevas dentro.</p>
            </div>
            <div style={styles.quoteAuthor}>— Carlos Ruiz Zafón</div>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat} className="statCard">
              <div style={styles.statNum}>15K+</div>
              <div style={styles.statLbl}>Libros publicados</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat} className="statCard">
              <div style={styles.statNum}>500+</div>
              <div style={styles.statLbl}>Autores</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat} className="statCard">
              <div style={styles.statNum}>3.2M</div>
              <div style={styles.statLbl}>Lectores alcanzados</div>
            </div>
          </div>
        </div>

        <footer style={styles.leftFooter}>
          <div style={styles.footerPill} className="footerPill">
            <span style={styles.pillDot} />
            Seguridad & control por roles
          </div>
          <div style={styles.footerMini}>© {new Date().getFullYear()} Editorial Suite</div>
        </footer>
      </section>

      {/* ===== Right: Form ===== */}
      <section className="loginRight" style={styles.right}>
        {/* Glow behind card */}
        <div style={styles.rightGlow} aria-hidden />

        <div style={styles.formShell} className="formShell">
          <div style={styles.formHeader}>
            <div style={styles.formKicker} className="formKicker">
              Iniciar sesión
            </div>
            <h1 style={styles.formTitle}>Bienvenido de vuelta</h1>
            <p style={styles.formSubtitle}>Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={submit} style={styles.form}>
            {/* Email */}
            <label style={styles.field}>
              <span style={styles.label}>Correo</span>
              <div style={styles.inputWrap} className="inputWrap">
                <span style={styles.inputIcon} className="inputIcon" aria-hidden>
                  @
                </span>
                <input
                  style={styles.input}
                  className="loginInput"
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
              <div style={styles.inputWrap} className="inputWrap">
                <span style={styles.inputIcon} className="inputIcon" aria-hidden>
                  ●
                </span>
                <input
                  style={styles.input}
                  className="loginInput"
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
                  className="eyeBtn"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            {/* Error */}
            {errorMsg && (
              <div style={styles.errorBox} className="errorBox" role="alert" aria-live="polite">
                <div style={styles.errorDot} />
                <div>{errorMsg}</div>
              </div>
            )}

            {/* Actions */}
            <div style={styles.actionsRow}>
              <label style={styles.remember} className="rememberRow">
                <input style={styles.checkbox} type="checkbox" />
                <span>Recordarme</span>
              </label>

              <div style={styles.secureHint} className="secureHint">
                <span style={styles.secureDot} />
                Sesión cifrada
              </div>
            </div>

            {/* Button */}
            <button
              style={{
                ...styles.button,
                ...(!canSubmit ? styles.buttonDisabled : {}),
              }}
              className="primaryBtn"
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

            {/* Mini footer */}
            <div style={styles.formMini} className="formMini">
              Consejo: usa un correo válido y una contraseña segura.
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

/* =========================
   Styles (premium + responsive base)
========================= */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.25fr 1fr",
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: "#07070B",
  },

  /* LEFT */
  left: {
    position: "relative",
    padding: "60px 56px",
    overflow: "hidden",
    color: "rgba(255,255,255,0.92)",
    background:
      "radial-gradient(1200px 700px at 20% 10%, rgba(139,92,246,.38), transparent 58%), radial-gradient(900px 600px at 80% 70%, rgba(34,211,238,.22), transparent 58%), linear-gradient(145deg, #050509 0%, #0B0B12 55%, #07070E 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  leftNoise: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.08,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
    mixBlendMode: "overlay",
  },
  leftBgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
    backgroundSize: "52px 52px",
    opacity: 0.23,
    pointerEvents: "none",
    maskImage: "radial-gradient(740px 520px at 22% 18%, black 46%, transparent 70%)",
    WebkitMaskImage: "radial-gradient(740px 520px at 22% 18%, black 46%, transparent 70%)",
  },
  leftBlob1: {
    position: "absolute",
    width: 460,
    height: 460,
    borderRadius: 999,
    background: "radial-gradient(circle at 30% 30%, rgba(212,175,55,.32), rgba(212,175,55,0) 62%)",
    top: -160,
    left: -180,
    filter: "blur(2px)",
    opacity: 0.9,
    pointerEvents: "none",
  },
  leftBlob2: {
    position: "absolute",
    width: 560,
    height: 560,
    borderRadius: 999,
    background: "radial-gradient(circle at 60% 40%, rgba(139,92,246,.34), rgba(139,92,246,0) 65%)",
    bottom: -240,
    right: -240,
    filter: "blur(2px)",
    opacity: 0.95,
    pointerEvents: "none",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    zIndex: 1,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.14)",
    boxShadow: "0 18px 55px rgba(0,0,0,.38)",
    display: "grid",
    placeItems: "center",
    backdropFilter: "blur(12px)",
  },
  brandDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "linear-gradient(135deg, #D4AF37 0%, #F2E7A0 45%, #22D3EE 100%)",
    boxShadow: "0 12px 34px rgba(212,175,55,.22)",
  },
  brandTextWrap: { display: "flex", flexDirection: "column", gap: 2 },
  brandName: { fontWeight: 900, letterSpacing: "4px", fontSize: 13, opacity: 0.92 },
  brandTag: { fontSize: 12, color: "rgba(255,255,255,.65)" },

  centerCopy: { zIndex: 1, maxWidth: 580, marginTop: 24, marginBottom: 26 },

  heroPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    backdropFilter: "blur(10px)",
    color: "rgba(255,255,255,.76)",
    fontSize: 12,
    marginBottom: 18,
  },
  heroPillDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(34,211,238,.95)",
    boxShadow: "0 0 0 4px rgba(34,211,238,.12)",
  },

  heroTitle: {
    margin: 0,
    fontSize: 46,
    lineHeight: 1.06,
    letterSpacing: "-1.4px",
    fontWeight: 900,
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
    lineHeight: 1.75,
    color: "rgba(255,255,255,.72)",
    maxWidth: 540,
  },

  quoteCard: {
    marginTop: 18,
    padding: "18px 18px",
    borderRadius: 20,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.13)",
    boxShadow: "0 20px 70px rgba(0,0,0,.38)",
    backdropFilter: "blur(12px)",
  },
  quoteTop: { display: "flex", gap: 10, alignItems: "flex-start" },
  quoteIcon: { fontSize: 20, lineHeight: "20px", opacity: 0.85, transform: "translateY(2px)" },
  quote: { margin: 0, fontSize: 16, lineHeight: 1.65, color: "rgba(255,255,255,.86)" },
  quoteAuthor: { marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.62)" },

  statsRow: { marginTop: 22, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" },
  stat: { display: "flex", flexDirection: "column", gap: 4, minWidth: 130 },
  statNum: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.6px",
    background: "linear-gradient(90deg, #D4AF37 0%, #F2E7A0 35%, #8B5CF6 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  statLbl: { fontSize: 12, color: "rgba(255,255,255,.62)" },
  statDivider: { width: 1, height: 34, background: "rgba(255,255,255,.14)" },

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
    color: "rgba(255,255,255,.76)",
    fontSize: 12,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(212,175,55,.95)",
    boxShadow: "0 0 0 4px rgba(212,175,55,.12)",
  },
  footerMini: { fontSize: 12, color: "rgba(255,255,255,.52)" },

  /* RIGHT */
  right: {
    position: "relative",
    background:
      "radial-gradient(900px 650px at 70% 20%, rgba(139,92,246,.14), transparent 58%), radial-gradient(800px 520px at 20% 80%, rgba(34,211,238,.10), transparent 55%), linear-gradient(180deg, #07070B 0%, #06060A 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    overflow: "hidden",
  },
  rightGlow: {
    position: "absolute",
    width: 560,
    height: 560,
    borderRadius: 999,
    background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,.14), transparent 62%)",
    filter: "blur(1px)",
    opacity: 0.9,
    pointerEvents: "none",
  },

  formShell: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 26,
    padding: "28px 26px",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.14)",
    boxShadow: "0 34px 110px rgba(0,0,0,.62)",
    backdropFilter: "blur(16px)",
    position: "relative",
    zIndex: 2,
  },

  formHeader: { marginBottom: 18 },
  formKicker: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(212,175,55,.10)",
    border: "1px solid rgba(212,175,55,.24)",
    color: "rgba(242,231,160,.95)",
    fontSize: 12,
    letterSpacing: "0.3px",
    marginBottom: 10,
  },
  formTitle: { margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: "-0.8px", color: "rgba(255,255,255,.94)" },
  formSubtitle: { margin: "8px 0 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,.65)" },

  form: { display: "flex", flexDirection: "column", gap: 14 },

  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12, color: "rgba(255,255,255,.72)" },

  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 12px",
    borderRadius: 16,
    background: "rgba(0,0,0,.20)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)",
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
    color: "rgba(255,255,255,.80)",
    fontSize: 13,
    userSelect: "none",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "rgba(255,255,255,.94)",
    fontSize: 14,
    padding: "2px 0",
    width: "100%",
  },

  eyeBtn: {
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.82)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
    transition: "transform .12s ease, background .2s ease, border-color .2s ease",
    userSelect: "none",
  },

  errorBox: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "12px 12px",
    borderRadius: 16,
    background: "rgba(211,47,47,.14)",
    border: "1px solid rgba(211,47,47,.30)",
    color: "rgba(255,255,255,.94)",
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
    justifyContent: "space-between",
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
    color: "rgba(255,255,255,.72)",
    userSelect: "none",
  },
  checkbox: { width: 16, height: 16, accentColor: "#D4AF37" },

  secureHint: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "rgba(255,255,255,.60)",
  },
  secureDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(34,211,238,.95)",
    boxShadow: "0 0 0 4px rgba(34,211,238,.10)",
  },

  button: {
    position: "relative",
    overflow: "hidden",
    marginTop: 10,
    width: "100%",
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.16)",
    background: "linear-gradient(135deg, rgba(212,175,55,.96) 0%, rgba(242,231,160,.92) 40%, rgba(139,92,246,.92) 100%)",
    color: "#07070B",
    fontWeight: 950,
    letterSpacing: "0.6px",
    cursor: "pointer",
    boxShadow: "0 26px 80px rgba(0,0,0,.50)",
    transform: "translateZ(0)",
  },
  buttonDisabled: { opacity: 0.56, cursor: "not-allowed", filter: "saturate(.82)" },
  btnText: { position: "relative", zIndex: 2 },
  btnGlow: {
    position: "absolute",
    inset: -2,
    background: "radial-gradient(700px 180px at 50% -20%, rgba(255,255,255,.65), transparent 62%)",
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
    animation: "shimmer 2.8s ease-in-out infinite",
    pointerEvents: "none",
  },

  dividerRow: { marginTop: 16, display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.55)" },
  dividerLine: { height: 1, flex: 1, background: "rgba(255,255,255,.14)" },
  dividerText: { fontSize: 11, letterSpacing: "1.8px", textTransform: "uppercase" },

  formMini: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(255,255,255,.55)",
    lineHeight: 1.5,
  },
};

/* =========================
   CSS global embebido (partículas + responsive + focus + motion)
========================= */
const CSS_GLOBAL = `
/* Base */
.loginPage * { box-sizing: border-box; }
.loginPage ::selection { background: rgba(139,92,246,.35); }

/* Responsive: stack on smaller screens */
@media (max-width: 980px){
  .loginPage{
    grid-template-columns: 1fr !important;
  }
  .loginLeft{
    padding: 44px 22px !important;
    min-height: 52vh;
  }
  .loginRight{
    padding: 22px !important;
  }
}
@media (max-width: 520px){
  .loginLeft{
    padding: 40px 18px !important;
  }
  .formShell{
    padding: 22px 18px !important;
    border-radius: 22px !important;
  }
}

/* Animated premium border for card */
.formShell{
  position: relative;
}
.formShell::before{
  content:"";
  position:absolute;
  inset:-1px;
  border-radius: 28px;
  padding:1px;
  background: linear-gradient(120deg,
    rgba(212,175,55,.55),
    rgba(34,211,238,.38),
    rgba(139,92,246,.55)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity:.55;
  pointer-events:none;
}
.formShell::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius: 26px;
  background: radial-gradient(700px 260px at 20% 10%, rgba(34,211,238,.10), transparent 60%);
  opacity:.75;
  pointer-events:none;
}

/* Input hover + focus */
.inputWrap{
  transition: transform .14s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
}
.inputWrap:hover{
  border-color: rgba(255,255,255,.18);
  background: rgba(0,0,0,.22);
}
.inputWrap:focus-within{
  border-color: rgba(34,211,238,.42);
  box-shadow: 0 0 0 4px rgba(34,211,238,.10);
  transform: translateY(-1px);
}
.loginInput::placeholder{
  color: rgba(255,255,255,.38);
}
.loginInput:focus{
  outline: none;
}

/* Button hover */
.primaryBtn{
  transition: transform .14s ease, box-shadow .18s ease, filter .18s ease;
}
.primaryBtn:hover:enabled{
  transform: translateY(-1px);
  box-shadow: 0 30px 95px rgba(0,0,0,.58);
  filter: saturate(1.05);
}
.primaryBtn:active:enabled{
  transform: translateY(0px) scale(.99);
}

/* Eye button hover */
.eyeBtn:hover{
  background: rgba(255,255,255,.12);
  border-color: rgba(255,255,255,.20);
  transform: scale(1.02);
}

/* Quote / stat micro polish */
.quoteCard{
  transition: transform .16s ease, border-color .18s ease;
}
.quoteCard:hover{
  transform: translateY(-2px);
  border-color: rgba(255,255,255,.16);
}
.statCard{
  transition: transform .16s ease;
}
.statCard:hover{
  transform: translateY(-1px);
}

/* ===== Partículas ===== */
.luxe-particles{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.70;
  filter: saturate(1.05);
  z-index: 0;
}
.luxe-particles .p{
  position:absolute;
  width: 6px;
  height: 6px;
  border-radius:999px;
  background: radial-gradient(circle at 30% 30%,  rgba(255,255,255,.85), rgba(255,255,255,0) 70%);
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
.p-1  { left: 8%;  top: 16%; --x: 30px; --y: -70px; --dur: 10s; --op:.52; --s:1.0; }
.p-2  { left: 18%; top: 62%; --x: 45px; --y: -55px; --dur: 13s; --op:.33; --s:.9; }
.p-3  { left: 26%; top: 32%; --x: 20px; --y: -80px; --dur: 11s; --op:.42; --s:1.15; }
.p-4  { left: 34%; top: 74%; --x: 60px; --y: -40px; --dur: 15s; --op:.26; --s:.85; }
.p-5  { left: 44%; top: 18%; --x: 35px; --y: -65px; --dur: 12s; --op:.48; --s:1.05; }
.p-6  { left: 52%; top: 55%; --x: 55px; --y: -75px; --dur: 16s; --op:.30; --s:.9; }
.p-7  { left: 60%; top: 30%; --x: 25px; --y: -55px; --dur: 14s; --op:.38; --s:1.0; }
.p-8  { left: 68%; top: 70%; --x: 40px; --y: -85px; --dur: 17s; --op:.25; --s:1.2; }
.p-9  { left: 76%; top: 22%; --x: 65px; --y: -45px; --dur: 13s; --op:.40; --s:.95; }
.p-10 { left: 84%; top: 58%; --x: 30px; --y: -75px; --dur: 12s; --op:.30; --s:1.10; }
.p-11 { left: 12%; top: 40%; --x: 70px; --y: -35px; --dur: 18s; --op:.22; --s:1.30; }
.p-12 { left: 40%; top: 48%; --x: 20px; --y: -90px; --dur: 19s; --op:.18; --s:1.55; }
.p-13 { left: 72%; top: 44%; --x: 55px; --y: -55px; --dur: 15s; --op:.24; --s:1.35; }
.p-14 { left: 90%; top: 14%; --x: 35px; --y: -95px; --dur: 20s; --op:.20; --s:1.7; }

/* ===== Shimmer ===== */
@keyframes shimmer {
  0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
  15%{ opacity: .55; }
  100% { transform: translateX(320%) skewX(-18deg); opacity: 0; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .luxe-particles .p, .primaryBtn span, .quoteCard, .statCard{
    animation: none !important;
    transition: none !important;
  }
}
  html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  background: #07070B;
}

.loginPage .loginInput { background: transparent !important; }
.loginPage .inputWrap { background: rgba(0,0,0,.20) !important; }



/* ===== FIX AUTOFILL BLANCO ===== */
.loginPage input:-webkit-autofill,
.loginPage input:-webkit-autofill:hover,
.loginPage input:-webkit-autofill:focus,
.loginPage input:-webkit-autofill:active {
  -webkit-text-fill-color: rgba(255,255,255,.94) !important;
  caret-color: rgba(255,255,255,.94) !important;

  /* Esto elimina el fondo blanco */
  box-shadow: 0 0 0px 1000px rgba(0,0,0,.20) inset !important;
  -webkit-box-shadow: 0 0 0px 1000px rgba(0,0,0,.20) inset !important;

  border-radius: 16px !important;

  transition: background-color 9999s ease-in-out 0s;
}
  
`;
