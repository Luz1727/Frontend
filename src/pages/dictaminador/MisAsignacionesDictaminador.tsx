import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { api } from "../../services/api";

/* =========================
   Tipos (igual funcionalidad)
========================= */
type ChapterStatus =
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "ENVIADO_A_DICTAMINADOR"           // ← NUEVO
  | "EN_REVISION_DICTAMINADOR"          // ← NUEVO
  | "CORRECCIONES_SOLICITADAS_A_AUTOR"  // ← NUEVO
  | "CORRECCIONES"
  | "REENVIADO_POR_AUTOR"
  | "REVISADO_POR_EDITORIAL"            // ← NUEVO
  | "LISTO_PARA_FIRMA"                  // ← NUEVO
  | "FIRMADO"                           // ← NUEVO
  | "EN_REVISION"
  | "APROBADO"
  | "RECHAZADO";

type AssignedChapterApi = {
  id: number;
  title: string;
  status: ChapterStatus;
  updated_at: string;
  file_path?: string | null;
  book_name?: string | null;
  author_name?: string | null;
  author_email?: string | null;
};

type AssignedChapterRow = {
  id: number;
  title: string;
  status: ChapterStatus;
  updated_at: string;
  file_path?: string | null;
  book_name?: string | null;
  author_name?: string | null;
  author_email?: string | null;
};

type Me = {
  id: number;
  name: string;
  email: string;
  role: "editorial" | "dictaminador" | "autor";
};

type Preferences = {
  email_notify_enabled: boolean;
  notify_status_changes: boolean;
  notify_corrections: boolean;
  notify_approved_rejected: boolean;
};

type Privacy = {
  show_name: boolean;
  show_email: boolean;
};

type NavKey = "asignaciones" | "cuenta";

/* =========================
   Error Boundary Component
========================= */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error capturado en MisAsignacionesDictaminador:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: 30,
              borderRadius: 16,
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              margin: 20,
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: 12 }}>Algo salió mal</h3>
            <p style={{ marginBottom: 16, fontSize: 14 }}>{this.state.error?.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              style={{
                padding: "10px 20px",
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reintentar
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/* =========================
   Helpers (igual funcionalidad)
========================= */
function getToken() {
  return localStorage.getItem("token") || "";
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = dateStr.slice(0, 10);
  const [y, m, dd] = d.split("-");
  if (!dd) return dateStr;
  return `${dd}/${m}/${y}`;
}

function statusLabel(s: ChapterStatus) {
  if (s === "RECIBIDO") return "Recibido";
  if (s === "ASIGNADO_A_DICTAMINADOR") return "Asignado";
  if (s === "ENVIADO_A_DICTAMINADOR") return "Enviado a dictaminador";  // ← NUEVO
  if (s === "EN_REVISION_DICTAMINADOR") return "En revisión (dictaminador)";  // ← NUEVO
  if (s === "CORRECCIONES_SOLICITADAS_A_AUTOR") return "Correcciones solicitadas";  // ← NUEVO
  if (s === "CORRECCIONES") return "Correcciones";
  if (s === "REENVIADO_POR_AUTOR") return "Reenviado";
  if (s === "REVISADO_POR_EDITORIAL") return "Revisado por editorial";  // ← NUEVO
  if (s === "LISTO_PARA_FIRMA") return "Listo para firma";  // ← NUEVO
  if (s === "FIRMADO") return "Firmado";  // ← NUEVO
  if (s === "EN_REVISION") return "En revisión";
  if (s === "APROBADO") return "Aprobado";
  return "Rechazado";
}

function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "D";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "D";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function toneByStatus(s: ChapterStatus) {

  // ✅ finales
  if (s === "APROBADO")
    return { bg: "rgba(16,185,129,.14)", bd: "rgba(16,185,129,.35)", tx: "#065F46" };

  if (s === "RECHAZADO")
    return { bg: "rgba(244,63,94,.12)", bd: "rgba(244,63,94,.30)", tx: "#9F1239" };

  if (s === "FIRMADO")
    return { bg: "rgba(16,185,129,.10)", bd: "rgba(16,185,129,.25)", tx: "#065F46" };

  if (s === "LISTO_PARA_FIRMA")
    return { bg: "rgba(14,165,233,.12)", bd: "rgba(14,165,233,.30)", tx: "#075985" };

  // ✅ revisión editorial
  if (s === "REVISADO_POR_EDITORIAL")
    return { bg: "rgba(34,197,94,.12)", bd: "rgba(34,197,94,.30)", tx: "#166534" };

  // ✅ correcciones (nuevo + legacy)
  if (s === "CORRECCIONES_SOLICITADAS_A_AUTOR")
    return { bg: "rgba(245,158,11,.14)", bd: "rgba(245,158,11,.35)", tx: "#92400E" };

  if (s === "CORRECCIONES")
    return { bg: "rgba(245,158,11,.14)", bd: "rgba(245,158,11,.35)", tx: "#92400E" };

  // ✅ revisión dictaminador (nuevo + legacy)
  if (s === "EN_REVISION_DICTAMINADOR")
    return { bg: "rgba(59,130,246,.12)", bd: "rgba(59,130,246,.30)", tx: "#1D4ED8" };

  if (s === "EN_REVISION")
    return { bg: "rgba(59,130,246,.12)", bd: "rgba(59,130,246,.30)", tx: "#1D4ED8" };

  // ✅ envío / asignación
  if (s === "ENVIADO_A_DICTAMINADOR")
    return { bg: "rgba(99,102,241,.12)", bd: "rgba(99,102,241,.30)", tx: "#3730A3" };

  if (s === "ASIGNADO_A_DICTAMINADOR")
    return { bg: "rgba(139,92,246,.14)", bd: "rgba(139,92,246,.30)", tx: "#5B21B6" };

  // ✅ reenviado / recibido
  if (s === "REENVIADO_POR_AUTOR")
    return { bg: "rgba(148,163,184,.18)", bd: "rgba(148,163,184,.35)", tx: "#334155" };

  if (s === "RECIBIDO")
    return { bg: "rgba(148,163,184,.18)", bd: "rgba(148,163,184,.35)", tx: "#334155" };

  // fallback
  return { bg: "rgba(148,163,184,.18)", bd: "rgba(148,163,184,.35)", tx: "#334155" };
}
function btnFxPrimaryProps() {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.filter = "brightness(1.03)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(0px)";
      e.currentTarget.style.filter = "brightness(1)";
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(1px)";
    },
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(0px)";
    },
  };
}

