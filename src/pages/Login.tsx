// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

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

// ✅ Ajusta estas rutas a tus rutas reales:
const HOME_BY_ROLE: Record<User["role"], string> = {
  editorial: "/",              // admin dashboard (usa PrivateLayout)
  dictaminador: "/dictaminador/Dictaminador", // luego lo haremos
  autor: "/autor/mis-envios",    // MisEnviosAutor.tsx
};

// ✅ Para validar que "from" sea una ruta permitida por rol
function isAllowedFrom(role: User["role"], from: string) {
  if (!from) return false;

  // evita loops o cosas raras
  if (from === "/login") return false;

  // Ajusta prefijos según tu app
  if (role === "editorial") {
    // tu admin vive en "/..." con PrivateLayout
    // (si luego lo mueves a /admin, cambia esto)
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

      // ✅ Regresar a "from" solo si corresponde a tu rol
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
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>E</div>
          <div>
            <h1 style={styles.title}>Editorial</h1>
            <p style={styles.subtitle}>Inicia sesión para continuar</p>
          </div>
        </div>

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Correo</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@editorial.mx"
              autoComplete="email"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
              autoComplete="current-password"
              required
            />
          </div>

          {errorMsg && <div style={styles.error}>{errorMsg}</div>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div style={styles.footer}>
            <span style={styles.footerText}>© {new Date().getFullYear()} Editorial</span>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "linear-gradient(135deg, #F6F7F9, #EEF2F6)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: { display: "flex", gap: 12, alignItems: "center", marginBottom: 16 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18,
    background: "#0F3D3E",
    color: "#fff",
  },
  title: { margin: 0, fontSize: 20, lineHeight: 1.2, color: "#111827" },
  subtitle: { margin: "4px 0 0 0", fontSize: 13, color: "#6B7280" },
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 10 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, color: "#374151", fontWeight: 600 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    outline: "none",
    fontSize: 14,
  },
  error: {
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#991B1B",
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
  },
  button: {
    marginTop: 6,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#0F3D3E",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
    opacity: 1,
  },
  footer: { marginTop: 10, display: "flex", justifyContent: "center" },
  footerText: { fontSize: 12, color: "#9CA3AF" },
};
