// src/pages/autor/MisEnviosAutor.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import brandLogo from "../../assets/brand-logo.jpeg";

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

type Chapter = {
  id: number;
  title: string;
  status: ChapterStatus;
  updated_at: string;
  file_path?: string | null;
};

type Book = {
  id: number;
  name: string;
  year: number;
  created_at: string;
  chapters?: Chapter[];
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

type DictamenStatus = "BORRADOR" | "GENERADO" | "FIRMADO";
type DictamenDecision = "APROBADO" | "CORRECCIONES" | "RECHAZADO";
type DictamenTipo = "INVESTIGACION" | "DOCENCIA";

type Dictamen = {
  id: number;
  folio: string;
  chapter_id: number;
  evaluador_id: number;
  tipo: DictamenTipo;
  decision: DictamenDecision;
  status: DictamenStatus;
  promedio?: string | number | null;
  comentarios?: string | null;
  conflicto_interes?: string | null;
  pdf_path?: string | null;
  signed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type NavKey = "envios" | "cuenta";

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

function pillTone(s: ChapterStatus): React.CSSProperties {
  if (s === "APROBADO")
    return {
      background: "rgba(16,185,129,0.12)",
      color: "#0A7A35",
      borderColor: "rgba(16,185,129,0.22)",
    };
  if (s === "CORRECCIONES" || s === "CORRECCIONES_SOLICITADAS_A_AUTOR")  // ← NUEVO
    return {
      background: "rgba(208,176,122,0.18)",
      color: "#6B4E1E",
      borderColor: "rgba(208,176,122,0.35)",
    };
  if (s === "EN_REVISION" || s === "EN_REVISION_DICTAMINADOR")  // ← NUEVO
    return {
      background: "rgba(59,130,246,0.10)",
      color: "#1447B2",
      borderColor: "rgba(59,130,246,0.20)",
    };
  if (s === "RECHAZADO")
    return {
      background: "rgba(239,68,68,0.10)",
      color: "#B42318",
      borderColor: "rgba(239,68,68,0.22)",
    };
  if (s === "REENVIADO_POR_AUTOR" || s === "ENVIADO_A_DICTAMINADOR" || s === "LISTO_PARA_FIRMA" || s === "FIRMADO")  // ← NUEVOS
    return {
      background: "rgba(148,163,184,0.14)",
      color: "#334155",
      borderColor: "rgba(148,163,184,0.26)",
    };
  if (s === "ASIGNADO_A_DICTAMINADOR" || s === "REVISADO_POR_EDITORIAL")  // ← NUEVO
    return {
      background: "rgba(99,102,241,0.10)",
      color: "#3730A3",
      borderColor: "rgba(99,102,241,0.20)",
    };
  return {
    background: "rgba(148,163,184,0.14)",
    color: "#334155",
    borderColor: "rgba(148,163,184,0.26)",
  };
}



function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "A";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "A";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTop}>
        <div style={styles.statLabel}>{label}</div>
      </div>
      <div style={styles.statValue}>{value}</div>
      {hint ? <div style={styles.statHint}>{hint}</div> : null}
    </div>
  );
}

function Icon({
  name,
  tone = "muted",
}: {
  name:
    | "book"
    | "upload"
    | "user"
    | "shield"
    | "bell"
    | "privacy"
    | "refresh"
    | "logout"
    | "download"
    | "eye"
    | "edit";
  tone?: "muted" | "light";
}) {
  const color = tone === "light" ? "rgba(255,247,230,0.92)" : "#64748B";
  const size = 18;
  const common = { width: size, height: size, display: "inline-block" as const };
  switch (name) {
    case "book":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 7H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      );
    case "upload":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v12" />
          <path d="M7 8l5-5 5 5" />
          <path d="M21 21H3" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M20 21a8 8 0 1 0-16 0" />
          <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
    case "eye":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </svg>
      );
  }
}

function btnFxPrimaryProps() {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.filter = "brightness(1.05)";
      e.currentTarget.style.transform = "translateY(-1px)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.filter = "brightness(1)";
      e.currentTarget.style.transform = "translateY(0px)";
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
      e.currentTarget.style.background = "rgba(255,255,255,0.98)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(0px)";
      e.currentTarget.style.background = "rgba(255,255,255,0.92)";
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(1px)";
    },
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(0px)";
    },
  };
}

function rowHoverProps(active: boolean) {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!active) {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 18px 50px rgba(2,6,23,0.08)";
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!active) {
        e.currentTarget.style.transform = "translateY(0px)";
        e.currentTarget.style.boxShadow = "none";
      }
    },
  };
}

function decisionLabel(d: DictamenDecision) {
  if (d === "APROBADO") return "Aprobado";
  if (d === "CORRECCIONES") return "Correcciones";
  return "Rechazado";
}

function dictamenTone(decision: DictamenDecision): React.CSSProperties {
  if (decision === "APROBADO")
    return { background: "rgba(16,185,129,0.12)", color: "#0A7A35", borderColor: "rgba(16,185,129,0.22)" };
  if (decision === "RECHAZADO")
    return { background: "rgba(239,68,68,0.10)", color: "#B42318", borderColor: "rgba(239,68,68,0.22)" };
  return { background: "rgba(208,176,122,0.18)", color: "#6B4E1E", borderColor: "rgba(208,176,122,0.35)" };
}