function btnFxSecondaryProps() {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.filter = "brightness(1.02)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(0px)";
      e.currentTarget.style.filter = "brightness(1)";
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(1px)";
    },
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(0px)";
    },
  };
}

/* =========================
   Helpers nuevos (VER/DESCARGAR)
========================= */
function getApiBase(): string {
  const base = (api as any)?.defaults?.baseURL || "";
  return String(base).replace(/\/+$/, "");
}

function joinUrl(base: string, path: string) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return b ? `${b}/${p}` : `/${p}`;
}

function guessExtFromContentType(ct: string) {
  const s = (ct || "").toLowerCase();
  if (s.includes("pdf")) return ".pdf";
  if (s.includes("wordprocessingml.document")) return ".docx";
  if (s.includes("msword")) return ".doc";
  if (s.includes("vnd.openxmlformats-officedocument.spreadsheetml.sheet")) return ".xlsx";
  if (s.includes("vnd.ms-excel")) return ".xls";
  if (s.includes("text/plain")) return ".txt";
  return "";
}

async function fetchBlobWithAuth(url: string, token: string) {
  const u = url.includes("?") ? `${url}&ts=${Date.now()}` : `${url}?ts=${Date.now()}`;

  const resp = await fetch(u, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt || `No se pudo obtener el archivo (${resp.status})`);
  }

  const ct = resp.headers.get("content-type") || "application/octet-stream";
  const blob = await resp.blob();
  return { blob, contentType: ct };
}

function openBlobInNewTab(blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    window.location.href = url;
  }
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);

  requestAnimationFrame(() => {
    a.click();
    setTimeout(() => {
      try {
        a.remove();
      } catch {}
      window.URL.revokeObjectURL(url);
    }, 100);
  });
}

/* =========================
   UI mini componentes
========================= */
function Icon({
  name,
  tone = "muted",
}: {
  name:
    | "grid"
    | "book"
    | "user"
    | "refresh"
    | "logout"
    | "download"
    | "check"
    | "x"
    | "edit"
    | "bell"
    | "shield"
    | "privacy"
    | "search"
    | "eye";
  tone?: "muted" | "light";
}) {
  const color = tone === "light" ? "rgba(255,255,255,0.92)" : "rgba(71,85,105,0.95)";
  const size = 18;
  const common = { width: size, height: size, display: "inline-block" as const };

  switch (name) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v7h-7z" />
          <path d="M4 13h7v7H4z" />
          <path d="M13 13h7v7h-7z" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 7H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M20 21a8 8 0 1 0-16 0" />
          <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        </svg>
      );
    case "refresh":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M21 12a9 9 0 0 1-15.36 6.36" />
          <path d="M3 12a9 9 0 0 1 15.36-6.36" />
          <path d="M21 3v6h-6" />
          <path d="M3 21v-6h6" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "download":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M21 21H3" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    case "privacy":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 1a11 11 0 0 0-11 11v4a7 7 0 0 0 7 7h8a7 7 0 0 0 7-7v-4A11 11 0 0 0 12 1Z" />
          <path d="M12 11v4" />
          <path d="M9 11a3 3 0 0 1 6 0" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M21 21l-4.3-4.3" />
          <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
      );
    case "eye":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
      );
  }
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={sx.stat}>
      <div style={sx.statLabel}>{label}</div>
      <div style={sx.statValue}>{value}</div>
      {sub ? <div style={sx.statSub}>{sub}</div> : null}
    </div>
  );
}

/* =========================
   ChapterItem: botones actualizados
========================= */
const ChapterItem = React.memo(
  ({
    chapter,
    onAction,
    onDownloadLatest,
    onViewLatest,
    loading,
  }: {
    chapter: AssignedChapterRow;
    onAction: (type: "REVISION" | "CORRECCIONES" | "APROBAR" | "RECHAZAR", row: AssignedChapterRow) => void;
    onDownloadLatest: (c: AssignedChapterRow) => Promise<void>;
    onViewLatest: (c: AssignedChapterRow) => Promise<void>;
    loading: boolean;
  }) => {
    const t = toneByStatus(chapter.status);

    return (
      <div style={sx.item}>
        <div style={sx.itemLeft}>
          <div style={sx.itemTop}>
            <div style={sx.itemTitle}>
              {chapter.title}
              {chapter.book_name ? <span style={sx.itemMuted}> • {chapter.book_name}</span> : null}
            </div>

            <span style={{ ...sx.statusChip, background: t.bg, borderColor: t.bd, color: t.tx }}>
              {statusLabel(chapter.status)}
            </span>
          </div>

          <div style={sx.itemMeta}>
            <span style={sx.metaDot} />
            <span>
              {chapter.author_name
                ? `${chapter.author_name}${chapter.author_email ? ` (${chapter.author_email})` : ""}`
                : "Autor: —"}
            </span>
            <span style={sx.metaSep}>•</span>
            <span>Actualizado {fmtDate(chapter.updated_at)}</span>
          </div>
        </div>

        <div style={sx.itemActions}>
          {/* ✅ VER NUEVO ARCHIVO (usa endpoint /view-latest) */}
          <button
            type="button"
            style={sx.btnSoft}
            onClick={() => onViewLatest(chapter)}
            disabled={loading}
            title="Abrir el último archivo (original o corregido)"
            {...btnFxSecondaryProps()}
          >
            <span style={sx.btnInner}>
              <Icon name="eye" /> Ver último
            </span>
          </button>

          {/* ✅ DESCARGAR ÚLTIMO ARCHIVO (usa endpoint /download-latest) */}
          <button
            type="button"
            style={sx.btnSoft}
            onClick={() => onDownloadLatest(chapter)}
            disabled={loading}
            title="Descargar el último archivo (original o corregido)"
            {...btnFxSecondaryProps()}
          >
            <span style={sx.btnInner}>
              <Icon name="download" /> Descargar último
            </span>
          </button>

          <button
            type="button"
            style={sx.btnSoft}
            onClick={() => onAction("REVISION", chapter)}
            disabled={loading}
            title="Marcar como En revisión"
            {...btnFxSecondaryProps()}
          >
            <span style={sx.btnInner}>
              <Icon name="edit" /> Revisar
            </span>
          </button>

          <button
            type="button"
            style={sx.btnSoft}
            onClick={() => onAction("CORRECCIONES", chapter)}
            disabled={loading}
            title="Solicitar correcciones"
            {...btnFxSecondaryProps()}
          >
            <span style={sx.btnInner}>
              <Icon name="edit" /> Correcciones
            </span>
          </button>

          <button
            type="button"
            style={sx.btnPrimary}
            onClick={() => onAction("APROBAR", chapter)}
            disabled={loading}
            title="Aprobar"
            {...btnFxPrimaryProps()}
          >
            <span style={sx.btnInnerLight}>
              <Icon name="check" tone="light" /> Aprobar
            </span>
          </button>

          <button type="button" style={sx.btnDanger} onClick={() => onAction("RECHAZAR", chapter)} disabled={loading} title="Rechazar">
            <span style={sx.btnInner}>
              <Icon name="x" /> Rechazar
            </span>
          </button>
        </div>
      </div>
    );
  }
);

