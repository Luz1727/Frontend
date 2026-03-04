import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import brandLogo from "../../assets/brand-logo.jpeg";
import styles from "./MisEnviosAutor.module.css";
import { alertService } from "../../utils/alerts";

type ChapterStatus =
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "ENVIADO_A_DICTAMINADOR"
  | "EN_REVISION_DICTAMINADOR"
  | "CORRECCIONES_SOLICITADAS_A_AUTOR"
  | "CORRECCIONES"
  | "REENVIADO_POR_AUTOR"
  | "REVISADO_POR_EDITORIAL"
  | "LISTO_PARA_FIRMA"
  | "FIRMADO"
  | "EN_REVISION"
  | "APROBADO"
  | "RECHAZADO";

type Chapter = {
  id: number;
  title: string;
  status: ChapterStatus;
  updated_at: string;
  file_path?: string | null;

  // ✅ fecha límite que asignó el dictaminador al autor
  author_deadline_at?: string | null;

  // (opcional) si algún día agregas editorial deadline:
  // editorial_deadline_at?: string | null;
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

/* =========================
   ✅ HELPERS: deadline badge + meta
========================= */
function parseISO(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysDiffFromToday(dateStr?: string | null) {
  const d = parseISO(dateStr);
  if (!d) return null;

  const today = startOfDay(new Date());
  const target = startOfDay(d);

  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function deadlineVisualClass(dateStr?: string | null) {
  const diff = daysDiffFromToday(dateStr);
  if (diff == null) return styles.deadlineNormal;
  if (diff < 0) return styles.deadlineExpired;
  if (diff <= 5) return styles.deadlineSoon;
  return styles.deadlineNormal;
}

function deadlineMetaText(dateStr?: string | null) {
  const diff = daysDiffFromToday(dateStr);
  if (diff == null) return "—";
  if (diff < 0) return `Vencida hace ${Math.abs(diff)} día(s)`;
  if (diff === 0) return "Vence hoy";
  return `Faltan ${diff} día(s)`;
}

function statusLabel(s: ChapterStatus) {
  if (s === "RECIBIDO") return "Recibido";
  if (s === "ASIGNADO_A_DICTAMINADOR") return "Asignado";
  if (s === "ENVIADO_A_DICTAMINADOR") return "Enviado a dictaminador";
  if (s === "EN_REVISION_DICTAMINADOR") return "En revisión (dictaminador)";
  if (s === "CORRECCIONES_SOLICITADAS_A_AUTOR") return "Correcciones solicitadas";
  if (s === "CORRECCIONES") return "Correcciones";
  if (s === "REENVIADO_POR_AUTOR") return "Reenviado";
  if (s === "REVISADO_POR_EDITORIAL") return "Revisado por editorial";
  if (s === "LISTO_PARA_FIRMA") return "Listo para firma";
  if (s === "FIRMADO") return "Firmado";
  if (s === "EN_REVISION") return "En revisión";
  if (s === "APROBADO") return "Aprobado";
  return "Rechazado";
}

function getPillClass(status: ChapterStatus): string {
  const baseClass = styles.pill;

  const statusMap: Record<ChapterStatus, string> = {
    APROBADO: styles.pillApproved,
    CORRECCIONES: styles.pillCorrections,
    CORRECCIONES_SOLICITADAS_A_AUTOR: styles.pillCorrections,
    EN_REVISION: styles.pillRevision,
    EN_REVISION_DICTAMINADOR: styles.pillRevision,
    RECHAZADO: styles.pillRejected,
    RECIBIDO: styles.pillDefault,
    ASIGNADO_A_DICTAMINADOR: styles.pillAssigned,
    ENVIADO_A_DICTAMINADOR: styles.pillSent,
    REENVIADO_POR_AUTOR: styles.pillResent,
    REVISADO_POR_EDITORIAL: styles.pillEditorial,
    LISTO_PARA_FIRMA: styles.pillReady,
    FIRMADO: styles.pillSigned,
  };

  return `${baseClass} ${statusMap[status] || styles.pillDefault}`;
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
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <div className={styles.statLabel}>{label}</div>
      </div>
      <div className={styles.statValue}>{value}</div>
      {hint ? <div className={styles.statHint}>{hint}</div> : null}
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

  const [openCorrections, setOpenCorrections] = useState(false);
  const [corrChapter, setCorrChapter] = useState<Chapter | null>(null);
  const [dictamenes, setDictamenes] = useState<Dictamen[]>([]);
  const [loadingDictamenes, setLoadingDictamenes] = useState(false);

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
          ["RECIBIDO", "ASIGNADO_A_DICTAMINADOR", "EN_REVISION", "CORRECCIONES", "REENVIADO_POR_AUTOR"].includes(
            c.status
          )
        ).length
      );
    }, 0);

    return { totalBooks, totalChapters, pending };
  }, [books]);

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  const apiMsg = (err: any, fallback: string) => err?.response?.data?.detail || err?.message || fallback;

  const showError = (msg: string) => {
    alertService.error(msg);
    setErrorMsg(msg);
  };

  /* =========================
     LOADERS
  ========================= */
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
    } catch {}
  };

  const loadPrivacy = async () => {
    try {
      const { data } = await api.get<Privacy>("/account/privacy", { headers: authHeaders() });
      setPrivacy(data);
    } catch {}
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
      showError(apiMsg(err, "No se pudieron cargar tus libros."));
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (bookId: number) => {
    try {
      const res = await api.get<any>(`/autor/books/${bookId}/chapters`, { headers: authHeaders() });
      const items: Chapter[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];

      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, chapters: items } : b)));
    } catch {}
  };

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

  /* =========================
     BOOKS / CHAPTERS
  ========================= */
  const openCreateBookModal = () => {
    setNewBook({ name: "", year: new Date().getFullYear() });
    setOpenCreateBook(true);
  };

  const confirmCreateBook = async () => {
    const name = newBook.name.trim();
    const year = Number(newBook.year);

    if (!name) {
      alertService.warning("Escribe el nombre del libro.");
      return;
    }
    if (!year || year < 1900 || year > 3000) {
      alertService.warning("Año inválido.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const { data } = await api.post<Book>("/autor/books", { name, year }, { headers: authHeaders() });

      setBooks((prev) => [data, ...prev]);
      setSelectedBookId(data.id);
      setOpenCreateBook(false);
      setNav("envios");

      alertService.success("Libro creado correctamente");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo crear el libro.");
      showError(msg);
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

    if (!title) {
      alertService.warning("Escribe el título del capítulo.");
      return;
    }
    if (!file) {
      alertService.warning("Selecciona un archivo (PDF o DOCX).");
      return;
    }

    const okTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (file.type && !okTypes.includes(file.type)) {
      alertService.warning("Formato no permitido. Sube PDF o Word (DOC/DOCX).");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const fd = new FormData();
      fd.append("title", title);
      fd.append("file", file, file.name);

      const { data } = await api.post<Chapter>(`/autor/books/${selectedBook.id}/chapters`, fd, {
        headers: authHeaders(),
      });

      setBooks((prev) =>
        prev.map((b) => (b.id === selectedBook.id ? { ...b, chapters: [data, ...(b.chapters ?? [])] } : b))
      );

      setOpenUploadChapter(false);
      setNav("envios");

      alertService.success("Capítulo subido correctamente");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo subir el capítulo.");
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     DOWNLOAD PROTEGIDO
  ========================= */
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
          : new Blob([res.data], { type: res.headers?.["content-type"] || "application/octet-stream" });

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

      alertService.success("Descarga iniciada");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo descargar el archivo.");
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

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
          : new Blob([res.data], { type: res.headers?.["content-type"] || "application/pdf" });

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

      alertService.success("Dictamen descargado");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo descargar el dictamen.");
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openCorrectionsModal = async (c: Chapter) => {
    setCorrChapter(c);
    setDictamenes([]);
    setOpenCorrections(true);
    await loadDictamenes(c.id);
  };

  const openReuploadModal = (c: Chapter) => {
    setReuploadChapter(c);
    setReuploadFile(null);
    setReuploadNote("");
    setOpenReupload(true);
  };

  const confirmReupload = async () => {
    if (!reuploadChapter) return;
    if (!reuploadFile) {
      alertService.warning("Selecciona el archivo corregido (PDF o Word).");
      return;
    }

    const okTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (reuploadFile.type && !okTypes.includes(reuploadFile.type)) {
      alertService.warning("Formato no permitido. Sube PDF o Word (DOC/DOCX).");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const fd = new FormData();
      fd.append("file", reuploadFile, reuploadFile.name);
      if (reuploadNote.trim()) fd.append("note", reuploadNote.trim());

      await api.post(`/autor/chapters/${reuploadChapter.id}/reupload`, fd, { headers: authHeaders() });

      setOpenReupload(false);
      if (selectedBookId) await loadChapters(selectedBookId);

      alertService.success("Versión corregida enviada ✅");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo enviar la versión corregida.");
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     MI CUENTA - acciones
  ========================= */
  const savePrefs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.patch<Preferences>("/account/preferences", prefs, { headers: authHeaders() });
      setPrefs(data);
      setOpenPrefs(false);
      alertService.success("Preferencias guardadas ✅");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudieron guardar notificaciones.");
      showError(msg);
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
      alertService.success("Privacidad guardada ✅");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo guardar privacidad.");
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.current_password || !pwd.new_password) {
      alertService.warning("Completa ambos campos.");
      return;
    }
    if (pwd.new_password.length < 8) {
      alertService.warning("La nueva contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await api.post("/account/change-password", pwd, { headers: authHeaders() });
      setPwd({ current_password: "", new_password: "" });
      setOpenPwd(false);
      alertService.success("Contraseña actualizada ✅");
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo cambiar la contraseña.");
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const result = await alertService.confirm("¿Seguro que quieres cerrar sesión?");
    if (result.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className={styles.page}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogoWrap}>
            <img src={brandLogo} alt="Editorial Interpec" className={styles.brandLogoImg} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className={styles.brandTitle}>Editorial Interpec</div>
            <div className={styles.brandSubtitle}>Panel de Autor</div>
          </div>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.avatar}>{initials(me?.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div className={styles.profileName}>{me?.name || "Autor"}</div>
            <div className={styles.profileEmail}>{me?.email || "Sesión activa"}</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <button
            type="button"
            onClick={() => setNav("envios")}
            className={`${styles.navItem} ${nav === "envios" ? styles.navItemActive : ""}`}
          >
            <span className={styles.navDot} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="book" tone="light" /> Mis envíos
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNav("cuenta")}
            className={`${styles.navItem} ${nav === "cuenta" ? styles.navItemActive : ""}`}
          >
            <span className={styles.navDot} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="user" tone="light" /> Mi Cuenta
            </span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.logoutBtn} onClick={logout}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="logout" tone="light" /> Cerrar sesión
            </span>
          </button>
          <div className={styles.sidebarHint}>© {new Date().getFullYear()} Editorial Interpec</div>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        {/* HEADER */}
        <div className={styles.header}>
          <div>
            <div className={styles.headerTitle}>{nav === "envios" ? "Mis envíos" : "Mi Cuenta"}</div>
            <div className={styles.headerSub}>
              {nav === "envios"
                ? "Crea un libro y sube capítulos para revisión editorial."
                : "Administra tu información, seguridad y preferencias."}
            </div>
          </div>

          {nav === "envios" ? (
            <div className={styles.headerActions}>
              <button className={styles.primaryBtn} onClick={openCreateBookModal} type="button" disabled={loading}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon name="book" tone="light" /> Crear libro
                </span>
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={openUploadChapterModal}
                type="button"
                disabled={!selectedBook || loading}
                title={!selectedBook ? "Selecciona un libro" : "Subir capítulo"}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon name="upload" /> Subir capítulo
                </span>
              </button>
            </div>
          ) : (
            <div className={styles.headerActions}>
              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={() => {
                  loadMe();
                  loadPrefs();
                  loadPrivacy();
                }}
                disabled={loading}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon name="refresh" /> Actualizar datos
                </span>
              </button>
            </div>
          )}
        </div>

        {errorMsg && <div className={styles.error}>{errorMsg}</div>}

        {/* HERO + STATS (solo envíos) */}
        {nav === "envios" && (
          <div className={styles.hero}>
            <div className={styles.heroLeft}>
              <div className={styles.heroTitle}>Tu panel de envíos</div>
              <div className={styles.heroSub}>Controla libros, capítulos y revisiones en un solo lugar.</div>

              <div className={styles.heroHintLine}>
                <span className={styles.heroHintPill}>
                  Sesión: <b style={{ color: "#1B2A24" }}>{me?.email || "—"}</b>
                </span>
                <span className={styles.heroHintPill}>Consejo: mantén títulos claros y consistentes.</span>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <StatCard label="Libros" value={stats.totalBooks} hint="Registrados en tu cuenta" />
              <StatCard label="Capítulos" value={stats.totalChapters} hint="Totales cargados" />
              <StatCard label="Pendientes" value={stats.pending} hint="En proceso editorial" />
            </div>
          </div>
        )}

        {/* CONTENT */}
        {nav === "cuenta" ? (
          <div className={styles.contentGrid2}>
            {/* Perfil */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Perfil</div>
                <div className={styles.cardHint}>Información básica de tu cuenta</div>
              </div>

              <div className={styles.kvList}>
                <div className={styles.kvRow}>
                  <div className={styles.kvKey}>Nombre</div>
                  <div className={styles.kvVal}>{me?.name || "—"}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvKey}>Correo</div>
                  <div className={styles.kvVal}>{me?.email || "—"}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvKey}>Rol</div>
                  <div className={styles.kvVal}>
                    <span className={styles.rolePill}>{me?.role || "autor"}</span>
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.note}>
                Las notificaciones se envían al correo con el que te registró la editorial: <b>{me?.email || "—"}</b>
              </div>
            </section>

            {/* Seguridad */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Seguridad</div>
                <div className={styles.cardHint}>Contraseña y acceso</div>
              </div>

              <div className={styles.actionList}>
                <div className={styles.actionRow}>
                  <div>
                    <div className={styles.actionTitle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="shield" /> Cambiar contraseña
                      </span>
                    </div>
                    <div className={styles.actionSub}>Actualiza tu contraseña para mantener tu cuenta segura.</div>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => {
                      setPwd({ current_password: "", new_password: "" });
                      setOpenPwd(true);
                    }}
                    disabled={loading}
                  >
                    Cambiar
                  </button>
                </div>

                <div className={styles.actionRow}>
                  <div>
                    <div className={styles.actionTitle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="logout" /> Sesión
                      </span>
                    </div>
                    <div className={styles.actionSub}>Cierra sesión en este dispositivo si ya terminaste.</div>
                  </div>
                  <button type="button" className={styles.dangerBtn} onClick={logout}>
                    Cerrar
                  </button>
                </div>
              </div>
            </section>

            {/* Preferencias */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Preferencias</div>
                <div className={styles.cardHint}>Ajustes del panel</div>
              </div>

              <div className={styles.prefRow}>
                <div>
                  <div className={styles.actionTitle}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="bell" /> Notificaciones por correo
                    </span>
                  </div>
                  <div className={styles.actionSub}>
                    Recibir avisos cuando tu capítulo cambie de estado o te pidan correcciones.
                  </div>
                </div>
                <button type="button" className={styles.secondaryBtn} onClick={() => setOpenPrefs(true)} disabled={loading}>
                  Configurar
                </button>
              </div>

              <div className={styles.prefRow}>
                <div>
                  <div className={styles.actionTitle}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icon name="privacy" /> Privacidad
                    </span>
                  </div>
                  <div className={styles.actionSub}>Controla qué datos se muestran en tu perfil.</div>
                </div>
                <button type="button" className={styles.secondaryBtn} onClick={() => setOpenPrivacy(true)} disabled={loading}>
                  Ajustar
                </button>
              </div>
            </section>

            {/* Ayuda */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Soporte</div>
                <div className={styles.cardHint}>¿Necesitas ayuda?</div>
              </div>

              <div className={styles.note}>
                Si tienes problemas con tus envíos, contacta al área editorial o revisa “Mis envíos” para ver el estado.
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, padding: 14 }}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setNav("envios")}>
                  Ir a Mis envíos
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.contentGrid}>
            {/* LEFT: libros */}
            <section className={styles.card}>
              <div className={styles.cardHeadRow}>
                <div>
                  <div className={styles.cardTitle}>Mis Libros</div>
                  <div className={styles.cardHint}>{loading ? "Cargando..." : `${books.length} libro(s)`}</div>
                </div>

                <div className={styles.searchBox}>
                  <input
                    className={styles.searchInput}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nombre o año..."
                  />
                </div>
              </div>

              <div className={styles.list}>
                {!loading && filteredBooks.length === 0 ? (
                  <div className={styles.empty}>Aún no tienes libros. Crea uno con “Crear libro”.</div>
                ) : (
                  filteredBooks.map((b) => {
                    const active = b.id === selectedBookId;
                    const chapCount = (b.chapters ?? []).length;

                    return (
                      <button
                        key={b.id}
                        className={`${styles.rowBtn} ${active ? styles.rowBtnActive : ""}`}
                        onClick={() => setSelectedBookId(b.id)}
                        type="button"
                      >
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.rowTitle}>
                            {b.name} <span className={styles.rowMuted}>({b.year})</span>
                          </div>
                          <div className={styles.rowSub}>
                            {chapCount} capítulo(s) • creado {fmtDate(b.created_at)}
                          </div>
                        </div>

                        <span className={styles.rowChip}>{chapCount}/12</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* RIGHT: detalle */}
            <section className={styles.card}>
              {!selectedBook ? (
                <div className={styles.empty}>Selecciona un libro para ver capítulos.</div>
              ) : (
                <>
                  <div className={styles.detailHeader}>
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.detailTitle}>{selectedBook.name}</div>
                      <div className={styles.detailSub}>
                        Año {selectedBook.year} • {(selectedBook.chapters ?? []).length} capítulo(s)
                      </div>
                    </div>

                    <button className={styles.secondaryBtn} onClick={openUploadChapterModal} type="button" disabled={loading}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="upload" /> Subir capítulo
                      </span>
                    </button>
                  </div>

                  <div className={styles.tableCard}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>#</th>
                          <th className={styles.th}>Título</th>
                          <th className={styles.th}>Estado</th>
                          <th className={styles.th}>Actualizado</th>
                          <th className={styles.th}>Archivo</th>
                          <th className={styles.th}>Correcciones</th>
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
                            <td className={styles.td}>{idx + 1}</td>

                            <td className={styles.td}>
                              <div className={styles.cellTitle}>{c.title}</div>
                              <div className={styles.cellSub}>ID: {c.id}</div>

                              {/* ✅ ✅ AQUÍ SE MUESTRA AUTOR LIMITE SIEMPRE */}
                              <div className={styles.deadlineWrap}>
                                <span className={`${styles.deadlineBadge} ${deadlineVisualClass(c.author_deadline_at)}`}>
                                  Autor · Límite autor: {c.author_deadline_at ? fmtDate(c.author_deadline_at) : "—"}
                                </span>
                                <span className={styles.deadlineMeta}>{deadlineMetaText(c.author_deadline_at)}</span>
                              </div>
                            </td>

                            <td className={styles.td}>
                              <span className={getPillClass(c.status)}>{statusLabel(c.status)}</span>
                            </td>

                            <td className={styles.td}>{fmtDate(c.updated_at)}</td>

                            <td className={styles.td}>
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => downloadChapter(c)}
                                disabled={loading}
                                title="Descargar archivo protegido"
                              >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                  <Icon name="download" /> Ver / Descargar
                                </span>
                              </button>
                            </td>

                            <td className={styles.td}>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className={styles.secondaryBtn}
                                  onClick={() => openCorrectionsModal(c)}
                                  disabled={loading}
                                  title="Ver dictámenes/correcciones"
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                    <Icon name="eye" /> Ver correcciones
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  className={styles.secondaryBtn}
                                  style={{
                                    opacity:
                                      c.status === "CORRECCIONES" || c.status === "CORRECCIONES_SOLICITADAS_A_AUTOR" ? 1 : 0.55,
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
                            <td className={styles.td} colSpan={6}>
                              Este libro aún no tiene capítulos. Usa “Subir capítulo”.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.hintRow}>
                    <span className={styles.muted}>Recomendación: máximo 10–12 capítulos por libro.</span>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* ===== MODALES (los tuyos) ===== */}
        {/* Crear libro */}
        {openCreateBook && (
          <div className={styles.modalOverlay} onClick={() => setOpenCreateBook(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Crear libro</div>

              <label className={styles.modalLabel}>Nombre</label>
              <input
                className={styles.modalInput}
                value={newBook.name}
                onChange={(e) => setNewBook((s) => ({ ...s, name: e.target.value }))}
                placeholder="Ej: Libro 3"
              />

              <label className={styles.modalLabel}>Año</label>
              <input
                className={styles.modalInput}
                type="number"
                value={newBook.year}
                onChange={(e) => setNewBook((s) => ({ ...s, year: Number(e.target.value) }))}
                placeholder="2026"
              />

              <div className={styles.modalActions}>
                <button className={styles.secondaryBtn} type="button" onClick={() => setOpenCreateBook(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryBtn} type="button" onClick={confirmCreateBook} disabled={loading}>
                  {loading ? "Creando..." : "Crear"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subir capítulo */}
        {openUploadChapter && selectedBook && (
          <div className={styles.modalOverlay} onClick={() => setOpenUploadChapter(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Subir capítulo</div>
              <div className={styles.modalHint}>
                Libro: <b>{selectedBook.name}</b> ({selectedBook.year})
              </div>

              <label className={styles.modalLabel}>Título del capítulo</label>
              <input
                className={styles.modalInput}
                value={newChapter.title}
                onChange={(e) => setNewChapter((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ej: Educación y talento"
              />

              <label className={styles.modalLabel}>Archivo (PDF o Word)</label>
              <input
                className={styles.modalInput}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setNewChapter((s) => ({ ...s, file: e.target.files?.[0] ?? null }))}
              />
              <div className={styles.fileMeta}>
                {newChapter.file ? `Seleccionado: ${newChapter.file.name}` : "Ningún archivo seleccionado"}
              </div>

              <div className={styles.modalActions}>
                <button className={styles.secondaryBtn} type="button" onClick={() => setOpenUploadChapter(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryBtn} type="button" onClick={confirmUploadChapter} disabled={loading}>
                  {loading ? "Subiendo..." : "Subir"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ver correcciones */}
        {openCorrections && corrChapter && (
          <div
            className={styles.modalOverlay}
            onClick={() => {
              setOpenCorrections(false);
              setCorrChapter(null);
              setDictamenes([]);
            }}
          >
            <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
              <div className={styles.dictamenHeader}>
                <div className={styles.dictamenHeaderInfo}>
                  <div className={styles.dictamenHeaderTitle}>
                    📋 Correcciones y Dictámenes
                    <span className={styles.dictamenHeaderBadge}>
                      {dictamenes.length} {dictamenes.length === 1 ? "resultado" : "resultados"}
                    </span>
                  </div>
                  <div className={styles.dictamenHeaderMeta}>
                    <span>
                      <strong>Capítulo:</strong> {corrChapter.title}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>ID:</strong> {corrChapter.id}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Estado:</strong>{" "}
                      <span className={getPillClass(corrChapter.status)}>{statusLabel(corrChapter.status)}</span>
                    </span>
                  </div>
                </div>

                <div className={styles.dictamenCardHeaderRight}>
                  <button
                    type="button"
                    className={styles.dictamenActionBtn}
                    onClick={() => openCorrectionsModal(corrChapter)}
                    disabled={loadingDictamenes || loading}
                    title="Recargar correcciones"
                  >
                    <Icon name="refresh" /> Recargar
                  </button>

                  <button
                    type="button"
                    className={`${styles.dictamenActionBtn} ${styles.primary}`}
                    style={{
                      opacity:
                        corrChapter.status === "CORRECCIONES" || corrChapter.status === "CORRECCIONES_SOLICITADAS_A_AUTOR"
                          ? 1
                          : 0.55,
                    }}
                    onClick={() => {
                      if (corrChapter.status !== "CORRECCIONES" && corrChapter.status !== "CORRECCIONES_SOLICITADAS_A_AUTOR") return;
                      setOpenCorrections(false);
                      openReuploadModal(corrChapter);
                    }}
                    disabled={loading}
                    title={
                      corrChapter.status === "CORRECCIONES" || corrChapter.status === "CORRECCIONES_SOLICITADAS_A_AUTOR"
                        ? "Subir versión corregida"
                        : "Disponible cuando el estado sea Correcciones"
                    }
                  >
                    <Icon name="edit" /> Subir versión
                  </button>

                  <button
                    type="button"
                    className={styles.dictamenActionBtn}
                    onClick={() => {
                      setOpenCorrections(false);
                      setCorrChapter(null);
                      setDictamenes([]);
                    }}
                  >
                    ✕ Cerrar
                  </button>
                </div>
              </div>

              <div className={styles.divider} />

              {loadingDictamenes ? (
                <div className={styles.dictamenEmpty}>
                  <div className={styles.dictamenEmptyIcon}>⏳</div>
                  <div className={styles.dictamenEmptyTitle}>Cargando correcciones...</div>
                  <div className={styles.dictamenEmptyText}>Estamos obteniendo la información de los dictámenes.</div>
                </div>
              ) : dictamenes.length === 0 ? (
                <div className={styles.dictamenEmpty}>
                  <div className={styles.dictamenEmptyIcon}>📭</div>
                  <div className={styles.dictamenEmptyTitle}>No hay correcciones</div>
                  <div className={styles.dictamenEmptyText}>
                    Este capítulo aún no tiene correcciones o dictámenes registrados.
                  </div>
                </div>
              ) : (
                <div className={styles.dictamenList}>
                  {dictamenes.map((d) => (
                    <div key={d.id} className={styles.dictamenCard}>
                      <div className={styles.dictamenCardHeader}>
                        <div className={styles.dictamenCardHeaderLeft}>
                          <span className={styles.dictamenFolio}>{d.folio}</span>

                          <div className={styles.dictamenMetaPills}>
                            <span className={`${styles.dictamenMetaPill} ${styles.dictamenMetaPillTipo}`}>📌 {d.tipo}</span>
                            <span className={`${styles.dictamenMetaPill} ${styles.dictamenMetaPillEstado}`}>⚡ {d.status}</span>
                            <span className={`${styles.dictamenMetaPill} ${styles.dictamenMetaPillFecha}`}>
                              📅 {d.created_at ? fmtDate(d.created_at) : "—"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.dictamenCardHeaderRight}>
                          <span
                            className={`${styles.dictamenDecisionBadge} ${
                              d.decision === "APROBADO"
                                ? styles.aprobado
                                : d.decision === "CORRECCIONES"
                                ? styles.correcciones
                                : styles.rechazado
                            }`}
                          >
                            {d.decision === "APROBADO" && "✅ Aprobado"}
                            {d.decision === "CORRECCIONES" && "✏️ Correcciones"}
                            {d.decision === "RECHAZADO" && "❌ Rechazado"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.dictamenCardBody}>
                        <div className={styles.dictamenInfoGrid}>
                          <div className={styles.dictamenInfoItem}>
                            <div className={styles.dictamenInfoLabel}>
                              <span>💬</span> Comentarios
                            </div>
                            <div
                              className={`${styles.dictamenInfoValue} ${
                                !d.comentarios?.trim() ? styles.dictamenInfoValueEmpty : ""
                              }`}
                            >
                              {d.comentarios?.trim() || "Sin comentarios"}
                            </div>
                          </div>

                          <div className={styles.dictamenInfoItem}>
                            <div className={styles.dictamenInfoLabel}>
                              <span>⚠️</span> Conflicto de interés
                            </div>
                            <div
                              className={`${styles.dictamenInfoValue} ${
                                !d.conflicto_interes?.trim() ? styles.dictamenInfoValueEmpty : ""
                              }`}
                            >
                              {d.conflicto_interes?.trim() || "No especificado"}
                            </div>
                          </div>

                          <div className={styles.dictamenInfoItem}>
                            <div className={styles.dictamenInfoLabel}>
                              <span>📊</span> Promedio
                            </div>
                            <div className={styles.dictamenInfoValue}>
                              <strong style={{ fontSize: "20px" }}>{d.promedio ?? "—"}</strong>
                              <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
                                {d.signed_at ? `Firmado: ${fmtDate(d.signed_at)}` : "No firmado"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.dictamenCardFooter}>
                        <div className={styles.dictamenFooterLeft}>
                          <span className={`${styles.dictamenFirmaInfo} ${d.signed_at ? styles.firmado : styles.noFirmado}`}>
                            {d.signed_at ? "✅ Firmado" : "⏳ Pendiente de firma"}
                          </span>
                        </div>

                        <div className={styles.dictamenFooterRight}>
                          {d.pdf_path && (
                            <button
                              type="button"
                              className={`${styles.dictamenActionBtn} ${styles.download}`}
                              onClick={() => downloadDictamen(d)}
                              disabled={loading}
                              title="Descargar dictamen PDF"
                            >
                              <Icon name="download" /> Descargar PDF
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reupload */}
        {openReupload && reuploadChapter && (
          <div
            className={styles.modalOverlay}
            onClick={() => {
              setOpenReupload(false);
              setReuploadChapter(null);
              setReuploadFile(null);
              setReuploadNote("");
            }}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Subir versión corregida</div>
              <div className={styles.modalHint}>
                Capítulo: <b>{reuploadChapter.title}</b> • ID: <b>{reuploadChapter.id}</b>
              </div>

              <div className={styles.note}>
                Sube tu archivo corregido. Al enviarlo, el estado pasará automáticamente a <b>REENVIADO_POR_AUTOR</b>.
              </div>

              <label className={styles.modalLabel}>Archivo corregido (PDF o Word)</label>
              <input
                className={styles.modalInput}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setReuploadFile(e.target.files?.[0] ?? null)}
              />
              <div className={styles.fileMeta}>
                {reuploadFile ? `Seleccionado: ${reuploadFile.name}` : "Ningún archivo seleccionado"}
              </div>

              <label className={styles.modalLabel}>Nota (opcional)</label>
              <input
                className={styles.modalInput}
                value={reuploadNote}
                onChange={(e) => setReuploadNote(e.target.value)}
                placeholder="Ej: Corregí ortografía y referencias según observaciones."
              />

              <div className={styles.modalActions}>
                <button
                  className={styles.secondaryBtn}
                  type="button"
                  onClick={() => {
                    setOpenReupload(false);
                    setReuploadChapter(null);
                    setReuploadFile(null);
                    setReuploadNote("");
                  }}
                >
                  Cancelar
                </button>
                <button className={styles.primaryBtn} type="button" onClick={confirmReupload} disabled={loading}>
                  {loading ? "Enviando..." : "Enviar versión"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preferencias */}
        {openPrefs && (
          <div className={styles.modalOverlay} onClick={() => setOpenPrefs(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Notificaciones por correo</div>
              <div className={styles.modalHint}>
                Se enviarán al correo: <b>{me?.email || "—"}</b>
              </div>

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, email_notify_enabled: e.target.checked }))}
                />
                <span>
                  <b>Activar notificaciones</b>
                  <div className={styles.checkSub}>Recibir avisos oficiales del proceso editorial.</div>
                </span>
              </label>

              <div style={{ height: 10 }} />

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_status_changes}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_status_changes: e.target.checked }))}
                />
                <span>Cuando cambie el estado del capítulo</span>
              </label>

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_corrections}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_corrections: e.target.checked }))}
                />
                <span>Cuando pidan correcciones (observaciones)</span>
              </label>

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={prefs.notify_approved_rejected}
                  disabled={!prefs.email_notify_enabled}
                  onChange={(e) => setPrefs((s) => ({ ...s, notify_approved_rejected: e.target.checked }))}
                />
                <span>Cuando sea aprobado o rechazado</span>
              </label>

              <div className={styles.modalActions}>
                <button className={styles.secondaryBtn} type="button" onClick={() => setOpenPrefs(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryBtn} type="button" onClick={savePrefs} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacidad */}
        {openPrivacy && (
          <div className={styles.modalOverlay} onClick={() => setOpenPrivacy(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Privacidad</div>
              <div className={styles.modalHint}>Controla lo que se muestra en tu perfil dentro del sistema.</div>

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={privacy.show_name}
                  onChange={(e) => setPrivacy((s) => ({ ...s, show_name: e.target.checked }))}
                />
                <span>Mostrar mi nombre</span>
              </label>

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={privacy.show_email}
                  onChange={(e) => setPrivacy((s) => ({ ...s, show_email: e.target.checked }))}
                />
                <span>Mostrar mi correo</span>
              </label>

              <div className={styles.modalActions}>
                <button className={styles.secondaryBtn} type="button" onClick={() => setOpenPrivacy(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryBtn} type="button" onClick={savePrivacy} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cambiar contraseña */}
        {openPwd && (
          <div className={styles.modalOverlay} onClick={() => setOpenPwd(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Cambiar contraseña</div>
              <div className={styles.modalHint}>Tu contraseña debe tener al menos 8 caracteres.</div>

              <label className={styles.modalLabel}>Contraseña actual</label>
              <input
                className={styles.modalInput}
                type="password"
                value={pwd.current_password}
                onChange={(e) => setPwd((s) => ({ ...s, current_password: e.target.value }))}
              />

              <label className={styles.modalLabel}>Nueva contraseña</label>
              <input
                className={styles.modalInput}
                type="password"
                value={pwd.new_password}
                onChange={(e) => setPwd((s) => ({ ...s, new_password: e.target.value }))}
              />

              <div className={styles.modalActions}>
                <button className={styles.secondaryBtn} type="button" onClick={() => setOpenPwd(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryBtn} type="button" onClick={changePassword} disabled={loading}>
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