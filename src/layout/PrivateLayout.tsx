// src/layouts/PrivateLayout.tsx
import React, { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

type Role = "editorial" | "dictaminador" | "autor";

type User = {
  id: number | string;
  name: string;
  email: string;
  role: Role;
};

type QuickAction =
  | "asignar_dictaminador"
  | "solicitar_correccion"
  | "aprobar"
  | "rechazar"
  | "generar_constancia"
  | "subir_dictamen_firmado";

/** ---------------------------
 *  Helpers (blindaje)
 *  --------------------------*/
function base64UrlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return null;
  }
}

function getJwtPayload(token: string): any | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const json = base64UrlDecode(parts[1]);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string) {
  const payload = getJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp <= nowSec;
}

function isRole(v: any): v is Role {
  return v === "editorial" || v === "dictaminador" || v === "autor";
}

function isValidUser(obj: any): obj is User {
  return (
    obj &&
    (typeof obj.id === "number" || typeof obj.id === "string") &&
    typeof obj.name === "string" &&
    typeof obj.email === "string" &&
    isRole(obj.role)
  );
}

function safeClearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/** ---------------------------
 * Home por rol (MUY IMPORTANTE)
 * --------------------------*/
const defaultHomeByRole: Record<Role, string> = {
  editorial: "/",
  dictaminador: "/dictaminador",
  autor: "/autor",
};

/** ---------------------------
 * ACL por ruta (roles permitidos)
 * --------------------------*/
const routeACL: Array<{ test: (path: string) => boolean; roles: Role[] }> = [
  { test: (p) => p.startsWith("/usuarios"), roles: ["editorial"] },
  { test: (p) => p.startsWith("/constancias"), roles: ["editorial"] },
  { test: (p) => p.startsWith("/dictamenes"), roles: ["editorial"] },
  // ✅ NUEVO: Comunicaciones (envío masivo / correos)
  { test: (p) => p.startsWith("/comunicaciones"), roles: ["editorial"] },

  { test: (p) => p.startsWith("/dictaminador"), roles: ["dictaminador"] },
  { test: (p) => p.startsWith("/autor"), roles: ["autor"] },
  {
    test: (p) =>
      p === "/" ||
      p.startsWith("/convocatorias") ||
      p.startsWith("/libros") ||
      p.startsWith("/capitulos"),
    roles: ["editorial"],
  },
];

function hasAccess(pathname: string, role: Role): boolean {
  const rule = routeACL.find((r) => r.test(pathname));
  if (!rule) return false;
  return rule.roles.includes(role);
}