/* =========================
   Componente principal
========================= */
function MisAsignacionesDictaminadorContent() {
  const [nav, setNav] = useState<NavKey>("asignaciones");
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({
    email_notify_enabled: true,
    notify_status_changes: true,
    notify_corrections: true,
    notify_approved_rejected: true,
  });
  const [privacy, setPrivacy] = useState<Privacy>({ show_name: true, show_email: false });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });
  const [openPrefs, setOpenPrefs] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openPwd, setOpenPwd] = useState(false);
  const [rows, setRows] = useState<AssignedChapterRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | ChapterStatus>("ALL");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<"REVISION" | "CORRECCIONES" | "APROBAR" | "RECHAZAR" | null>(null);
  const [selected, setSelected] = useState<AssignedChapterRow | null>(null);
  const [comment, setComment] = useState("");

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${getToken()}` }), []);
  const apiMsg = (err: any, fallback: string) => err?.response?.data?.detail || err?.message || fallback;

  const hardLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }, []);

  const handleAuthMaybe = useCallback(
    (err: any) => {
      const st = err?.response?.status;
      if (st === 401 || st === 403) {
        hardLogout();
        return true;
      }
      return false;
    },
    [hardLogout]
  );

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get<Me>("/account/me", { headers: authHeaders() });
      setMe(data);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      setMe(null);
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadPrefs = useCallback(async () => {
    try {
      const { data } = await api.get<Preferences>("/account/preferences", { headers: authHeaders() });
      setPrefs(data);
    } catch (err: any) {
      handleAuthMaybe(err);
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadPrivacy = useCallback(async () => {
    try {
      const { data } = await api.get<Privacy>("/account/privacy", { headers: authHeaders() });
      setPrivacy(data);
    } catch (err: any) {
      handleAuthMaybe(err);
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadAssignments = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { data } = await api.get<AssignedChapterApi[]>("/dictaminador/chapters", { headers: authHeaders() });

      const mapped: AssignedChapterRow[] = (data ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        updated_at: c.updated_at,
        file_path: c.file_path ?? null,
        book_name: c.book_name ?? null,
        author_name: c.author_name ?? null,
        author_email: c.author_email ?? null,
      }));

      setRows(mapped);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      setErrorMsg(apiMsg(err, "No se pudieron cargar tus asignaciones."));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, handleAuthMaybe]);

  useEffect(() => {
    loadMe();
    loadPrefs();
    loadPrivacy();
    loadAssignments();
  }, [loadMe, loadPrefs, loadPrivacy, loadAssignments]);

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (status !== "ALL" && r.status !== status) return false;
        if (!norm) return true;
        const hay =
          String(r.id).includes(norm) ||
          (r.title || "").toLowerCase().includes(norm) ||
          (r.book_name || "").toLowerCase().includes(norm) ||
          (r.author_name || "").toLowerCase().includes(norm) ||
          (r.author_email || "").toLowerCase().includes(norm);
        return hay;
      })
      .slice()
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  }, [rows, q, status]);

  const stats = useMemo(() => {
  const total = rows.length;
  const pendientes = rows.filter((r) => 
    ["ASIGNADO_A_DICTAMINADOR", "ENVIADO_A_DICTAMINADOR", "EN_REVISION", "EN_REVISION_DICTAMINADOR", "REENVIADO_POR_AUTOR", "REVISADO_POR_EDITORIAL", "LISTO_PARA_FIRMA"].includes(r.status)
  ).length;
  const correcciones = rows.filter((r) => 
    ["CORRECCIONES", "CORRECCIONES_SOLICITADAS_A_AUTOR"].includes(r.status)
  ).length;
  const resueltos = rows.filter((r) => 
    ["APROBADO", "RECHAZADO", "FIRMADO"].includes(r.status)
  ).length;
  return { total, pendientes, correcciones, resueltos };
}, [rows]);

  const patchStatus = async (chapterId: number, newStatus: ChapterStatus, extra?: { comment?: string }) => {
  const payload: any = { status: newStatus };
  if (extra?.comment) payload.comment = extra.comment;

  const { data } = await api.patch(`/dictaminador/chapters/${chapterId}/status`, payload, {
    headers: authHeaders(),
  });

  const updated: AssignedChapterRow = {
    id: data.id ?? chapterId,
    title: data.title ?? selected?.title ?? "",
    status: data.status ?? newStatus,
    updated_at: data.updated_at ?? new Date().toISOString(),
    file_path: data.file_path ?? selected?.file_path ?? null,
    book_name: data.book_name ?? selected?.book_name ?? null,
    author_name: data.author_name ?? selected?.author_name ?? null,
    author_email: data.author_email ?? selected?.author_email ?? null,
  };

  setRows((prev) => prev.map((r) => (r.id === chapterId ? updated : r)));
};

  const openAction = (type: "REVISION" | "CORRECCIONES" | "APROBAR" | "RECHAZAR", row: AssignedChapterRow) => {
    setSelected(row);
    setActionType(type);
    setComment("");
    setActionOpen(true);
  };

  const runAction = async () => {
    if (!selected || !actionType) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      if (actionType === "REVISION") await patchStatus(selected.id, "EN_REVISION");
      if (actionType === "CORRECCIONES") {
        if (!comment.trim()) return alert("Escribe las observaciones / comentario.");
        await patchStatus(selected.id, "CORRECCIONES", { comment: comment.trim() });
      }
      if (actionType === "APROBAR") await patchStatus(selected.id, "APROBADO");
      if (actionType === "RECHAZAR") {
        if (!comment.trim()) return alert("Escribe el motivo de rechazo.");
        await patchStatus(selected.id, "RECHAZADO", { comment: comment.trim() });
      }

      setActionOpen(false);
      await loadAssignments();
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      const msg = apiMsg(err, "No se pudo ejecutar la acción.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ✅ VER ÚLTIMO ARCHIVO (usa endpoint /view-latest)
  ========================= */
  const viewLatestFile = async (c: AssignedChapterRow) => {
  try {
    setLoading(true);
    setErrorMsg(null);

    const res = await api.get(`/dictaminador/chapters/${c.id}/view-latest`, {
      headers: authHeaders(),
      responseType: "blob",
      params: { ts: Date.now() }
    });

    const blob: Blob = res.data instanceof Blob 
      ? res.data 
      : new Blob([JSON.stringify(res.data)], {
          type: res.headers?.["content-type"] || "application/octet-stream",
        });

    // Crear URL del blob
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Intentar abrir en nueva pestaña
    const newWindow = window.open(blobUrl, "_blank");
    
    // Si el popup fue bloqueado, mostrar mensaje al usuario
    if (!newWindow) {
      alert("El navegador bloqueó la ventana emergente. Haz clic en 'Descargar último' para ver el archivo.");
      // Liberar la URL después de un tiempo
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } else {
      // Liberar la URL después de que la pestaña haya cargado
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    }
  } catch (err: any) {
    if (handleAuthMaybe(err)) return;
    const msg = apiMsg(err, "No se pudo abrir el archivo.");
    setErrorMsg(msg);
    alert(msg);
  } finally {
    setLoading(false);
  }
};

  /* =========================
     ✅ DESCARGAR ÚLTIMO ARCHIVO (usa endpoint /download-latest)
  ========================= */
  const downloadLatestFile = async (c: AssignedChapterRow) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await api.get(`/dictaminador/chapters/${c.id}/download-latest`, {
        headers: authHeaders(),
        responseType: "blob",
        params: { ts: Date.now() }
      });

      const blob: Blob = res.data instanceof Blob 
        ? res.data 
        : new Blob([JSON.stringify(res.data)], {
            type: res.headers?.["content-type"] || "application/octet-stream",
          });

      let filename = `capitulo_${c.id}_ultimo`;
      const cd = res.headers?.["content-disposition"] as string | undefined;

      if (cd) {
        const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
        const raw = match?.[1] || match?.[2];
        if (raw) {
          try {
            filename = decodeURIComponent(raw);
          } catch {
            filename = raw;
          }
        }
      }

      if (!/\.[a-z0-9]+$/i.test(filename)) {
        const ct = (res.headers?.["content-type"] || "").toLowerCase();
        const ext = guessExtFromContentType(ct);
        if (ext) filename += ext;
      }

      downloadBlob(blob, filename);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      const msg = apiMsg(err, "No se pudo descargar el archivo.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.patch<Preferences>("/account/preferences", prefs, { headers: authHeaders() });
      setPrefs(data);
      setOpenPrefs(false);
      alert("Preferencias guardadas ✅");
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      const msg = apiMsg(err, "No se pudieron guardar notificaciones.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const savePrivacy = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.patch<Privacy>("/account/privacy", privacy, { headers: authHeaders() });
      setPrivacy(data);
      setOpenPrivacy(false);
      alert("Privacidad guardada ✅");
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      const msg = apiMsg(err, "No se pudo guardar privacidad.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.current_password || !pwd.new_password) return alert("Completa ambos campos.");
    if (pwd.new_password.length < 8) return alert("La nueva contraseña debe tener mínimo 8 caracteres.");

    try {
      setLoading(true);
      setErrorMsg(null);
      await api.post("/account/change-password", pwd, { headers: authHeaders() });
      setPwd({ current_password: "", new_password: "" });
      setOpenPwd(false);
      alert("Contraseña actualizada ✅");
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      const msg = apiMsg(err, "No se pudo cambiar la contraseña.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (!me && loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Cargando información del usuario...</div>
      </div>
    );
  }

  const pageTitle = nav === "asignaciones" ? "Asignaciones" : "Mi Cuenta";
  const pageSub =
    nav === "asignaciones"
      ? "Revisa capítulos, descarga archivos y registra dictámenes con trazabilidad."
      : "Administra tu perfil, seguridad y preferencias del sistema.";

  return (
    <div key={`main-${nav}`} style={sx.shell}>
      {/* Sidebar */}
      <aside style={sx.side}>
        <div style={sx.sideTop}>
          <div style={sx.brandMark}>
            <Icon name="grid" tone="light" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={sx.brandName}>Editorial Interpec</div>
            <div style={sx.brandRole}>Panel de Dictaminador</div>
          </div>
        </div>

        <div style={sx.userCard}>
          <div style={sx.userAvatar}>{initials(me?.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={sx.userName}>{me?.name || "Dictaminador"}</div>
            <div style={sx.userEmail}>{me?.email || "Sesión activa"}</div>
          </div>
        </div>

        <div style={sx.sideNav}>
          <button
            type="button"
            onClick={() => setNav("asignaciones")}
            style={{ ...sx.navBtn, ...(nav === "asignaciones" ? sx.navBtnActive : {}) }}
          >
            <span style={sx.navIcon}>
              <Icon name="book" tone="light" />
            </span>
            <span>Asignaciones</span>
            {nav === "asignaciones" ? <span style={sx.navGlow} /> : null}
          </button>

          <button type="button" onClick={() => setNav("cuenta")} style={{ ...sx.navBtn, ...(nav === "cuenta" ? sx.navBtnActive : {}) }}>
            <span style={sx.navIcon}>
              <Icon name="user" tone="light" />
            </span>
            <span>Mi Cuenta</span>
            {nav === "cuenta" ? <span style={sx.navGlow} /> : null}
          </button>
        </div>

        <div style={sx.sideBottom}>
          <button type="button" style={sx.sideLogout} onClick={logout}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="logout" tone="light" /> Cerrar sesión
            </span>
          </button>
          <div style={sx.sideFoot}>© {new Date().getFullYear()} Editorial Interpec</div>
        </div>
      </aside>

      {/* Main */}
      <main style={sx.main}>
        {/* Topbar */}
        <div style={sx.topbar}>
          <div style={{ minWidth: 0 }}>
            <div style={sx.topTitle}>{pageTitle}</div>
            <div style={sx.topSub}>{pageSub}</div>
          </div>

          <div style={sx.topActions}>
            {nav === "asignaciones" ? (
              <button type="button" style={sx.btnGhost} onClick={loadAssignments} disabled={loading} {...btnFxSecondaryProps()}>
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Icon name="refresh" /> Actualizar
                </span>
              </button>
            ) : (
              <button
                type="button"
                style={sx.btnGhost}
                onClick={() => {
                  loadMe();
                  loadPrefs();
                  loadPrivacy();
                }}
                disabled={loading}
                {...btnFxSecondaryProps()}
              >
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Icon name="refresh" /> Actualizar datos
                </span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && <div style={sx.alertErr}>{errorMsg}</div>}

        {nav === "asignaciones" && (
          <div style={sx.hero}>
            <div style={sx.heroCard}>
              <div style={sx.heroKicker}>Panel de dictámenes</div>
              <div style={sx.heroTitle}>Control claro y rápido del flujo editorial</div>
              <div style={sx.heroText}>
                Descarga, revisa, solicita correcciones y emite dictamen. Mantén observaciones concretas para acelerar el ciclo.
              </div>

              <div style={sx.heroPills}>
                <span style={sx.heroPill}>
                  Sesión: <b style={{ color: "rgba(15,23,42,.9)" }}>{me?.email || "—"}</b>
                </span>
                <span style={sx.heroPill}>Tip: escribe observaciones por puntos.</span>
              </div>
            </div>

            <div style={sx.heroStats}>
              <Stat label="Total" value={stats.total} sub="Asignaciones" />
              <Stat label="Pendientes" value={stats.pendientes} sub="Por revisar" />
              <Stat label="Correcciones" value={stats.correcciones} sub="En espera" />
              <Stat label="Resueltos" value={stats.resueltos} sub="Aprobado / Rechazado" />
            </div>
          </div>
        )}

        {nav === "cuenta" ? (
          <div style={sx.grid2}>
            {/* Perfil */}
            <section style={sx.card}>
              <div style={sx.cardHead}>
                <div style={sx.cardTitle}>Perfil</div>
                <div style={sx.cardHint}>Información básica de tu cuenta</div>
              </div>

              <div style={sx.kv}>
                <div style={sx.kvRow}>
                  <div style={sx.kvKey}>Nombre</div>
                  <div style={sx.kvVal}>{me?.name || "—"}</div>
                </div>
                <div style={sx.kvRow}>
                  <div style={sx.kvKey}>Correo</div>
                  <div style={sx.kvVal}>{me?.email || "—"}</div>
                </div>
                <div style={sx.kvRow}>
                  <div style={sx.kvKey}>Rol</div>
                  <div style={sx.kvVal}>
                    <span style={sx.roleChip}>{me?.role || "dictaminador"}</span>
                  </div>
                </div>
              </div>

              <div style={sx.sep} />

              <div style={sx.note}>
                Las notificaciones se envían al correo con el que te registró la editorial: <b>{me?.email || "—"}</b>
              </div>
            </section>

            {/* Seguridad */}
            <section style={sx.card}>
              <div style={sx.cardHead}>
                <div style={sx.cardTitle}>Seguridad</div>
                <div style={sx.cardHint}>Contraseña y acceso</div>
              </div>

              <div style={sx.actionList}>
                <div style={sx.actionRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={sx.actionTitle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="shield" /> Cambiar contraseña
                      </span>
                    </div>
                    <div style={sx.actionSub}>Actualiza tu contraseña para mantener tu cuenta segura.</div>
                  </div>
                  <button
                    type="button"
                    style={sx.btnGhost}
                    onClick={() => {
                      setPwd({ current_password: "", new_password: "" });
                      setOpenPwd(true);
                    }}
                    disabled={loading}
                    {...btnFxSecondaryProps()}
                  >
                    Cambiar
                  </button>
                </div>

                <div style={sx.actionRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={sx.actionTitle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="logout" /> Sesión
                      </span>
                    </div>
                    <div style={sx.actionSub}>Cierra sesión en este dispositivo si ya terminaste.</div>
                  </div>
                  <button type="button" style={sx.btnDangerSoft} onClick={logout}>
                    Cerrar
                  </button>
                </div>
              </div>
            </section>

            {/* Preferencias */}
            <section style={sx.card}>
              <div style={sx.cardHead}>
                <div style={sx.cardTitle}>Preferencias</div>
                <div style={sx.cardHint}>Ajustes del panel</div>
              </div>

              <div style={sx.prefRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={sx.actionTitle}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="bell" /> Notificaciones por correo
                    </span>
                  </div>
                  <div style={sx.actionSub}>Avisos cuando cambie el estado o se registren correcciones/decisiones.</div>
                </div>
                <button type="button" style={sx.btnGhost} onClick={() => setOpenPrefs(true)} disabled={loading} {...btnFxSecondaryProps()}>
                  Configurar
                </button>
              </div>

              <div style={sx.prefRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={sx.actionTitle}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="privacy" /> Privacidad
                    </span>
                  </div>
                  <div style={sx.actionSub}>Controla qué datos se muestran en tu perfil.</div>
                </div>
                <button type="button" style={sx.btnGhost} onClick={() => setOpenPrivacy(true)} disabled={loading} {...btnFxSecondaryProps()}>
                  Ajustar
                </button>
              </div>
            </section>

            {/* Soporte */}
            <section style={sx.card}>
              <div style={sx.cardHead}>
                <div style={sx.cardTitle}>Soporte</div>
                <div style={sx.cardHint}>¿Necesitas ayuda?</div>
              </div>

              <div style={sx.note}>
                Si tienes problemas con una asignación, contacta al área editorial. Revisa “Asignaciones” para ver el estado.
              </div>

              <div style={{ padding: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={sx.btnGhost} onClick={() => setNav("asignaciones")} {...btnFxSecondaryProps()}>
                  Ir a Asignaciones
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div style={sx.gridMain}>
            {/* Lista */}
            <section style={sx.card}>
              <div style={sx.cardHeadRow}>
                <div>
                  <div style={sx.cardTitle}>Mis asignaciones</div>
                  <div style={sx.cardHint}>{loading ? "Cargando..." : `${rows.length} capítulo(s)`}</div>
                </div>

                <div style={sx.searchWrap}>
                  <div style={sx.searchBox}>
                    <span style={sx.searchIcon}>
                      <Icon name="search" />
                    </span>
                    <input style={sx.searchInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (título, autor, libro...)" />
                  </div>
                </div>
              </div>

              <div style={sx.filtersBar}>
                <div style={sx.filterBlock}>
                  <div style={sx.filterLabel}>Filtrar por estado</div>
                  <select style={sx.select} value={status} onChange={(e) => setStatus(e.target.value as any)}>
  <option value="ALL">Todos</option>
  <option value="ASIGNADO_A_DICTAMINADOR">Asignado</option>
  <option value="ENVIADO_A_DICTAMINADOR">Enviado a dictaminador</option>  {/* ← NUEVO */}
  <option value="EN_REVISION_DICTAMINADOR">En revisión (dictaminador)</option>  {/* ← NUEVO */}
  <option value="EN_REVISION">En revisión</option>
  <option value="CORRECCIONES_SOLICITADAS_A_AUTOR">Correcciones solicitadas</option>  {/* ← NUEVO */}
  <option value="CORRECCIONES">Correcciones</option>
  <option value="REENVIADO_POR_AUTOR">Reenviado</option>
  <option value="REVISADO_POR_EDITORIAL">Revisado por editorial</option>  {/* ← NUEVO */}
  <option value="LISTO_PARA_FIRMA">Listo para firma</option>  {/* ← NUEVO */}
  <option value="FIRMADO">Firmado</option>  {/* ← NUEVO */}
  <option value="APROBADO">Aprobado</option>
  <option value="RECHAZADO">Rechazado</option>
</select>
                </div>

                <div style={sx.quickBadges}>
  <span style={{ ...sx.badge, ...badgeTone("ASIGNADO_A_DICTAMINADOR") }}>Pendientes: {stats.pendientes}</span>
  <span style={{ ...sx.badge, ...badgeTone("CORRECCIONES_SOLICITADAS_A_AUTOR") }}>Correcciones: {stats.correcciones}</span>  {/* ← NUEVO */}
  <span style={{ ...sx.badge, ...badgeTone("APROBADO") }}>Resueltos: {stats.resueltos}</span>
</div>
              </div>

              <div style={sx.list}>
                {!loading && filtered.length === 0 ? (
                  <div style={sx.empty}>No hay asignaciones con ese filtro.</div>
                ) : (
                  filtered.map((r) => (
                    <ChapterItem
                      key={`chapter-${r.id}-${r.updated_at}`}
                      chapter={r}
                      onAction={openAction}
                      onDownloadLatest={downloadLatestFile}
                      onViewLatest={viewLatestFile}
                      loading={loading}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Guía */}
            <section style={sx.card}>
              <div style={sx.cardHead}>
                <div style={sx.cardTitle}>Guía rápida</div>
                <div style={sx.cardHint}>Flujo sugerido</div>
              </div>

              <div style={sx.note}>
                1) Abre <b>Ver último</b> para ver el archivo más reciente (original o corregido).
                <br />
                2) Descarga con <b>Descargar último</b>.
                <br />
                3) Marca <b>En revisión</b> o solicita <b>Correcciones</b>.
                <br />
                4) Cuando el autor reenvíe, vuelve a <b>Ver último</b> y decide: <b>Aprobar</b> o <b>Rechazar</b>.
              </div>

              <div style={sx.sep} />

              <div style={sx.note}>
                ¿No te aparece nada? Revisa que el backend devuelva asignaciones en <code>/dictaminador/chapters</code> para el dictaminador logueado.
              </div>
            </section>
          </div>
        )}

        {/* Modal acción */}
        {actionOpen && selected && actionType && (
          <div style={sx.overlay} onClick={() => setActionOpen(false)}>
            <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
              <div style={sx.modalTitle}>
                {actionType === "REVISION"
                  ? "Marcar En revisión"
                  : actionType === "CORRECCIONES"
                  ? "Solicitar correcciones"
                  : actionType === "APROBAR"
                  ? "Aprobar capítulo"
                  : "Rechazar capítulo"}
              </div>

              <div style={sx.modalHint}>
                Capítulo: <b>{selected.title}</b> • Estado actual: <b>{statusLabel(selected.status)}</b>
              </div>

              {(actionType === "CORRECCIONES" || actionType === "RECHAZAR") && (
                <>
                  <label style={sx.modalLabel}>{actionType === "CORRECCIONES" ? "Observaciones / comentario" : "Motivo de rechazo"}</label>
                  <textarea
                    style={{ ...sx.modalInput, minHeight: 120, resize: "vertical" as const }}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      actionType === "CORRECCIONES"
                        ? "• Ajustar formato\n• Revisar coherencia...\n• Corregir referencias..."
                        : "• No cumple criterios\n• Falta metodología..."
                    }
                  />
                </>
              )}

              <div style={sx.modalActions}>
                <button style={sx.btnGhost} type="button" onClick={() => setActionOpen(false)} {...btnFxSecondaryProps()}>
                  Cancelar
                </button>
                <button style={sx.btnPrimary} type="button" onClick={runAction} disabled={loading} {...btnFxPrimaryProps()}>
                  {loading ? "Procesando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal preferencias */}
        {openPrefs && (
          <div style={sx.overlay} onClick={() => setOpenPrefs(false)}>
            <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
              <div style={sx.modalTitle}>Notificaciones por correo</div>
              <div style={sx.modalHint}>
                Se enviarán al correo: <b>{me?.email || "—"}</b>
              </div>

              <label style={sx.checkRow}>
                <input type="checkbox" checked={prefs.email_notify_enabled} onChange={(e) => setPrefs((s) => ({ ...s, email_notify_enabled: e.target.checked }))} />
                <span>
                  <b>Activar notificaciones</b>
                  <div style={sx.checkSub}>Recibir avisos oficiales del proceso editorial.</div>
                </span>
              </label>

              <div style={{ height: 10 }} />

              <label style={sx.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_status_changes}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_status_changes: e.target.checked }))}
                />
                <span>Cuando cambie el estado del capítulo</span>
              </label>

              <label style={sx.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_corrections}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_corrections: e.target.checked }))}
                />
                <span>Cuando solicite correcciones</span>
              </label>

              <label style={sx.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_approved_rejected}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_approved_rejected: e.target.checked }))}
                />
                <span>Cuando apruebe o rechace</span>
              </label>

              <div style={sx.modalActions}>
                <button style={sx.btnGhost} type="button" onClick={() => setOpenPrefs(false)} {...btnFxSecondaryProps()}>
                  Cancelar
                </button>
                <button style={sx.btnPrimary} type="button" onClick={savePrefs} disabled={loading} {...btnFxPrimaryProps()}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal privacidad */}
        {openPrivacy && (
          <div style={sx.overlay} onClick={() => setOpenPrivacy(false)}>
            <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
              <div style={sx.modalTitle}>Privacidad</div>
              <div style={sx.modalHint}>Controla lo que se muestra en tu perfil dentro del sistema.</div>

              <label style={sx.checkRow}>
                <input type="checkbox" checked={privacy.show_name} onChange={(e) => setPrivacy((s) => ({ ...s, show_name: e.target.checked }))} />
                <span>Mostrar mi nombre</span>
              </label>

              <label style={sx.checkRow}>
                <input type="checkbox" checked={privacy.show_email} onChange={(e) => setPrivacy((s) => ({ ...s, show_email: e.target.checked }))} />
                <span>Mostrar mi correo</span>
              </label>

              <div style={sx.modalActions}>
                <button style={sx.btnGhost} type="button" onClick={() => setOpenPrivacy(false)} {...btnFxSecondaryProps()}>
                  Cancelar
                </button>
                <button style={sx.btnPrimary} type="button" onClick={savePrivacy} disabled={loading} {...btnFxPrimaryProps()}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal contraseña */}
        {openPwd && (
          <div style={sx.overlay} onClick={() => setOpenPwd(false)}>
            <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
              <div style={sx.modalTitle}>Cambiar contraseña</div>
              <div style={sx.modalHint}>Tu contraseña debe tener al menos 8 caracteres.</div>

              <label style={sx.modalLabel}>Contraseña actual</label>
              <input style={sx.modalInput} type="password" value={pwd.current_password} onChange={(e) => setPwd((s) => ({ ...s, current_password: e.target.value }))} />

              <label style={sx.modalLabel}>Nueva contraseña</label>
              <input style={sx.modalInput} type="password" value={pwd.new_password} onChange={(e) => setPwd((s) => ({ ...s, new_password: e.target.value }))} />

              <div style={sx.modalActions}>
                <button style={sx.btnGhost} type="button" onClick={() => setOpenPwd(false)} {...btnFxSecondaryProps()}>
                  Cancelar
                </button>
                <button style={sx.btnPrimary} type="button" onClick={changePassword} disabled={loading} {...btnFxPrimaryProps()}>
                  {loading ? "Actualizando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Componente principal envuelto en ErrorBoundary
export default function MisAsignacionesDictaminador() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Cargando módulo...</div>}>
        <MisAsignacionesDictaminadorContent />
      </Suspense>
    </ErrorBoundary>
  );
}

/* =========================
   Styles
========================= */
function badgeTone(s: ChapterStatus) {
  const t = toneByStatus(s);
  return { background: t.bg, borderColor: t.bd, color: t.tx };
}

const sx: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: 16,
    padding: 16,
    background:
      "radial-gradient(1200px 600px at 15% 0%, rgba(99,102,241,.10), rgba(255,255,255,0) 55%), radial-gradient(900px 520px at 100% 20%, rgba(16,185,129,.08), rgba(255,255,255,0) 55%), #F8FAFC",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
    color: "#0F172A",
  },

  side: {
    position: "sticky",
    top: 16,
    alignSelf: "start",
    height: "calc(100vh - 32px)",
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid rgba(15,23,42,.10)",
    background: "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.96) 65%, rgba(2,6,23,0.98) 100%)",
    boxShadow: "0 20px 70px rgba(2,6,23,.22)",
  },

  sideTop: { display: "flex", alignItems: "center", gap: 12, padding: "6px 6px 12px 6px" },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, rgba(99,102,241,.35), rgba(16,185,129,.25))",
    border: "1px solid rgba(255,255,255,.14)",
    boxShadow: "0 14px 40px rgba(0,0,0,.25)",
  },
  brandName: { fontSize: 14, fontWeight: 1000, letterSpacing: 0.2, color: "rgba(255,255,255,.96)" },
  brandRole: { fontSize: 12, color: "rgba(255,255,255,.70)", marginTop: 2 },

  userCard: {
    marginTop: 6,
    padding: 12,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid rgba(255,255,255,.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
    color: "rgba(255,255,255,.95)",
    background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,.45), rgba(16,185,129,.20))",
    border: "1px solid rgba(255,255,255,.12)",
  },
  userName: {
    fontSize: 13,
    fontWeight: 1000,
    color: "rgba(255,255,255,.94)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,.70)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginTop: 2,
  },

  sideNav: { marginTop: 14, display: "flex", flexDirection: "column", gap: 10 },
  navBtn: {
    position: "relative",
    width: "100%",
    borderRadius: 16,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.90)",
    cursor: "pointer",
    fontWeight: 950,
    display: "flex",
    gap: 10,
    alignItems: "center",
    textAlign: "left",
    transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease",
  },
  navBtnActive: {
    background: "linear-gradient(180deg, rgba(99,102,241,.22), rgba(16,185,129,.12))",
    border: "1px solid rgba(99,102,241,.28)",
    transform: "translateY(-1px)",
    boxShadow: "0 18px 48px rgba(0,0,0,.25)",
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
  },
  navGlow: {
    position: "absolute",
    right: -40,
    top: "50%",
    transform: "translateY(-50%)",
    width: 120,
    height: 120,
    background: "radial-gradient(circle, rgba(99,102,241,.28), rgba(16,185,129,.00) 70%)",
    filter: "blur(10px)",
    pointerEvents: "none",
  },

  sideBottom: { marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 },
  sideLogout: {
    width: "100%",
    borderRadius: 16,
    padding: "12px 12px",
    cursor: "pointer",
    fontWeight: 1000,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    transition: "transform 120ms ease, background 120ms ease",
  },
  sideFoot: { fontSize: 12, color: "rgba(255,255,255,.60)", paddingLeft: 4 },

  main: {
    borderRadius: 20,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.78)",
    boxShadow: "0 18px 60px rgba(2,6,23,.10)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(10px)",
  },

  topbar: {
    padding: 16,
    borderBottom: "1px solid rgba(15,23,42,.10)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-end",
    background: "linear-gradient(180deg, rgba(255,255,255,.92) 0%, rgba(248,250,252,.86) 100%)",
  },
  topTitle: { fontSize: 20, fontWeight: 1000, letterSpacing: -0.2 },
  topSub: { marginTop: 4, fontSize: 13, color: "rgba(15,23,42,.65)", maxWidth: 820 },
  topActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  alertErr: {
    margin: 16,
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(244,63,94,.25)",
    background: "rgba(244,63,94,.08)",
    color: "#9F1239",
    fontSize: 13,
    fontWeight: 900,
  },

  hero: { padding: 16, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, alignItems: "stretch" },
  heroCard: {
    borderRadius: 18,
    border: "1px solid rgba(15,23,42,.10)",
    background:
      "radial-gradient(900px 260px at 0% 0%, rgba(99,102,241,.18), rgba(255,255,255,0) 55%), radial-gradient(800px 280px at 90% 10%, rgba(16,185,129,.12), rgba(255,255,255,0) 55%), rgba(255,255,255,.85)",
    padding: 16,
    boxShadow: "0 14px 42px rgba(2,6,23,.08)",
  },
  heroKicker: { fontSize: 12, fontWeight: 1000, color: "rgba(15,23,42,.55)", textTransform: "uppercase", letterSpacing: 0.9 },
  heroTitle: { marginTop: 6, fontSize: 16, fontWeight: 1000, letterSpacing: -0.2 },
  heroText: { marginTop: 6, fontSize: 13, color: "rgba(15,23,42,.66)", lineHeight: 1.5 },

  heroPills: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" },
  heroPill: {
    fontSize: 12,
    color: "rgba(15,23,42,.65)",
    background: "rgba(255,255,255,.65)",
    border: "1px solid rgba(15,23,42,.10)",
    padding: "6px 10px",
    borderRadius: 999,
  },

  heroStats: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  stat: {
    borderRadius: 18,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.88)",
    padding: 14,
    boxShadow: "0 12px 36px rgba(2,6,23,.06)",
  },
  statLabel: { fontSize: 12, fontWeight: 1000, color: "rgba(15,23,42,.55)" },
  statValue: { marginTop: 8, fontSize: 22, fontWeight: 1000, letterSpacing: -0.3 },
  statSub: { marginTop: 6, fontSize: 12, color: "rgba(15,23,42,.55)" },

  gridMain: { padding: 16, display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 14, alignItems: "start" },
  grid2: { padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.88)",
    boxShadow: "0 14px 42px rgba(2,6,23,.06)",
    overflow: "hidden",
  },
  cardHead: { padding: 14, borderBottom: "1px solid rgba(15,23,42,.08)", background: "rgba(248,250,252,.80)" },
  cardHeadRow: {
    padding: 14,
    borderBottom: "1px solid rgba(15,23,42,.08)",
    background: "rgba(248,250,252,.80)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: { fontWeight: 1000 },
  cardHint: { marginTop: 4, fontSize: 12, color: "rgba(15,23,42,.55)" },

  searchWrap: { flex: "0 0 320px", display: "flex", justifyContent: "flex-end" },
  searchBox: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.12)",
    background: "rgba(255,255,255,.92)",
    padding: "10px 12px",
  },
  searchIcon: { display: "grid", placeItems: "center", opacity: 0.8 },
  searchInput: { border: 0, outline: "none", width: "100%", fontSize: 13, background: "transparent" },

  filtersBar: { padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid rgba(15,23,42,.06)" },
  filterBlock: { display: "flex", flexDirection: "column", gap: 6, flex: "1 1 260px" },
  filterLabel: { fontSize: 12, fontWeight: 1000, color: "rgba(15,23,42,.65)" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(15,23,42,.12)", outline: "none", fontSize: 13, background: "rgba(255,255,255,.92)" },
  quickBadges: { display: "flex", gap: 10, flexWrap: "wrap" },
  badge: { fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(15,23,42,.12)", fontWeight: 1000, whiteSpace: "nowrap" },

  list: { padding: 12, display: "flex", flexDirection: "column", gap: 10 },
  empty: { padding: 14, color: "rgba(15,23,42,.55)", fontSize: 13 },

  item: {
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.92)",
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  itemLeft: { minWidth: 0, flex: 1 },
  itemTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  itemTitle: { fontSize: 14, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  itemMuted: { fontWeight: 900, color: "rgba(15,23,42,.50)" },
  itemMeta: { marginTop: 6, fontSize: 12, color: "rgba(15,23,42,.55)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  metaDot: { width: 6, height: 6, borderRadius: 999, background: "rgba(99,102,241,.55)" },
  metaSep: { opacity: 0.65 },

  statusChip: { fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(15,23,42,.12)", fontWeight: 1000, whiteSpace: "nowrap" },

  itemActions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },

  btnInner: { display: "inline-flex", alignItems: "center", gap: 10 },
  btnInnerLight: { display: "inline-flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.95)" },

  btnGhost: { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(15,23,42,.12)", background: "rgba(255,255,255,.92)", cursor: "pointer", fontWeight: 1000, transition: "transform 120ms ease, filter 120ms ease" },
  btnSoft: { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(15,23,42,.10)", background: "rgba(248,250,252,.95)", cursor: "pointer", fontWeight: 1000, transition: "transform 120ms ease, filter 120ms ease" },
  btnPrimary: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(99,102,241,.28)",
    background: "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(16,185,129,1) 140%)",
    color: "rgba(255,255,255,.95)",
    cursor: "pointer",
    fontWeight: 1000,
    boxShadow: "0 16px 44px rgba(99,102,241,.18)",
    transition: "transform 120ms ease, filter 120ms ease",
  },
  btnDanger: { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(244,63,94,.26)", background: "rgba(244,63,94,.10)", color: "#9F1239", cursor: "pointer", fontWeight: 1000 },
  btnDangerSoft: { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(244,63,94,.26)", background: "rgba(244,63,94,.10)", color: "#9F1239", cursor: "pointer", fontWeight: 1000 },

  kv: { padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  kvRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  kvKey: { fontSize: 12, fontWeight: 1000, color: "rgba(15,23,42,.55)" },
  kvVal: { fontSize: 13, fontWeight: 1000, textAlign: "right" },

  roleChip: { fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(99,102,241,.22)", background: "rgba(99,102,241,.12)", color: "#3730A3", fontWeight: 1000, textTransform: "capitalize" },

  sep: { height: 1, background: "rgba(15,23,42,.08)", margin: "0 14px" },
  note: { padding: 14, fontSize: 13, color: "rgba(15,23,42,.66)", lineHeight: 1.55 },

  actionList: { padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  actionRow: { borderRadius: 16, border: "1px solid rgba(15,23,42,.10)", background: "rgba(255,255,255,.92)", padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  actionTitle: { fontWeight: 1000 },
  actionSub: { marginTop: 4, fontSize: 12, color: "rgba(15,23,42,.55)", maxWidth: 520 },

  prefRow: { padding: 14, borderTop: "1px solid rgba(15,23,42,.08)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },

  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,.55)", display: "grid", placeItems: "center", padding: 16, zIndex: 999 },
  modal: { width: "100%", maxWidth: 580, borderRadius: 18, border: "1px solid rgba(15,23,42,.12)", background: "rgba(255,255,255,.96)", boxShadow: "0 26px 80px rgba(2,6,23,.35)", padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: 1000, marginBottom: 10 },
  modalHint: { fontSize: 12, color: "rgba(15,23,42,.60)", marginBottom: 8 },
  modalLabel: { fontSize: 12, fontWeight: 1000, color: "rgba(15,23,42,.78)", marginTop: 10, display: "block" },
  modalInput: { width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(15,23,42,.12)", outline: "none", fontSize: 14, marginTop: 6, background: "rgba(255,255,255,.98)" },
  modalActions: { marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 },

  checkRow: { display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", fontSize: 13, color: "#0F172A" },
  checkSub: { marginTop: 4, fontSize: 12, color: "rgba(15,23,42,.55)" },
};