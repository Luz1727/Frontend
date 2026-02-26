import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import styles from './Login.module.css';

// ===== TYPES =====
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

// ✅ Rutas por rol
const HOME_BY_ROLE: Record<User["role"], string> = {
  editorial: "/",
  dictaminador: "/dictaminador/Dictaminador",
  autor: "/autor/mis-envios",
};

// ✅ Validación de "from"
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const leftRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = useMemo(() => {
    return !!email.trim() && !!password.trim() && !loading;
  }, [email, password, loading]);

  // ===== FX: Parallax blobs + glow follow mouse =====
  useEffect(() => {
    const el = leftRef.current;
    const card = cardRef.current;
    if (!el || !card) return;

    const prefersReduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduce) return;

    let raf = 0;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width;
        const cy = (e.clientY - r.top) / r.height;

        // blobs parallax
        el.style.setProperty("--mx", `${(cx - 0.5) * 2}`);
        el.style.setProperty("--my", `${(cy - 0.5) * 2}`);

        // card tilt
        const cr = card.getBoundingClientRect();
        const ccx = (e.clientX - cr.left) / cr.width;
        const ccy = (e.clientY - cr.top) / cr.height;
        const rx = clamp((0.5 - ccy) * 6, -6, 6);
        const ry = clamp((ccx - 0.5) * 7, -7, 7);
        card.style.setProperty("--rx", `${rx}deg`);
        card.style.setProperty("--ry", `${ry}deg`);

        // glow follow
        card.style.setProperty("--gx", `${ccx * 100}%`);
        card.style.setProperty("--gy", `${ccy * 100}%`);
      });
    };

    const onLeave = () => {
      el.style.setProperty("--mx", `0`);
      el.style.setProperty("--my", `0`);
      card.style.setProperty("--rx", `0deg`);
      card.style.setProperty("--ry", `0deg`);
      card.style.setProperty("--gx", `50%`);
      card.style.setProperty("--gy", `25%`);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

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

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

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

  const errorId = errorMsg ? "login-error" : undefined;

  // ===== FX: Ripple on button click =====
  const onRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const span = document.createElement("span");
    span.className = styles.ripple;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    btn.appendChild(span);

    setTimeout(() => span.remove(), 650);
  };

  return (
    <div className={styles.page} data-scope="login-luxe">
      {/* ===== Left: Brand / Story ===== */}
      <section 
        className={styles.left} 
        ref={leftRef as any}
        style={{ "--mx": 0, "--my": 0 } as React.CSSProperties}
      >
        {/* Aurora + noise layer */}
        <div className={styles.fxAurora} aria-hidden />
        <div className={styles.fxNoise} aria-hidden />

        <div className={styles.leftBgGrid} aria-hidden />
        <div className={`${styles.leftBlob1} ${styles.blob}`} aria-hidden />
        <div className={`${styles.leftBlob2} ${styles.blob}`} aria-hidden />

        {/* Partículas decorativas */}
        <div className={styles.luxeParticles} aria-hidden>
          <span className={`${styles.particle} ${styles.particle1}`} />
          <span className={`${styles.particle} ${styles.particle2}`} />
          <span className={`${styles.particle} ${styles.particle3}`} />
          <span className={`${styles.particle} ${styles.particle4}`} />
          <span className={`${styles.particle} ${styles.particle5}`} />
          <span className={`${styles.particle} ${styles.particle6}`} />
          <span className={`${styles.particle} ${styles.particle7}`} />
          <span className={`${styles.particle} ${styles.particle8}`} />
          <span className={`${styles.particle} ${styles.particle9}`} />
          <span className={`${styles.particle} ${styles.particle10}`} />
          <span className={`${styles.particle} ${styles.particle11}`} />
          <span className={`${styles.particle} ${styles.particle12}`} />
          <span className={`${styles.particle} ${styles.particle13}`} />
          <span className={`${styles.particle} ${styles.particle14}`} />
        </div>

        <header className={styles.brandRow}>
          <div className={styles.brandMark} aria-hidden>
            <div className={styles.brandDot} />
          </div>
          <div className={styles.brandTextWrap}>
            <div className={styles.brandName}>EDITORIAL</div>
            <div className={styles.brandTag}>Plataforma de gestión editorial</div>
          </div>
        </header>

        <div className={styles.centerCopy}>
          <h2 className={styles.heroTitle}>
            Donde los <span className={styles.heroAccent}>manuscritos</span> se convierten en libros.
          </h2>

          <p className={styles.heroSubtitle}>
            Accede para administrar capítulos, versiones, dictámenes y evaluación con un flujo claro y profesional.
          </p>

          <div className={styles.quoteCard}>
            <div className={styles.quoteTop}>
              <span className={styles.quoteIcon} aria-hidden>
                ❝
              </span>
              <p className={styles.quote}>Los libros son espejos: solo se ve en ellos lo que ya llevas dentro.</p>
            </div>
            <div className={styles.quoteAuthor}>— Carlos Ruiz Zafón</div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statNum}>15K+</div>
              <div className={styles.statLbl}>Libros publicados</div>
            </div>
            <div className={styles.statDivider} aria-hidden />
            <div className={styles.stat}>
              <div className={styles.statNum}>500+</div>
              <div className={styles.statLbl}>Autores</div>
            </div>
            <div className={styles.statDivider} aria-hidden />
            <div className={styles.stat}>
              <div className={styles.statNum}>3.2M</div>
              <div className={styles.statLbl}>Lectores alcanzados</div>
            </div>
          </div>
        </div>

        <footer className={styles.leftFooter}>
          <div className={styles.footerPill}>
            <span className={styles.pillDot} aria-hidden />
            Seguridad & control por roles
          </div>
          <div className={styles.footerMini}>© {new Date().getFullYear()} Editorial Suite</div>
        </footer>
      </section>

      {/* ===== Right: Form ===== */}
      <section className={styles.right}>
        <div 
          ref={cardRef} 
          className={`${styles.formShell} ${styles.glassShell}`}
          style={{ 
            "--rx": "0deg", 
            "--ry": "0deg", 
            "--gx": "50%", 
            "--gy": "25%" 
          } as React.CSSProperties}
        >
          <div className={styles.borderGlow} aria-hidden />

          <div className={styles.formHeader}>
            <div className={styles.formKicker}>Iniciar sesión</div>
            <h1 className={styles.formTitle}>Bienvenido de vuelta</h1>
            <p className={styles.formSubtitle}>Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={submit} className={styles.form} noValidate>
            {/* Email */}
            <label className={styles.field}>
              <span className={styles.label}>Correo</span>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden>
                  @
                </span>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu_correo@dominio.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                  aria-invalid={!!errorMsg}
                  aria-describedby={errorId}
                />
                <span className={styles.scanline} aria-hidden />
              </div>
            </label>

            {/* Password */}
            <label className={styles.field}>
              <span className={styles.label}>Contraseña</span>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden>
                  ●
                </span>
                <input
                  className={styles.input}
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  aria-invalid={!!errorMsg}
                  aria-describedby={errorId}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? "Ocultar" : "Ver"}
                </button>
                <span className={styles.scanline} aria-hidden />
              </div>
            </label>

            {errorMsg && (
              <div id="login-error" className={styles.errorBox} role="alert" aria-live="polite">
                <div className={styles.errorDot} aria-hidden />
                <div>{errorMsg}</div>
              </div>
            )}

            <div className={styles.actionsRow}>
              <label className={styles.remember}>
                <input className={styles.checkbox} type="checkbox" />
                <span>Recordarme</span>
              </label>
            </div>

            <button
              className={`${styles.button} ${!canSubmit ? styles.buttonDisabled : ""}`}
              type="submit"
              disabled={!canSubmit}
              onClick={onRipple}
            >
              <span className={styles.btnGlow} aria-hidden />
              <span className={styles.btnText}>
                {loading ? (
                  <span className={styles.loadingRow}>
                    <span className={styles.spin} aria-hidden />
                    Accediendo...
                  </span>
                ) : (
                  "Acceder"
                )}
              </span>
              <span className={styles.btnShimmer} aria-hidden />
            </button>

            <div className={styles.dividerRow} aria-hidden>
              <div className={styles.dividerLine} />
              <div className={styles.dividerText}>Editorial Suite</div>
              <div className={styles.dividerLine} />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}