export default function PrivateLayout({ children }: { children: JSX.Element }) {
  const nav = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  // 1) token y user existen
  if (!token || !userRaw) {
    safeClearAuth();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 2) token válido y no expirado
  if (isTokenExpired(token)) {
    safeClearAuth();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 3) parse + shape check del user
  let user: User | null = null;
  try {
    const parsed = JSON.parse(userRaw);
    if (!isValidUser(parsed)) throw new Error("user shape invalid");
    user = parsed;
  } catch {
    safeClearAuth();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 4) ACL
  if (!hasAccess(location.pathname, user.role)) {
    return <Navigate to={defaultHomeByRole[user.role]} replace />;
  }

  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  const [form, setForm] = useState({
    folio: "",
    tituloCapitulo: "",
    autor: "",
    dictaminador: "",
    estado: "RECIBIDO",
    comentario: "",
  });

  const logout = () => {
    safeClearAuth();
    nav("/login", { replace: true });
  };

  const go = (path: string) => nav(path, { replace: true });
  const isActive = (path: string) => location.pathname === path;
  const isStarts = (prefix: string) => location.pathname.startsWith(prefix);

  const menu = useMemo(() => {
    if (user.role === "editorial") {
      return [
        { label: "Dashboard", path: "/" },
        { label: "Convocatorias", path: "/convocatorias" },
        { label: "Libros", path: "/libros" },
        { label: "Capítulos", path: "/capitulos" },
        { label: "Dictámenes", path: "/dictamenes" },
        { label: "Constancias", path: "/constancias" },
        // ✅ NUEVO: Comunicaciones
        { label: "Comunicaciones", path: "/comunicaciones" },
        { label: "Usuarios", path: "/usuarios" },
      ];
    }

    if (user.role === "dictaminador") {
      return [
        { label: "Mis asignaciones", path: "/dictaminador" },
        { label: "Mi cuenta", path: "/dictaminador?tab=cuenta" },
      ];
    }

    return [
      { label: "Mis envíos", path: "/autor" },
      { label: "Mi cuenta", path: "/autor?tab=cuenta" },
    ];
  }, [user.role]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`(UI) Buscar: ${query}\nLuego se conectará al backend.`);
  };

  const headerTitle =
    user.role === "editorial"
      ? isActive("/")
        ? "Dashboard"
        : isStarts("/convocatorias")
        ? "Convocatorias"
        : isStarts("/libros")
        ? "Libros"
        : isStarts("/capitulos")
        ? "Capítulos"
        : isStarts("/dictamenes")
        ? "Dictámenes"
        : isStarts("/constancias")
        ? "Constancias"
        : isStarts("/usuarios")
        ? "Usuarios"
        : isStarts("/comunicaciones")
        ? "Comunicaciones"
        : "Panel"
      : user.role === "dictaminador"
      ? "Dictaminador"
      : "Autor";

  const headerSubtitle =
    user.role === "editorial"
      ? isStarts("/comunicaciones")
        ? "Envío masivo y automatizado de correos"
        : "Gestión editorial y dictámenes"
      : user.role === "dictaminador"
      ? "Revisión y dictámenes asignados"
      : "Seguimiento y envío de capítulos";

  const avatarLetter = (user?.name?.trim()?.[0] ?? "U").toUpperCase();

  // (opcional) título accesible del panel rápido si lo usas luego para acciones
  const quickPanelTitle =
    selectedAction === "generar_constancia"
      ? "Generar constancia"
      : selectedAction === "subir_dictamen_firmado"
      ? "Subir dictamen firmado"
      : "Panel rápido";

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>E</div>
          <div>
            <div style={styles.brandTitle}>Editorial</div>
            <div style={styles.brandSubtitle}>Panel</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {menu.map((item) => {
            const active = item.path === "/" ? isActive("/") : isStarts(item.path);
            return (
              <button
                key={item.path}
                style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}
                onClick={() => go(item.path)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userBox}>
            <div style={styles.userAvatar}>{avatarLetter}</div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.userName}>{user?.name ?? "Usuario"}</div>
              <div style={styles.userRole}>{user?.role ?? ""}</div>
            </div>
          </div>

          <button style={styles.logoutBtn} onClick={logout} type="button">
            Salir
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>{headerTitle}</h1>
            <p style={styles.headerSubtitle}>{headerSubtitle}</p>
          </div>

          {user.role === "editorial" && (
            <div style={styles.headerRight}>
              <form onSubmit={onSearch} style={styles.searchWrap}>
                <input
                  style={styles.searchInput}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar capítulo, libro, folio..."
                />
                <button type="submit" style={styles.searchBtn}>
                  Buscar
                </button>
              </form>

              <button
                type="button"
                style={styles.panelBtn}
                onClick={() => setPanelOpen((v) => !v)}
                title="Panel rápido"
              >
                {panelOpen ? "Cerrar panel" : "Panel rápido"}
              </button>
            </div>
          )}
        </header>

        <div
          style={{
            ...styles.body,
            gridTemplateColumns: panelOpen ? "minmax(0, 1fr) 360px" : "minmax(0, 1fr)",
          }}
        >
          <section style={styles.content}>{children}</section>

          {/* Panel rápido solo editorial (evita que dictaminador/autor caigan aquí por historial) */}
          {user.role === "editorial" && panelOpen && (
            <>
              <div style={styles.overlay} onClick={() => setPanelOpen(false)} />
              <aside style={styles.rightPanel}>{/* ... tu panel rápido ... */}</aside>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** ✅ Tus styles igual */
const styles: Record<string, React.CSSProperties> = {
  // pega tus styles tal cual
  shell: { minHeight: "100vh", display: "grid", gridTemplateColumns: "260px 1fr", background: "#F6F7F9" },
  sidebar: { background: "#0F3D3E", color: "#fff", padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  brand: { display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.06)" },
  brandIcon: { width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.18)", fontWeight: 900 },
  brandTitle: { fontWeight: 800, lineHeight: 1 },
  brandSubtitle: { fontSize: 12, opacity: 0.8, marginTop: 3 },
  nav: { display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 },
  navItem: { width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 },
  navItemActive: { background: "rgba(255,255,255,0.14)" },
  sidebarFooter: { marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.12)" },
  userBox: { display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.06)" },
  userAvatar: { width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.18)", fontWeight: 900 },
  userName: { fontWeight: 800, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userRole: { fontSize: 12, opacity: 0.8, marginTop: 3 },
  logoutBtn: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", background: "#ffffff", color: "#0F3D3E", fontWeight: 800 },
  main: { display: "flex", flexDirection: "column", minWidth: 0 },
  header: { display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", padding: 18, borderBottom: "1px solid #E7EAF0", background: "#fff" },
  headerLeft: { minWidth: 0 },
  headerTitle: { margin: 0, fontSize: 18, color: "#111827" },
  headerSubtitle: { margin: "4px 0 0 0", fontSize: 13, color: "#6B7280" },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  searchWrap: { display: "flex", gap: 8, width: 420, maxWidth: "55vw" },
  searchInput: { flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14 },
  searchBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 800 },
  panelBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" },
  body: { display: "grid", gap: 14, padding: 18, alignItems: "start" },
  content: { minWidth: 0 },
  overlay: { display: "none" },
  rightPanel: { minWidth: 0, alignSelf: "start", position: "sticky", top: 18, display: "flex", flexDirection: "column", gap: 12 },
};