export default function MisEnviosAutor() {
  const [nav, setNav] = useState<NavKey>("envios");
  const [me, setMe] = useState<Me | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");

  const [openCreateBook, setOpenCreateBook] = useState(false);
  const [openUploadChapter, setOpenUploadChapter] = useState(false);

  // ✅ Modales Mi Cuenta
  const [openPrefs, setOpenPrefs] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openPwd, setOpenPwd] = useState(false);

  const [prefs, setPrefs] = useState<Preferences>({
    email_notify_enabled: true,
    notify_status_changes: true,
    notify_corrections: true,
    notify_approved_rejected: true,
  });

  const [privacy, setPrivacy] = useState<Privacy>({
    show_name: true,
    show_email: false,
  });

  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const [newBook, setNewBook] = useState({
    name: "",
    year: new Date().getFullYear(),
  });
  const [newChapter, setNewChapter] = useState({
    title: "",
    file: null as File | null,
  });

  // ✅ NUEVO: Correcciones (dictámenes)
  const [openCorrections, setOpenCorrections] = useState(false);
  const [corrChapter, setCorrChapter] = useState<Chapter | null>(null);
  const [dictamenes, setDictamenes] = useState<Dictamen[]>([]);
  const [loadingDictamenes, setLoadingDictamenes] = useState(false);

  // ✅ NUEVO: Re-subir versión corregida
  const [openReupload, setOpenReupload] = useState(false);
  const [reuploadChapter, setReuploadChapter] = useState<Chapter | null>(null);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadNote, setReuploadNote] = useState("");

  const selectedBook = useMemo(
    () => (selectedBookId ? books.find((b) => b.id === selectedBookId) ?? null : null),
    [books, selectedBookId]
  );

  const filteredBooks = useMemo(() => {
    const norm = q.trim().toLowerCase();
    if (!norm) return books.slice().sort((a, b) => b.year - a.year);
    return books
      .filter((b) => b.name.toLowerCase().includes(norm) || String(b.year).includes(norm))
      .slice()
      .sort((a, b) => b.year - a.year);
  }, [books, q]);

  const selectedChapters = useMemo(() => {
    const ch = selectedBook?.chapters ?? [];
    return ch.slice().sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  }, [selectedBook]);

  const stats = useMemo(() => {
    const totalBooks = books.length;
    const totalChapters = books.reduce((acc, b) => acc + (b.chapters?.length ?? 0), 0);

    const pending = books.reduce((acc, b) => {
      const ch = b.chapters ?? [];
      return (
        acc +
        ch.filter((c) =>
          ["RECIBIDO", "ASIGNADO_A_DICTAMINADOR", "EN_REVISION", "CORRECCIONES", "REENVIADO_POR_AUTOR"].includes(c.status)
        ).length
      );
    }, 0);

    return { totalBooks, totalChapters, pending };
  }, [books]);

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  const apiMsg = (err: any, fallback: string) => err?.response?.data?.detail || err?.message || fallback;

  // =========================
  // LOADERS
  // =========================
  const loadMe = async () => {
    try {
      const { data } = await api.get<Me>("/account/me", { headers: authHeaders() });
      setMe(data);
    } catch {
      setMe(null);
    }
  };

  const loadPrefs = async () => {
    try {
      const { data } = await api.get<Preferences>("/account/preferences", { headers: authHeaders() });
      setPrefs(data);
    } catch {
      // opcional
    }
  };

  const loadPrivacy = async () => {
    try {
      const { data } = await api.get<Privacy>("/account/privacy", { headers: authHeaders() });
      setPrivacy(data);
    } catch {
      // opcional
    }
  };

  const loadBooks = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.get<any>("/autor/books", { headers: authHeaders() });
      const items: Book[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      setBooks(items);

      if (items.length && (selectedBookId == null || !items.some((x) => x.id === selectedBookId))) {
        setSelectedBookId(items[0].id);
      }
      if (!items.length) setSelectedBookId(null);
    } catch (err: any) {
      setErrorMsg(apiMsg(err, "No se pudieron cargar tus libros."));
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (bookId: number) => {
    try {
      const res = await api.get<any>(`/autor/books/${bookId}/chapters`, { headers: authHeaders() });
      const items: Chapter[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, chapters: items } : b)));
    } catch {
      // opcional
    }
  };

  // ✅ NUEVO: cargar dictámenes (correcciones) de un capítulo
  const loadDictamenes = async (chapterId: number) => {
    setLoadingDictamenes(true);
    try {
      const { data } = await api.get<Dictamen[]>(`/autor/chapters/${chapterId}/dictamenes`, { headers: authHeaders() });
      setDictamenes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setDictamenes([]);
      const msg = apiMsg(err, "No se pudieron cargar las correcciones.");
      setErrorMsg(msg);
    } finally {
      setLoadingDictamenes(false);
    }
  };

  useEffect(() => {
    loadMe();
    loadPrefs();
    loadPrivacy();
    loadBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBookId) loadChapters(selectedBookId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookId]);

  // =========================
  // BOOKS / CHAPTERS
  // =========================
  const openCreateBookModal = () => {
    setNewBook({ name: "", year: new Date().getFullYear() });
    setOpenCreateBook(true);
  };

  const confirmCreateBook = async () => {
    const name = newBook.name.trim();
    const year = Number(newBook.year);

    if (!name) return alert("Escribe el nombre del libro.");
    if (!year || year < 1900 || year > 3000) return alert("Año inválido.");

    try {
      setLoading(true);
      setErrorMsg(null);

      const { data } = await api.post<Book>("/autor/books", { name, year }, { headers: authHeaders() });

      setBooks((prev) => [data, ...prev]);
      setSelectedBookId(data.id);
      setOpenCreateBook(false);
      setNav("envios");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo crear el libro.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const openUploadChapterModal = () => {
    if (!selectedBook) return;
    setNewChapter({ title: "", file: null });
    setOpenUploadChapter(true);
  };

  const confirmUploadChapter = async () => {
    if (!selectedBook) return;

    const title = newChapter.title.trim();
    const file = newChapter.file;

    if (!title) return alert("Escribe el título del capítulo.");
    if (!file) return alert("Selecciona un archivo (PDF o DOCX).");

    const okTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (file.type && !okTypes.includes(file.type)) {
      alert("Formato no permitido. Sube PDF o Word (DOC/DOCX).");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const fd = new FormData();
      fd.append("title", title);
      fd.append("file", file, file.name);

      const { data } = await api.post<Chapter>(`/autor/books/${selectedBook.id}/chapters`, fd, { headers: authHeaders() });

      setBooks((prev) =>
        prev.map((b) => (b.id === selectedBook.id ? { ...b, chapters: [data, ...(b.chapters ?? [])] } : b))
      );

      setOpenUploadChapter(false);
      setNav("envios");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo subir el capítulo.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DOWNLOAD PROTEGIDO
  // =========================
  const downloadChapter = async (c: Chapter) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await api.get(`/autor/chapters/${c.id}/download`, {
        headers: authHeaders(),
        responseType: "blob",
      });

      const blob: Blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], {
              type: res.headers?.["content-type"] || "application/octet-stream",
            });

      let filename = `capitulo_${c.id}`;
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
        if (ct.includes("pdf")) filename += ".pdf";
        else if (ct.includes("wordprocessingml.document")) filename += ".docx";
        else if (ct.includes("msword")) filename += ".doc";
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo descargar el archivo.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: descargar PDF dictamen protegido
  const downloadDictamen = async (d: Dictamen) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await api.get(`/autor/dictamenes/${d.id}/download`, {
        headers: authHeaders(),
        responseType: "blob",
      });

      const blob: Blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], {
              type: res.headers?.["content-type"] || "application/pdf",
            });

      let filename = `dictamen_${d.folio || d.id}.pdf`;
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

      if (!/\.pdf$/i.test(filename)) filename += ".pdf";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo descargar el dictamen.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: abrir modal correcciones
  const openCorrectionsModal = async (c: Chapter) => {
    setCorrChapter(c);
    setDictamenes([]);
    setOpenCorrections(true);
    await loadDictamenes(c.id);
  };

  // ✅ NUEVO: abrir modal reupload
  const openReuploadModal = (c: Chapter) => {
    setReuploadChapter(c);
    setReuploadFile(null);
    setReuploadNote("");
    setOpenReupload(true);
  };

  // ✅ NUEVO: confirmar reupload
  const confirmReupload = async () => {
    if (!reuploadChapter) return;
    if (!reuploadFile) return alert("Selecciona el archivo corregido (PDF o Word).");

    const okTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (reuploadFile.type && !okTypes.includes(reuploadFile.type)) {
      alert("Formato no permitido. Sube PDF o Word (DOC/DOCX).");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const fd = new FormData();
      fd.append("file", reuploadFile, reuploadFile.name);
      if (reuploadNote.trim()) fd.append("note", reuploadNote.trim());

      await api.post(`/autor/chapters/${reuploadChapter.id}/reupload`, fd, {
        headers: authHeaders(),
      });

      setOpenReupload(false);

      // refrescar capítulos del libro actual (para ver status actualizado)
      if (selectedBookId) await loadChapters(selectedBookId);

      alert("Versión corregida enviada ✅");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo enviar la versión corregida.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // MI CUENTA - acciones
  // =========================
  const savePrefs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.patch<Preferences>("/account/preferences", prefs, { headers: authHeaders() });
      setPrefs(data);
      setOpenPrefs(false);
      alert("Preferencias guardadas ✅");
    } catch (err: any) {
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

  // =========================
  // RENDER
  // =========================
  return (
    <div style={styles.page}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandLogoWrap}>
            <img src={brandLogo} alt="Editorial Interpec" style={styles.brandLogoImg} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.brandTitle}>Editorial Interpec</div>
            <div style={styles.brandSubtitle}>Panel de Autor</div>
          </div>
        </div>

        <div style={styles.profileCard}>
          <div style={styles.avatar}>{initials(me?.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.profileName}>{me?.name || "Autor"}</div>
            <div style={styles.profileEmail}>{me?.email || "Sesión activa"}</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <button
            type="button"
            onClick={() => setNav("envios")}
            style={{
              ...styles.navItem,
              ...(nav === "envios" ? styles.navItemActive : null),
            }}
          >
            <span style={styles.navDot} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="book" tone="light" /> Mis envíos
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNav("cuenta")}
            style={{
              ...styles.navItem,
              ...(nav === "cuenta" ? styles.navItemActive : null),
            }}
          >
            <span style={styles.navDot} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="user" tone="light" /> Mi Cuenta
            </span>
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <button type="button" style={styles.logoutBtn} onClick={logout}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="logout" tone="light" /> Cerrar sesión
            </span>
          </button>
          <div style={styles.sidebarHint}>© {new Date().getFullYear()} Editorial Interpec</div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>{nav === "envios" ? "Mis envíos" : "Mi Cuenta"}</div>
            <div style={styles.headerSub}>
              {nav === "envios"
                ? "Crea un libro y sube capítulos para revisión editorial."
                : "Administra tu información, seguridad y preferencias."}
            </div>
          </div>

          {nav === "envios" ? (
            <div style={styles.headerActions}>
              <button
                style={styles.primaryBtn}
                onClick={openCreateBookModal}
                type="button"
                disabled={loading}
                {...btnFxPrimaryProps()}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon name="book" tone="light" /> Crear libro
                </span>
              </button>
              <button
                style={styles.secondaryBtn}
                onClick={openUploadChapterModal}
                type="button"
                disabled={!selectedBook || loading}
                title={!selectedBook ? "Selecciona un libro" : "Subir capítulo"}
                {...btnFxSecondaryProps()}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon name="upload" /> Subir capítulo
                </span>
              </button>
            </div>
          ) : (
            <div style={styles.headerActions}>
              <button
                style={styles.secondaryBtn}
                type="button"
                onClick={() => {
                  loadMe();
                  loadPrefs();
                  loadPrivacy();
                }}
                disabled={loading}
                {...btnFxSecondaryProps()}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon name="refresh" /> Actualizar datos
                </span>
              </button>
            </div>
          )}
        </div>

        {errorMsg && <div style={styles.error}>{errorMsg}</div>}

        {/* HERO + STATS (solo envíos) */}
        {nav === "envios" && (
          <div style={styles.hero}>
            <div style={styles.heroLeft}>
              <div style={styles.heroTitle}>Tu panel de envíos</div>
              <div style={styles.heroSub}>Controla libros, capítulos y revisiones en un solo lugar.</div>

              <div style={styles.heroHintLine}>
                <span style={styles.heroHintPill}>
                  Sesión: <b style={{ color: "#1B2A24" }}>{me?.email || "—"}</b>
                </span>
                <span style={styles.heroHintPill}>Consejo: mantén títulos claros y consistentes.</span>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <StatCard label="Libros" value={stats.totalBooks} hint="Registrados en tu cuenta" />
              <StatCard label="Capítulos" value={stats.totalChapters} hint="Totales cargados" />
              <StatCard label="Pendientes" value={stats.pending} hint="En proceso editorial" />
            </div>
          </div>
        )}

        {/* CONTENT */}
        {nav === "cuenta" ? (
          <div style={styles.contentGrid2}>
            {/* Perfil */}
            <section style={styles.card}>
              <div style={styles.cardHead}>
                <div style={styles.cardTitle}>Perfil</div>
                <div style={styles.cardHint}>Información básica de tu cuenta</div>
              </div>

              <div style={styles.kvList}>
                <div style={styles.kvRow}>
                  <div style={styles.kvKey}>Nombre</div>
                  <div style={styles.kvVal}>{me?.name || "—"}</div>
                </div>
                <div style={styles.kvRow}>
                  <div style={styles.kvKey}>Correo</div>
                  <div style={styles.kvVal}>{me?.email || "—"}</div>
                </div>
                <div style={styles.kvRow}>
                  <div style={styles.kvKey}>Rol</div>
                  <div style={styles.kvVal}>
                    <span style={styles.rolePill}>{me?.role || "autor"}</span>
                  </div>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.note}>
                Las notificaciones se envían al correo con el que te registró la editorial: <b>{me?.email || "—"}</b>
              </div>
            </section>

            {/* Seguridad */}
            <section style={styles.card}>
              <div style={styles.cardHead}>
                <div style={styles.cardTitle}>Seguridad</div>
                <div style={styles.cardHint}>Contraseña y acceso</div>
              </div>

              <div style={styles.actionList}>
                <div style={styles.actionRow}>
                  <div>
                    <div style={styles.actionTitle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="shield" /> Cambiar contraseña
                      </span>
                    </div>
                    <div style={styles.actionSub}>Actualiza tu contraseña para mantener tu cuenta segura.</div>
                  </div>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
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

                <div style={styles.actionRow}>
                  <div>
                    <div style={styles.actionTitle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="logout" /> Sesión
                      </span>
                    </div>
                    <div style={styles.actionSub}>Cierra sesión en este dispositivo si ya terminaste.</div>
                  </div>
                  <button type="button" style={styles.dangerBtn} onClick={logout}>
                    Cerrar
                  </button>
                </div>
              </div>
            </section>

            {/* Preferencias */}
            <section style={styles.card}>
              <div style={styles.cardHead}>
                <div style={styles.cardTitle}>Preferencias</div>
                <div style={styles.cardHint}>Ajustes del panel</div>
              </div>

              <div style={styles.prefRow}>
                <div>
                  <div style={styles.actionTitle}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="bell" /> Notificaciones por correo
                    </span>
                  </div>
                  <div style={styles.actionSub}>
                    Recibir avisos cuando tu capítulo cambie de estado o te pidan correcciones.
                  </div>
                </div>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => setOpenPrefs(true)}
                  disabled={loading}
                  {...btnFxSecondaryProps()}
                >
                  Configurar
                </button>
              </div>

              <div style={styles.prefRow}>
                <div>
                  <div style={styles.actionTitle}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="privacy" /> Privacidad
                    </span>
                  </div>
                  <div style={styles.actionSub}>Controla qué datos se muestran en tu perfil.</div>
                </div>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => setOpenPrivacy(true)}
                  disabled={loading}
                  {...btnFxSecondaryProps()}
                >
                  Ajustar
                </button>
              </div>
            </section>

            {/* Ayuda */}
            <section style={styles.card}>
              <div style={styles.cardHead}>
                <div style={styles.cardTitle}>Soporte</div>
                <div style={styles.cardHint}>¿Necesitas ayuda?</div>
              </div>

              <div style={styles.note}>
                Si tienes problemas con tus envíos, contacta al área editorial o revisa “Mis envíos” para ver el estado.
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, padding: 14 }}>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => setNav("envios")}
                  {...btnFxSecondaryProps()}
                >
                  Ir a Mis envíos
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div style={styles.contentGrid}>
            {/* LEFT: libros */}
            <section style={styles.card}>
              <div style={styles.cardHeadRow}>
                <div>
                  <div style={styles.cardTitle}>Mis Libros</div>
                  <div style={styles.cardHint}>{loading ? "Cargando..." : `${books.length} libro(s)`}</div>
                </div>

                <div style={styles.searchBox}>
                  <input
                    style={styles.searchInput}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nombre o año..."
                  />
                </div>
              </div>

              <div style={styles.list}>
                {!loading && filteredBooks.length === 0 ? (
                  <div style={styles.empty}>Aún no tienes libros. Crea uno con “Crear libro”.</div>
                ) : (
                  filteredBooks.map((b) => {
                    const active = b.id === selectedBookId;
                    const chapCount = (b.chapters ?? []).length;

                    return (
                      <button
                        key={b.id}
                        style={{
                          ...styles.rowBtn,
                          ...(active ? styles.rowBtnActive : null),
                        }}
                        onClick={() => setSelectedBookId(b.id)}
                        type="button"
                        {...rowHoverProps(active)}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.rowTitle}>
                            {b.name} <span style={styles.rowMuted}>({b.year})</span>
                          </div>
                          <div style={styles.rowSub}>
                            {chapCount} capítulo(s) • creado {fmtDate(b.created_at)}
                          </div>
                        </div>

                        <span style={styles.rowChip}>{chapCount}/12</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* RIGHT: detalle */}
            <section style={styles.card}>
              {!selectedBook ? (
                <div style={styles.empty}>Selecciona un libro para ver capítulos.</div>
              ) : (
                <>
                  <div style={styles.detailHeader}>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.detailTitle}>{selectedBook.name}</div>
                      <div style={styles.detailSub}>
                        Año {selectedBook.year} • {(selectedBook.chapters ?? []).length} capítulo(s)
                      </div>
                    </div>

                    <button
                      style={styles.secondaryBtn}
                      onClick={openUploadChapterModal}
                      type="button"
                      disabled={loading}
                      {...btnFxSecondaryProps()}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="upload" /> Subir capítulo
                      </span>
                    </button>
                  </div>

                  <div style={styles.tableCard}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>#</th>
                          <th style={styles.th}>Título</th>
                          <th style={styles.th}>Estado</th>
                          <th style={styles.th}>Actualizado</th>
                          <th style={styles.th}>Archivo</th>
                          <th style={styles.th}>Correcciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedChapters.map((c, idx) => (
                          <tr
                            key={c.id}
                            style={{
                              background: idx % 2 === 0 ? "rgba(251,248,242,0.35)" : "transparent",
                            }}
                          >
                            <td style={styles.td}>{idx + 1}</td>
                            <td style={styles.td}>
                              <div style={styles.cellTitle}>{c.title}</div>
                              <div style={styles.cellSub}>ID: {c.id}</div>
                            </td>
                            <td style={styles.td}>
                              <span style={{ ...styles.pill, ...pillTone(c.status) }}>{statusLabel(c.status)}</span>
                            </td>
                            <td style={styles.td}>{fmtDate(c.updated_at)}</td>
                            <td style={styles.td}>
                              <button
                                type="button"
                                style={styles.secondaryBtn}
                                onClick={() => downloadChapter(c)}
                                disabled={loading}
                                title="Descargar archivo protegido"
                                {...btnFxSecondaryProps()}
                              >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                  <Icon name="download" /> Ver / Descargar
                                </span>
                              </button>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  style={styles.secondaryBtn}
                                  onClick={() => openCorrectionsModal(c)}
                                  disabled={loading}
                                  title="Ver dictámenes/correcciones"
                                  {...btnFxSecondaryProps()}
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                    <Icon name="eye" /> Ver correcciones
                                  </span>
                                </button>

 <button
  type="button"
  style={{
    ...styles.secondaryBtn,
    opacity: c.status === "CORRECCIONES" || c.status === "CORRECCIONES_SOLICITADAS_A_AUTOR" ? 1 : 0.55,
    cursor: c.status === "CORRECCIONES" || c.status === "CORRECCIONES_SOLICITADAS_A_AUTOR" ? "pointer" : "not-allowed",
  }}
  onClick={() => {
    if (c.status !== "CORRECCIONES" && c.status !== "CORRECCIONES_SOLICITADAS_A_AUTOR") return;
    openReuploadModal(c);
  }}
  disabled={loading}
  title={
    c.status === "CORRECCIONES" || c.status === "CORRECCIONES_SOLICITADAS_A_AUTOR"
      ? "Subir versión corregida"
      : "Disponible cuando el estado sea Correcciones"
  }
  {...btnFxSecondaryProps()}
>
                                
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                    <Icon name="edit" /> Subir versión
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {selectedChapters.length === 0 && (
                          <tr>
                            <td style={styles.td} colSpan={6}>
                              Este libro aún no tiene capítulos. Usa “Subir capítulo”.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={styles.hintRow}>
                    <span style={styles.muted}>Recomendación: máximo 10–12 capítulos por libro.</span>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* MODAL: crear libro */}
        {openCreateBook && (
          <div style={styles.modalOverlay} onClick={() => setOpenCreateBook(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Crear libro</div>

              <label style={styles.modalLabel}>Nombre</label>
              <input
                style={styles.modalInput}
                value={newBook.name}
                onChange={(e) => setNewBook((s) => ({ ...s, name: e.target.value }))}
                placeholder="Ej: Libro 3"
              />

              <label style={styles.modalLabel}>Año</label>
              <input
                style={styles.modalInput}
                type="number"
                value={newBook.year}
                onChange={(e) => setNewBook((s) => ({ ...s, year: Number(e.target.value) }))}
                placeholder="2026"
              />

              <div style={styles.modalActions}>
                <button
                  style={styles.secondaryBtn}
                  type="button"
                  onClick={() => setOpenCreateBook(false)}
                  {...btnFxSecondaryProps()}
                >
                  Cancelar
                </button>
                <button
                  style={styles.primaryBtn}
                  type="button"
                  onClick={confirmCreateBook}
                  disabled={loading}
                  {...btnFxPrimaryProps()}
                >
                  {loading ? "Creando..." : "Crear"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: subir capítulo */}
        {openUploadChapter && selectedBook && (
          <div style={styles.modalOverlay} onClick={() => setOpenUploadChapter(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Subir capítulo</div>
              <div style={styles.modalHint}>
                Libro: <b>{selectedBook.name}</b> ({selectedBook.year})
              </div>

              <label style={styles.modalLabel}>Título del capítulo</label>
              <input
                style={styles.modalInput}
                value={newChapter.title}
                onChange={(e) => setNewChapter((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ej: Educación y talento"
              />

              <label style={styles.modalLabel}>Archivo (PDF o Word)</label>
              <input
                style={styles.modalInput}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setNewChapter((s) => ({ ...s, file: e.target.files?.[0] ?? null }))}
              />
              <div style={styles.fileMeta}>
                {newChapter.file ? `Seleccionado: ${newChapter.file.name}` : "Ningún archivo seleccionado"}
              </div>

              <div style={styles.modalActions}>
                <button
                  style={styles.secondaryBtn}
                  type="button"
                  onClick={() => setOpenUploadChapter(false)}
                  {...btnFxSecondaryProps()}
                >
                  Cancelar
                </button>
                <button
                  style={styles.primaryBtn}
                  type="button"
                  onClick={confirmUploadChapter}
                  disabled={loading}
                  {...btnFxPrimaryProps()}
                >
                  {loading ? "Subiendo..." : "Subir"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ver correcciones */}
        {openCorrections && corrChapter && (
          <div
            style={styles.modalOverlay}
            onClick={() => {
              setOpenCorrections(false);
              setCorrChapter(null);
              setDictamenes([]);
            }}
          >
            <div style={styles.modalWide} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <div style={styles.modalTitle}>Correcciones / Dictámenes</div>
                  <div style={styles.modalHint}>
                    Capítulo: <b>{corrChapter.title}</b> • ID: <b>{corrChapter.id}</b> • Estado:{" "}
                    <span style={{ ...styles.pill, ...pillTone(corrChapter.status) }}>
                      {statusLabel(corrChapter.status)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => openCorrectionsModal(corrChapter)}
                    disabled={loadingDictamenes || loading}
                    {...btnFxSecondaryProps()}
                    title="Recargar correcciones"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="refresh" /> Recargar
                    </span>
                  </button>

  <button
  type="button"
  style={{
    ...styles.secondaryBtn,
    opacity: corrChapter.status === "CORRECCIONES" || corrChapter.status === "CORRECCIONES_SOLICITADAS_A_AUTOR" ? 1 : 0.55,
    cursor: corrChapter.status === "CORRECCIONES" || corrChapter.status === "CORRECCIONES_SOLICITADAS_A_AUTOR" ? "pointer" : "not-allowed",
  }}
  onClick={() => {
    if (corrChapter.status !== "CORRECCIONES" && corrChapter.status !== "CORRECCIONES_SOLICITADAS_A_AUTOR") return;
    setOpenCorrections(false);
    openReuploadModal(corrChapter);
  }}
  disabled={loading}
  {...btnFxSecondaryProps()}
  title={
    corrChapter.status === "CORRECCIONES" || corrChapter.status === "CORRECCIONES_SOLICITADAS_A_AUTOR"
      ? "Subir versión corregida"
      : "Disponible cuando el estado sea Correcciones"
  }
>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="edit" /> Subir versión corregida
                    </span>
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => {
                      setOpenCorrections(false);
                      setCorrChapter(null);
                      setDictamenes([]);
                    }}
                    {...btnFxSecondaryProps()}
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div style={styles.divider} />

              {loadingDictamenes ? (
                <div style={styles.empty}>Cargando correcciones...</div>
              ) : dictamenes.length === 0 ? (
                <div style={styles.empty}>Aún no hay correcciones registradas para este capítulo.</div>
              ) : (
                <div style={styles.dictamenList}>
                  {dictamenes.map((d) => (
                    <div key={d.id} style={styles.dictamenCard}>
                      <div style={styles.dictamenTopRow}>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.dictamenTitle}>
                            Folio: <b>{d.folio}</b>
                          </div>
                          <div style={styles.dictamenMeta}>
                            Tipo: <b>{d.tipo}</b> • Estado: <b>{d.status}</b> • Creado:{" "}
                            <b>{d.created_at ? fmtDate(d.created_at) : "—"}</b>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ ...styles.pill, ...dictamenTone(d.decision) }}>{decisionLabel(d.decision)}</span>

                          <button
                            type="button"
                            style={{
                              ...styles.secondaryBtn,
                              opacity: d.pdf_path ? 1 : 0.55,
                              cursor: d.pdf_path ? "pointer" : "not-allowed",
                            }}
                            onClick={() => {
                              if (!d.pdf_path) return;
                              downloadDictamen(d);
                            }}
                            disabled={loading}
                            {...btnFxSecondaryProps()}
                            title={d.pdf_path ? "Descargar dictamen (PDF)" : "Este dictamen no tiene PDF"}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                              <Icon name="download" /> PDF dictamen
                            </span>
                          </button>
                        </div>
                      </div>

                      <div style={styles.dictamenGrid}>
                        <div style={styles.dictamenBox}>
                          <div style={styles.dictamenBoxTitle}>Comentarios / Correcciones</div>
                          <div style={styles.dictamenBoxText}>{d.comentarios?.trim() ? d.comentarios : "—"}</div>
                        </div>

                        <div style={styles.dictamenBox}>
                          <div style={styles.dictamenBoxTitle}>Conflicto de interés</div>
                          <div style={styles.dictamenBoxText}>
                            {d.conflicto_interes?.trim() ? d.conflicto_interes : "—"}
                          </div>
                        </div>

                        <div style={styles.dictamenBox}>
                          <div style={styles.dictamenBoxTitle}>Promedio</div>
                          <div style={styles.dictamenBoxText}>{d.promedio ?? "—"}</div>
                          <div style={{ height: 8 }} />
                          <div style={styles.dictamenBoxTitle}>Firmado</div>
                          <div style={styles.dictamenBoxText}>{d.signed_at ? fmtDate(d.signed_at) : "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: reupload versión corregida */}
        {openReupload && reuploadChapter && (
          <div
            style={styles.modalOverlay}
            onClick={() => {
              setOpenReupload(false);
              setReuploadChapter(null);
              setReuploadFile(null);
              setReuploadNote("");
            }}
          >
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Subir versión corregida</div>
              <div style={styles.modalHint}>
                Capítulo: <b>{reuploadChapter.title}</b> • ID: <b>{reuploadChapter.id}</b>
              </div>

              <div style={styles.note}>
                Sube tu archivo corregido. Al enviarlo, el estado pasará automáticamente a <b>REENVIADO_POR_AUTOR</b>.
              </div>

              <label style={styles.modalLabel}>Archivo corregido (PDF o Word)</label>
              <input
                style={styles.modalInput}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setReuploadFile(e.target.files?.[0] ?? null)}
              />
              <div style={styles.fileMeta}>
                {reuploadFile ? `Seleccionado: ${reuploadFile.name}` : "Ningún archivo seleccionado"}
              </div>

              <label style={styles.modalLabel}>Nota (opcional)</label>
              <input
                style={styles.modalInput}
                value={reuploadNote}
                onChange={(e) => setReuploadNote(e.target.value)}
                placeholder="Ej: Corregí ortografía y referencias según observaciones."
              />

              <div style={styles.modalActions}>
                <button
                  style={styles.secondaryBtn}
                  type="button"
                  onClick={() => {
                    setOpenReupload(false);
                    setReuploadChapter(null);
                    setReuploadFile(null);
                    setReuploadNote("");
                  }}
                  {...btnFxSecondaryProps()}
                >
                  Cancelar
                </button>
                <button
                  style={styles.primaryBtn}
                  type="button"
                  onClick={confirmReupload}
                  disabled={loading}
                  {...btnFxPrimaryProps()}
                >
                  {loading ? "Enviando..." : "Enviar versión"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: preferencias */}
        {openPrefs && (
          <div style={styles.modalOverlay} onClick={() => setOpenPrefs(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Notificaciones por correo</div>
              <div style={styles.modalHint}>
                Se enviarán al correo: <b>{me?.email || "—"}</b>
              </div>

              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, email_notify_enabled: e.target.checked }))}
                />
                <span>
                  <b>Activar notificaciones</b>
                  <div style={styles.checkSub}>Recibir avisos oficiales del proceso editorial.</div>
                </span>
              </label>

              <div style={{ height: 10 }} />

              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_status_changes}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_status_changes: e.target.checked }))}
                />
                <span>Cuando cambie el estado del capítulo</span>
              </label>

              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_corrections}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_corrections: e.target.checked }))}
                />
                <span>Cuando pidan correcciones (observaciones)</span>
              </label>

              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_approved_rejected}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_approved_rejected: e.target.checked }))}
                />
                <span>Cuando sea aprobado o rechazado</span>
              </label>

              <div style={styles.modalActions}>
                <button style={styles.secondaryBtn} type="button" onClick={() => setOpenPrefs(false)} {...btnFxSecondaryProps()}>
                  Cancelar
                </button>
                <button style={styles.primaryBtn} type="button" onClick={savePrefs} disabled={loading} {...btnFxPrimaryProps()}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: privacidad */}
        {openPrivacy && (
          <div style={styles.modalOverlay} onClick={() => setOpenPrivacy(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Privacidad</div>
              <div style={styles.modalHint}>Controla lo que se muestra en tu perfil dentro del sistema.</div>

              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={privacy.show_name}
                  onChange={(e) => setPrivacy((s) => ({ ...s, show_name: e.target.checked }))}
                />
                <span>Mostrar mi nombre</span>
              </label>

              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={privacy.show_email}
                  onChange={(e) => setPrivacy((s) => ({ ...s, show_email: e.target.checked }))}
                />
                <span>Mostrar mi correo</span>
              </label>

              <div style={styles.modalActions}>
                <button
                  style={styles.secondaryBtn}
                  type="button"
                  onClick={() => setOpenPrivacy(false)}
                  {...btnFxSecondaryProps()}
                >
                  Cancelar
                </button>
                <button
                  style={styles.primaryBtn}
                  type="button"
                  onClick={savePrivacy}
                  disabled={loading}
                  {...btnFxPrimaryProps()}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: cambiar contraseña */}
        {openPwd && (
          <div style={styles.modalOverlay} onClick={() => setOpenPwd(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Cambiar contraseña</div>
              <div style={styles.modalHint}>Tu contraseña debe tener al menos 8 caracteres.</div>

              <label style={styles.modalLabel}>Contraseña actual</label>
              <input
                style={styles.modalInput}
                type="password"
                value={pwd.current_password}
                onChange={(e) => setPwd((s) => ({ ...s, current_password: e.target.value }))}
              />

              <label style={styles.modalLabel}>Nueva contraseña</label>
              <input
                style={styles.modalInput}
                type="password"
                value={pwd.new_password}
                onChange={(e) => setPwd((s) => ({ ...s, new_password: e.target.value }))}
              />

              <div style={styles.modalActions}>
                <button style={styles.secondaryBtn} type="button" onClick={() => setOpenPwd(false)} {...btnFxSecondaryProps()}>
                  Cancelar
                </button>
                <button style={styles.primaryBtn} type="button" onClick={changePassword} disabled={loading} {...btnFxPrimaryProps()}>
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

// ✅ Estilos Editorial (verde + dorado + papel)
// ✅ FIX: evitar mezclar `border` (shorthand) con `borderColor` (no-shorthand)
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 18,
    padding: 18,
    background: "#FFFFFF",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
    color: "#0d83ab",
  },

  sidebar: {
    position: "sticky",
    top: 18,
    alignSelf: "start",
    height: "calc(100vh - 36px)",
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.16)",
    background: "linear-gradient(180deg, rgba(11, 123, 171, 0.98) 0%, rgba(6,36,27,0.98) 100%)",
    color: "#FFF7E6",
    boxShadow: "0 22px 70px rgba(2,6,23,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },

  profileCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 18,
    background: "rgba(255, 255, 255, 0)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(28, 209, 222, 0.78)",
    display: "flex",
    gap: 10,
    alignItems: "center",
    boxShadow: "inset 0 1px 0 rgb(9, 145, 183)",
  },

  brand: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "10px 10px 14px 10px",
  },

  brandLogoWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.08))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.30)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
    overflow: "hidden",
  },
  brandLogoImg: { width: "100%", height: "100%", objectFit: "cover" },

  brandTitle: {
    fontWeight: 1000,
    letterSpacing: 0.2,
    lineHeight: 1.05,
    fontSize: 14,
    color: "#FFF7E6",
  },
  brandSubtitle: {
    fontSize: 12,
    opacity: 0.85,
    marginTop: 3,
    color: "rgba(255,247,230,0.82)",
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at 30% 30%, rgba(198, 170, 121, 0.61), rgba(255,255,255,0.08))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.26)",
    fontWeight: 1000,
    color: "#FFF7E6",
  },
  profileName: {
    fontWeight: 1000,
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#FFF7E6",
  },
  profileEmail: {
    fontSize: 12,
    opacity: 0.82,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "rgba(255,247,230,0.82)",
  },

  nav: { marginTop: 14, display: "flex", flexDirection: "column", gap: 10 },
  navItem: {
    width: "100%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(230, 248, 255, 0.07)",
    background: "rgba(255, 255, 255, 0.28)",
    color: "#FFF7E6",
    borderRadius: 16,
    padding: "12px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 950,
    textAlign: "left",
    transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease",
  },
  navItemActive: {
    background: "linear-gradient(180deg, rgba(208,176,122,0.24), rgba(255,255,255,0.08))",
    borderColor: "rgba(208,176,122,0.42)",
    boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
    transform: "translateY(-1px)",
  },
  navDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(208,176,122,0.95)",
    boxShadow: "0 0 0 4px rgba(208,176,122,0.14)",
  },

  sidebarFooter: {
    marginTop: "auto",
    paddingTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  logoutBtn: {
    width: "100%",
    borderRadius: 16,
    padding: "12px 12px",
    cursor: "pointer",
    fontWeight: 1000,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,247,230,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "#FFF7E6",
    transition: "transform 120ms ease, background 120ms ease",
  },
  sidebarHint: {
    fontSize: 12,
    opacity: 0.78,
    paddingLeft: 4,
    color: "rgba(255,247,230,0.75)",
  },

  main: {
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(226,232,240,0.9)",
    background: "#FFFFFF",
    boxShadow: "0 18px 60px rgba(2,6,23,0.08)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(6, 45, 96, 0.9)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    background: "#439ad4",
  },
  headerTitle: { fontSize: 20, fontWeight: 1000, color: "#242f2bfe" },
  headerSub: { marginTop: 4, fontSize: 13, color: "#242f2bfe", maxWidth: 760 },
  headerActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  hero: {
    padding: "16px 18px 0 18px",
    display: "grid",
    gridTemplateColumns: "1.15fr 1fr",
    gap: 14,
    alignItems: "stretch",
  },
  heroLeft: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(145, 148, 113, 0.14)",
    background: "linear-gradient(180deg, rgba(115, 214, 151, 0.44) 0%, rgba(208,176,122,0.08) 100%)",
    padding: 16,
    boxShadow: "0 18px 55px rgba(2,6,23,0.10)",
  },
  heroTitle: { fontSize: 16, fontWeight: 1000, color: "#1B2A24" },
  heroSub: { marginTop: 6, fontSize: 13, color: "#677971ae", lineHeight: 1.45 },

  heroHintLine: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" },
  heroHintPill: {
    fontSize: 12,
    color: "#2b3a337c",
    background: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.20)",
    padding: "6px 10px",
    borderRadius: 999,
    boxShadow: "0 10px 24px rgba(2,6,23,0.08)",
  },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  statCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.18)",
    background: "rgba(255,255,255,0.88)",
    padding: 14,
    boxShadow: "0 14px 40px rgba(2,6,23,0.06)",
  },
  statTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontSize: 12, color: "rgba(27,42,36,0.62)", fontWeight: 900 },
  statValue: { marginTop: 8, fontSize: 22, fontWeight: 1000, color: "#1B2A24", letterSpacing: -0.2 },
  statHint: { marginTop: 6, fontSize: 12, color: "rgba(27,42,36,0.62)" },

  contentGrid: {
    padding: 18,
    display: "grid",
    gridTemplateColumns: "420px 1fr",
    gap: 14,
    alignItems: "start",
  },
  contentGrid2: {
    padding: 18,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    alignItems: "start",
  },

  card: {
    background: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.18)",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 14px 42px rgba(2,6,23,0.06)",
  },
  cardHead: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(208,176,122,0.16)",
    background: "rgba(251,248,242,0.88)",
  },
  cardHeadRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(208,176,122,0.16)",
    background: "rgba(251,248,242,0.88)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: { fontWeight: 1000, color: "#1B2A24" },
  cardHint: { marginTop: 4, fontSize: 12, color: "rgba(27,42,36,0.62)" },

  primaryBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.35)",
    background: "linear-gradient(180deg, rgba(17,96,71,1) 0%, rgba(11,59,44,1) 100%)",
    color: "#FFF7E6",
    cursor: "pointer",
    fontWeight: 1000,
    boxShadow: "0 16px 44px rgba(11,59,44,0.20)",
    transition: "transform 120ms ease, filter 120ms ease",
  },
  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.26)",
    background: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    fontWeight: 1000,
    transition: "transform 120ms ease, background 120ms ease",
  },
  dangerBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(239,68,68,0.22)",
    background: "rgba(254,242,242,0.90)",
    color: "#991B1B",
    cursor: "pointer",
    fontWeight: 1000,
  },

  error: {
    margin: 18,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(239,68,68,0.22)",
    background: "rgba(254,242,242,0.90)",
    color: "#991B1B",
    padding: "10px 12px",
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 900,
  },

  searchBox: { flex: "0 0 240px", display: "flex", justifyContent: "flex-end" },
  searchInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.26)",
    outline: "none",
    fontSize: 13,
    background: "rgba(255,255,255,0.94)",
  },

  list: { padding: 12, display: "flex", flexDirection: "column", gap: 10 },
  empty: { padding: 14, color: "rgba(27,42,36,0.62)", fontSize: 13 },

  rowBtn: {
    width: "100%",
    textAlign: "left",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.16)",
    background: "rgba(255,255,255,0.94)",
    borderRadius: 16,
    padding: 12,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
  },
  rowBtnActive: {
    borderColor: "rgba(17,96,71,0.30)",
    boxShadow: "0 18px 50px rgba(11,59,44,0.12)",
    transform: "translateY(-1px)",
  },
  rowTitle: {
    fontWeight: 1000,
    color: "#1B2A24",
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowMuted: { fontWeight: 800, color: "rgba(27,42,36,0.55)" },
  rowSub: { marginTop: 4, fontSize: 12, color: "rgba(27,42,36,0.55)" },
  rowChip: {
    fontSize: 12,
    color: "#2B3A33",
    background: "rgba(251,248,242,0.85)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.16)",
    borderRadius: 999,
    padding: "4px 10px",
    whiteSpace: "nowrap",
    fontWeight: 1000,
  },

  detailHeader: { padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  detailTitle: {
    fontWeight: 1000,
    color: "#1B2A24",
    fontSize: 16,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  detailSub: { marginTop: 4, fontSize: 12, color: "rgba(27,42,36,0.55)" },

  tableCard: {
    margin: "0 14px 14px 14px",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.16)",
    overflow: "hidden",
    background: "rgba(255,255,255,0.92)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 12,
    padding: "10px 12px",
    background: "rgba(251,248,242,0.88)",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(208,176,122,0.18)",
    color: "#2B3A33",
  },
  td: {
    padding: "10px 12px",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(226,232,240,0.85)",
    fontSize: 13,
    color: "#0F172A",
    verticalAlign: "top",
  },
  cellTitle: { fontWeight: 1000 },
  cellSub: { fontSize: 11, color: "rgba(27,42,36,0.55)", marginTop: 2 },

  pill: {
    display: "inline-block",
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(148,163,184,0.26)", // default
    fontWeight: 1000,
    whiteSpace: "nowrap",
  },

  hintRow: { padding: "0 14px 14px 14px", display: "flex", justifyContent: "space-between" },
  muted: { color: "rgba(27,42,36,0.55)", fontSize: 12 },

  kvList: { padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  kvRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  kvKey: { fontSize: 12, color: "rgba(27,42,36,0.55)", fontWeight: 900 },
  kvVal: { fontSize: 13, color: "#1B2A24", fontWeight: 1000, textAlign: "right" },

  rolePill: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.35)",
    background: "rgba(208,176,122,0.18)",
    color: "#6B4E1E",
    fontWeight: 1000,
    textTransform: "capitalize",
  },

  divider: { height: 1, background: "rgba(208,176,122,0.16)", margin: "0 14px" },
  note: { padding: 14, fontSize: 13, color: "rgba(27,42,36,0.70)", lineHeight: 1.5 },

  actionList: { padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  actionRow: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.16)",
    borderRadius: 16,
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    background: "rgba(255,255,255,0.94)",
  },
  actionTitle: { fontWeight: 1000, color: "#1B2A24" },
  actionSub: { marginTop: 4, fontSize: 12, color: "rgba(27,42,36,0.55)", maxWidth: 520 },

  prefRow: {
    padding: 14,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "rgba(208,176,122,0.14)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.45)",
    display: "grid",
    placeItems: "center",
    padding: 16,
    zIndex: 999,
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    background: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.18)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 26px 80px rgba(2,6,23,0.28)",
  },

  modalWide: {
    width: "100%",
    maxWidth: 980,
    background: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.18)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 26px 80px rgba(2,6,23,0.28)",
  },

  modalTitle: { fontWeight: 1000, color: "#1B2A24", fontSize: 16, marginBottom: 10 },
  modalHint: { fontSize: 12, color: "rgba(27,42,36,0.62)", marginBottom: 8 },
  modalLabel: { fontSize: 12, fontWeight: 1000, color: "#2B3A33", marginTop: 10, display: "block" },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.26)",
    outline: "none",
    fontSize: 14,
    marginTop: 6,
    background: "rgba(255,255,255,0.98)",
  },
  fileMeta: { marginTop: 6, fontSize: 12, color: "rgba(27,42,36,0.55)" },
  modalActions: { marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 },

  checkRow: { display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", fontSize: 13, color: "#1B2A24" },
  checkSub: { marginTop: 4, fontSize: 12, color: "rgba(27,42,36,0.55)" },

  dictamenList: { marginTop: 12, display: "flex", flexDirection: "column", gap: 12 },
  dictamenCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.18)",
    background: "rgba(255,255,255,0.94)",
    padding: 12,
    boxShadow: "0 14px 42px rgba(2,6,23,0.06)",
  },
  dictamenTopRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  dictamenTitle: { fontWeight: 1000, color: "#1B2A24", fontSize: 14 },
  dictamenMeta: { marginTop: 4, fontSize: 12, color: "rgba(27,42,36,0.62)" },
  dictamenGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1.2fr 1.2fr 0.6fr",
    gap: 10,
  },
  dictamenBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(208,176,122,0.16)",
    background: "rgba(251,248,242,0.65)",
    padding: 10,
  },
  dictamenBoxTitle: { fontSize: 12, fontWeight: 1000, color: "#2B3A33" },
  dictamenBoxText: { marginTop: 6, fontSize: 13, color: "rgba(27,42,36,0.80)", whiteSpace: "pre-wrap" },
};