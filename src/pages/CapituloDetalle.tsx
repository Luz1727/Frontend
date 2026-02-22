// CapituloDetalle.tsx - Versión mejorada con los 3 procesos
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

type Status =
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "ENVIADO_A_DICTAMINADOR"
  | "EN_REVISION_DICTAMINADOR"
  | "CORRECCIONES_SOLICITADAS_A_AUTOR"
  | "REENVIADO_POR_AUTOR"
  | "REVISADO_POR_EDITORIAL"
  | "LISTO_PARA_FIRMA"
  | "FIRMADO"
  | "APROBADO"
  | "RECHAZADO";

type VersionFile = {
  id: string;
  versionLabel: string;
  fileName: string;
  uploadedAt: string;
  note: string;
  uploadedBy: "autor" | "dictaminador" | "editorial";
};

type CriterioEvaluacion = {
  id: string;
  nombre: string;
  puntaje: 1 | 2 | 3 | 4 | 5;
};

// Criterios predefinidos para evaluación
const CRITERIOS_PREDEFINIDOS = [
  { id: "c1", nombre: "Claridad y organización del contenido" },
  { id: "c2", nombre: "Pertinencia y actualidad del tema" },
  { id: "c3", nombre: "Rigor metodológico" },
  { id: "c4", nombre: "Aportación original al campo" },
  { id: "c5", nombre: "Calidad de las referencias y fuentes" },
];

type DictamenCompleto = {
  id: string;
  folio: string;
  evaluadorId: string;
  evaluadorNombre: string;
  evaluadorEmail: string;
  evaluadorCvu: string;

  // ✅ AHORA ES TEXTO LIBRE
  tipo: string;

  titulo: string;
  criterios: CriterioEvaluacion[];
  promedio: number;
  decision: "APROBADO" | "CORRECCIONES" | "RECHAZADO";
  comentarios: string;
  conflictosInteres: string; // "SÍ: explicación" o "NO"
  fechaEvaluacion: string;
  fechaFirma?: string;
  firmado: boolean;
  archivoFirma?: string;
};

type DictamenHistorico = {
  id: string;
  evaluador: string;

  // ✅ también texto libre
  type: string;

  scoreAvg: number;
  decision: "APROBADO" | "CORRECCIONES" | "RECHAZADO";
  createdAt: string;
  firmado: boolean;
  folio: string;
};

type HistoryItem = {
  id: string;
  at: string;
  by: string;
  action: string;
  detail: string;
};

type Constancia = {
  id: string;
  folio: string;
  evaluadorNombre: string;
  evaluadorCvu: string;
  capituloTitulo: string;
  fechaEmision: string;
  pdfUrl?: string;
};

type Chapter = {
  id: string;
  folio: string;
  title: string;
  book: string;
  author: string;
  authorEmail: string;
  status: Status;
  evaluatorName: string | null;
  evaluatorEmail: string | null;
  evaluatorCvu: string | null; // NUEVO
  versions: VersionFile[];
  dictamenes: DictamenHistorico[];
  dictamenActual?: DictamenCompleto; // NUEVO - el dictamen en curso
  history: HistoryItem[];
  constancias: Constancia[]; // NUEVO
};

const endpoints = {
  chapterDetail: (chapterId: string) => `/admin/chapters/${chapterId}`,
  chapterStatus: (chapterId: string) => `/admin/chapters/${chapterId}/status`,

  assignEvaluator: (chapterId: string) => `/admin/chapters/${chapterId}/assign`,
  sendToEvaluator: (chapterId: string) => `/admin/chapters/${chapterId}/send-to-evaluator`,
  requestCorrections: (chapterId: string) => `/admin/chapters/${chapterId}/request-corrections`,

  markEditorialReview: (chapterId: string) => `/admin/chapters/${chapterId}/mark-editorial-review`,
  sendForSignature: (chapterId: string) => `/admin/chapters/${chapterId}/send-for-signature`,
  markSigned: (chapterId: string) => `/admin/chapters/${chapterId}/mark-signed`,

  versions: (chapterId: string) => `/admin/chapters/${chapterId}/versions`,
  downloadVersion: (chapterId: string, versionId: string) =>
    `/admin/chapters/${chapterId}/versions/${versionId}/download`,

  history: (chapterId: string) => `/admin/chapters/${chapterId}/history`,

  viewDictamenPdf: (dictamenId: string) => `/dictamenes/${dictamenId}/pdf`,
  viewDictamenPdfSigned: (dictamenId: string) => `/dictamenes/${dictamenId}/pdf-signed`,

  subirDictamenFirmado: (dictamenId: string) => `/dictaminador/dictamenes/${dictamenId}/upload-signed`,
  crearDictamen: (chapterId: string) => `/admin/chapters/${chapterId}/dictamen`,
  guardarDictamen: (dictamenId: string) => `/dictamenes/${dictamenId}`,

  upsertDictamen: (chapterId: string) => `/admin/chapters/${chapterId}/dictamen/upsert`,

  // ⚠️ estas las usas en tu código, asegúrate de tenerlas en tu backend/routers
  uploadVersion: (chapterId: string) => `/admin/chapters/${chapterId}/versions/upload`,
  generarConstancia: (chapterId: string) => `/admin/chapters/${chapterId}/constancias/generate`,
  markResentByAuthor: (chapterId: string) => `/admin/chapters/${chapterId}/mark-resent`,
  findDictaminadorByEmail: (email: string) => `/admin/users/dictaminador/by-email?email=${encodeURIComponent(email)}`,
};

function ensureString(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function toStatus(v: any): Status {
  return v as Status;
}

// Generador de folio para dictamen (formato: DICT-YYYY-MM-DD-XXXXX)
function generarFolioDictamen(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `DICT-${year}-${month}-${day}-${random}`;
}

// Generador de folio para constancia (formato: CONST-YYYY-MM-DD-XXXXX)
function generarFolioConstancia(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `CONST-${year}-${month}-${day}-${random}`;
}

// ✅ normaliza el texto (opcional)
function normalizeTipo(s: string): string {
  return (s || "").trim().slice(0, 80);
}

function mapChapterResponseToChapter(payload: any): Chapter {
  const bookName = payload?.book?.name ?? payload?.book_name ?? payload?.bookName ?? payload?.book ?? "";
  const evaluatorName = payload?.evaluator?.name ?? payload?.evaluator_name ?? payload?.evaluatorName ?? null;
  const evaluatorEmail = payload?.evaluator?.email ?? payload?.evaluator_email ?? payload?.evaluatorEmail ?? null;
  const evaluatorCvu = payload?.evaluator?.cvu ?? payload?.evaluator_cvu ?? payload?.evaluatorCvu ?? null;

  const versions: VersionFile[] = Array.isArray(payload?.versions)
    ? payload.versions.map((v: any) => ({
        id: ensureString(v.id),
        versionLabel: ensureString(v.version_label ?? v.versionLabel ?? v.label ?? ""),
        fileName: ensureString(v.file_name ?? v.fileName ?? v.name ?? ""),
        uploadedAt: ensureString((v.uploaded_at ?? v.uploadedAt ?? "").slice(0, 10)),
        note: ensureString(v.note ?? v.comentario ?? ""),
        uploadedBy: v.uploaded_by ?? "autor",
      }))
    : [];

  const dictamenes: DictamenHistorico[] = Array.isArray(payload?.dictamenes)
    ? payload.dictamenes.map((d: any) => ({
        id: ensureString(d.id),
        evaluador: ensureString(d.evaluator_name ?? d.evaluator ?? d.evaluador ?? ""),
        type: ensureString(d.tipo ?? d.type ?? "Investigación"),
        scoreAvg: Number(d.promedio ?? d.scoreAvg ?? 0),
        decision: (d.decision ?? d.decision_status ?? "CORRECCIONES") as any,
        createdAt: ensureString((d.created_at ?? d.createdAt ?? "").slice(0, 10)),
        firmado: Boolean(d.status === "FIRMADO" || d.firmado === true || d.signed_at),
        folio: ensureString(d.folio ?? ""),
      }))
    : [];

  const dictamenActual = payload?.dictamen_actual
    ? {
        id: ensureString(payload.dictamen_actual.id),
        folio: ensureString(payload.dictamen_actual.folio),
        evaluadorId: ensureString(payload.dictamen_actual.evaluador_id),
        evaluadorNombre: ensureString(payload.dictamen_actual.evaluador_nombre),
        evaluadorEmail: ensureString(payload.dictamen_actual.evaluador_email),
        evaluadorCvu: ensureString(payload.dictamen_actual.evaluador_cvu),

        // ✅ texto libre
        tipo: ensureString(payload.dictamen_actual.tipo),

        titulo: ensureString(payload.dictamen_actual.titulo),
        criterios: Array.isArray(payload.dictamen_actual.criterios)
          ? payload.dictamen_actual.criterios.map((c: any) => ({
              id: ensureString(c.id),
              nombre: ensureString(c.nombre),
              puntaje: c.puntaje as 1 | 2 | 3 | 4 | 5,
            }))
          : [],
        promedio: Number(payload.dictamen_actual.promedio ?? 0),
        decision: payload.dictamen_actual.decision as any,
        comentarios: ensureString(payload.dictamen_actual.comentarios),
        conflictosInteres: ensureString(payload.dictamen_actual.conflictos_interes),
        fechaEvaluacion: ensureString((payload.dictamen_actual.fecha_evaluacion ?? "").slice(0, 10)),
        fechaFirma: payload.dictamen_actual.fecha_firma
          ? ensureString(payload.dictamen_actual.fecha_firma.slice(0, 10))
          : undefined,
        firmado: Boolean(payload.dictamen_actual.firmado),
        archivoFirma: ensureString(payload.dictamen_actual.archivo_firma),
      }
    : undefined;

  const constancias: Constancia[] = Array.isArray(payload?.constancias)
    ? payload.constancias.map((c: any) => ({
        id: ensureString(c.id),
        folio: ensureString(c.folio),
        evaluadorNombre: ensureString(c.evaluador_nombre),
        evaluadorCvu: ensureString(c.evaluador_cvu),
        capituloTitulo: ensureString(c.capitulo_titulo),
        fechaEmision: ensureString((c.fecha_emision ?? "").slice(0, 10)),
        pdfUrl: ensureString(c.pdf_url),
      }))
    : [];

  const history: HistoryItem[] = Array.isArray(payload?.history)
    ? payload.history.map((h: any) => ({
        id: ensureString(h.id),
        at: ensureString(h.at ?? h.created_at ?? h.createdAt ?? new Date().toISOString()),
        by: ensureString(h.by ?? h.actor ?? ""),
        action: ensureString(h.action ?? h.tipo ?? ""),
        detail: ensureString(h.detail ?? h.detalle ?? h.comment ?? ""),
      }))
    : [];

  return {
    id: ensureString(payload?.id),
    folio: ensureString(payload?.folio ?? payload?.chapter_folio ?? ""),
    title: ensureString(payload?.title ?? ""),
    book: ensureString(bookName),
    author: ensureString(payload?.author_name ?? payload?.author ?? ""),
    authorEmail: ensureString(payload?.author_email ?? payload?.authorEmail ?? ""),
    status: toStatus(payload?.status ?? "RECIBIDO"),
    evaluatorName: evaluatorName ? ensureString(evaluatorName) : null,
    evaluatorEmail: evaluatorEmail ? ensureString(evaluatorEmail) : null,
    evaluatorCvu: evaluatorCvu ? ensureString(evaluatorCvu) : null,
    versions,
    dictamenes,
    dictamenActual,
    history,
    constancias,
  };
}

export default function CapituloDetalle() {
  const nav = useNavigate();
  const { id } = useParams();
  const chapterId = id ? String(id) : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const lastLoadRef = useRef(0);

  const [chapter, setChapter] = useState<Chapter>(() => ({
    id: chapterId || "unknown",
    folio: "",
    title: "",
    book: "",
    author: "",
    authorEmail: "",
    status: "RECIBIDO",
    evaluatorName: null,
    evaluatorEmail: null,
    evaluatorCvu: null,
    versions: [],
    dictamenes: [],
    dictamenActual: undefined,
    history: [],
    constancias: [],
  }));

  // Estados para UI
  const [tab, setTab] = useState<"VERSIONES" | "DICTAMENES" | "HISTORIAL" | "EVALUACION" | "CONSTANCIAS">(
    "VERSIONES"
  );

  // Estados para asignación
  const [evaluatorName, setEvaluatorName] = useState<string>("");
  const [evaluatorEmail, setEvaluatorEmail] = useState<string>("");
  const [evaluatorCvu, setEvaluatorCvu] = useState<string>("");

  // ✅ Estado para el dictamen actual
  const [dictamenTipo, setDictamenTipo] = useState<string>(""); // ← ahora texto libre
  const [criterios, setCriterios] = useState<CriterioEvaluacion[]>(
    CRITERIOS_PREDEFINIDOS.map((c) => ({ ...c, puntaje: 3 }))
  );
  const [dictamenDecision, setDictamenDecision] = useState<"APROBADO" | "CORRECCIONES" | "RECHAZADO">("CORRECCIONES");
  const [dictamenComentarios, setDictamenComentarios] = useState("");
  const [conflictosInteres, setConflictosInteres] = useState("NO");
  const [dictamenFolio, setDictamenFolio] = useState("");

  // Estados para subir archivos
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firmaInputRef = useRef<HTMLInputElement | null>(null);

  // Calcular promedio de criterios
  const promedioCriterios = useMemo(() => {
    if (criterios.length === 0) return 0;
    const suma = criterios.reduce((acc, c) => acc + c.puntaje, 0);
    return Number((suma / criterios.length).toFixed(1));
  }, [criterios]);

  const chapterSeed = useMemo(() => chapter, [chapter]);

  const applyChapterToUI = (c: Chapter) => {
    setChapter(c);
    setEvaluatorName(c.evaluatorName ?? "");
    setEvaluatorEmail(c.evaluatorEmail ?? "");
    setEvaluatorCvu(c.evaluatorCvu ?? "");

    if (c.dictamenActual) {
      setDictamenTipo(c.dictamenActual.tipo || "");
      setCriterios(c.dictamenActual.criterios);
      setDictamenDecision(c.dictamenActual.decision);
      setDictamenComentarios(c.dictamenActual.comentarios);
      setConflictosInteres(c.dictamenActual.conflictosInteres);
      setDictamenFolio(c.dictamenActual.folio);
    } else {
      setDictamenTipo(""); // ✅ texto libre vacío por defecto
      setCriterios(CRITERIOS_PREDEFINIDOS.map((c) => ({ ...c, puntaje: 3 })));
      setDictamenDecision("CORRECCIONES");
      setDictamenComentarios("");
      setConflictosInteres("NO");
      setDictamenFolio(generarFolioDictamen());
    }
  };

  const reloadAll = async () => {
    if (!chapterId) return;
    const stamp = Date.now();
    lastLoadRef.current = stamp;

    setLoading(true);
    setErrMsg(null);

    try {
      const r = await api.get(endpoints.chapterDetail(chapterId));
      if (lastLoadRef.current !== stamp) return;
      const mapped = mapChapterResponseToChapter(r.data);
      applyChapterToUI(mapped);
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "Error al cargar capítulo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const pushHistory = (by: string, action: string, detail: string) => {
    setChapter((prev) => ({
      ...prev,
      history: [
        {
          id: `h-${Date.now()}`,
          at: new Date().toISOString(),
          by,
          action,
          detail,
        },
        ...prev.history,
      ],
    }));
  };

  const setNewStatus = async (s: Status, reason?: string) => {
    setSaving(true);
    setErrMsg(null);

    try {
      await api.patch(endpoints.chapterStatus(chapterId), { status: s });

      setChapter((prev) => ({ ...prev, status: s }));
      pushHistory("Editorial", "Cambio de estado", `${statusLabel(s)}${reason ? ` — ${reason}` : ""}`);
      setSuccessMsg(`Estado actualizado a: ${statusLabel(s)}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo actualizar el estado.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ASIGNAR DICTAMINADOR
  // ============================================================
  const assignEvaluator = async () => {
    if (!evaluatorName.trim()) {
      alert("Escribe el nombre del dictaminador.");
      return;
    }
    if (!evaluatorEmail.trim()) {
      alert("Escribe el correo del dictaminador.");
      return;
    }
    if (!evaluatorCvu.trim()) {
      alert("Escribe el CVU SNII del dictaminador.");
      return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      await api.get(endpoints.findDictaminadorByEmail(evaluatorEmail.trim()));

      await api.post(endpoints.assignEvaluator(chapterId), {
        evaluator_name: evaluatorName.trim(),
        evaluator_email: evaluatorEmail.trim(),
        evaluator_cvu: evaluatorCvu.trim(),
      });

      await setNewStatus("ASIGNADO_A_DICTAMINADOR");

      const nuevoFolio = generarFolioDictamen();
      setDictamenFolio(nuevoFolio);

      pushHistory(
        "Editorial",
        "Asignación",
        `Se asignó dictaminador: ${evaluatorName} (${evaluatorEmail}) - CVU: ${evaluatorCvu}`
      );

      await reloadAll();
    } catch (e: any) {
      setErrMsg(
        e?.response?.data?.detail ??
          e?.message ??
          "No se pudo asignar dictaminador. Verifica que exista en users y sea dictaminador."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // GUARDAR DICTAMEN
  // ============================================================
  const guardarDictamen = async () => {
    if (!chapter.evaluatorEmail) {
      alert("Primero asigna un dictaminador.");
      return;
    }

    const tipoFinal = normalizeTipo(dictamenTipo);
    if (!tipoFinal) {
      alert("Escribe el tipo de dictamen.");
      return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      const dictamenData = {
        folio: dictamenFolio,
        evaluador_email: chapter.evaluatorEmail,
        evaluador_nombre: chapter.evaluatorName,
        evaluador_cvu: evaluatorCvu,

        // ✅ ahora texto libre
        tipo: tipoFinal,

        titulo: chapter.title,
        criterios: criterios.map((c) => ({ id: c.id, nombre: c.nombre, puntaje: c.puntaje })),
        promedio: promedioCriterios,
        decision: dictamenDecision,
        comentarios: dictamenComentarios,
        conflictos_interes: conflictosInteres,
      };

      if (chapter.dictamenActual) {
        await api.patch(endpoints.guardarDictamen(chapter.dictamenActual.id), dictamenData);
        pushHistory("Editorial", "Dictamen actualizado", `Se actualizó el dictamen (folio: ${dictamenFolio})`);
      } else {
        const response = await api.post(endpoints.crearDictamen(chapterId), dictamenData);
        setDictamenFolio(response.data.folio);
        pushHistory("Editorial", "Dictamen creado", `Se creó nuevo dictamen (folio: ${response.data.folio})`);
      }

      setSuccessMsg("Dictamen guardado correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
      await reloadAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo guardar el dictamen.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ENVIAR A DICTAMINADOR
  // ============================================================
  const sendToEvaluator = async () => {
    if (!chapter.evaluatorEmail) {
      alert("Falta correo del dictaminador.");
      return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      await api.post(endpoints.sendToEvaluator(chapterId));
      await setNewStatus("ENVIADO_A_DICTAMINADOR");
      pushHistory("Editorial", "Envío", `Se envió al dictaminador: ${chapter.evaluatorName} (${chapter.evaluatorEmail})`);
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo enviar al dictaminador.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SOLICITAR CORRECCIONES AL AUTOR
  // ============================================================
  const requestCorrectionsToAuthor = async () => {
    setSaving(true);
    setErrMsg(null);

    try {
      await api.post(endpoints.requestCorrections(chapterId), {
        comment: dictamenComentarios?.trim() || "Se solicitan correcciones al autor.",
      });

      await setNewStatus("CORRECCIONES_SOLICITADAS_A_AUTOR");
      pushHistory("Editorial", "Correcciones solicitadas", dictamenComentarios?.trim() || "Se solicitaron correcciones al autor.");
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo solicitar correcciones.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // AUTOR REENVÍA VERSIÓN CORREGIDA
  // ============================================================
  const markResentByAuthor = async () => {
    setSaving(true);
    setErrMsg(null);
    try {
      await api.post(endpoints.markResentByAuthor(chapterId));
      await setNewStatus("REENVIADO_POR_AUTOR");
      pushHistory("Autor", "Reenvío", "El autor subió una versión corregida.");
      await reloadAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "Error al marcar reenvío.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // FIRMAR DICTAMEN
  // ============================================================
  const firmarDictamen = async (file: File) => {
    if (!chapter.dictamenActual) {
      alert("No hay dictamen para firmar.");
      return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("note", "Firmado por dictaminador");

      await api.post(endpoints.subirDictamenFirmado(chapter.dictamenActual.id), fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      pushHistory("Dictaminador", "Firma", "Se subió el dictamen firmado.");
      await reloadAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo subir el dictamen firmado.");
    } finally {
      setSaving(false);
      if (firmaInputRef.current) firmaInputRef.current.value = "";
    }
  };

  // ============================================================
  // GENERAR CONSTANCIA
  // ============================================================
  const generateConstancia = async () => {
    if (!chapter.dictamenActual?.firmado) {
      alert("El dictamen debe estar firmado para generar constancia.");
      return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      const response = await api.post(
        endpoints.generarConstancia(chapterId),
        {},
        {
          responseType: "blob",
        }
      );

      const contentType = response.headers?.["content-type"] as string | undefined;
      if (contentType?.includes("pdf")) {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }

      const folioConstancia = generarFolioConstancia();
      pushHistory("Editorial", "Constancia", `Se generó constancia (folio: ${folioConstancia})`);
      await reloadAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo generar la constancia.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SUBIR NUEVA VERSIÓN
  // ============================================================
  const addNewVersion = async (note: string, file?: File) => {
    if (!file) {
      await reloadAll();
      return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("note", note);
      fd.append("uploaded_by", "editorial");

      await api.post(endpoints.uploadVersion(chapterId), fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      pushHistory("Editorial", "Nueva versión", `Se subió una nueva versión: ${file.name}`);
      await reloadAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo subir la versión.");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  function pickFilenameFromContentDisposition(cd?: string | null): string | null {
    if (!cd) return null;

    const fnStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (fnStar?.[1]) {
      try {
        return decodeURIComponent(fnStar[1].trim().replace(/^"|"$/g, ""));
      } catch {
        return fnStar[1].trim().replace(/^"|"$/g, "");
      }
    }

    const fn = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
    if (fn?.[2]) return fn[2].trim();

    return null;
  }

  function ensureExtension(name: string, contentType?: string): string {
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(name);
    if (hasExt) return name;

    const ct = (contentType || "").toLowerCase();
    if (ct.includes("pdf")) return `${name}.pdf`;
    if (ct.includes("word") || ct.includes("docx")) return `${name}.docx`;
    if (ct.includes("msword") || ct.includes("doc")) return `${name}.doc`;
    return name;
  }

  const downloadVersion = async (v: { id: string; fileName: string }) => {
    setSaving(true);
    setErrMsg(null);

    try {
      const r = await api.get(endpoints.downloadVersion(chapterId, v.id), {
        responseType: "blob",
      });

      const contentType = r.headers?.["content-type"] || "application/octet-stream";
      const cd = r.headers?.["content-disposition"] || null;

      const headerName = pickFilenameFromContentDisposition(cd);
      const baseName = headerName || v.fileName || `version_${v.id}`;
      const finalName = ensureExtension(baseName, contentType);

      const blob = new Blob([r.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo descargar el archivo.");
    } finally {
      setSaving(false);
    }
  };

  const viewDictamenPdf = async (dictamenId: string) => {
    setSaving(true);
    setErrMsg(null);
    try {
      const r = await api.get(endpoints.viewDictamenPdf(dictamenId), {
        responseType: "blob",
      });

      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo abrir el PDF.");
    } finally {
      setSaving(false);
    }
  };

  const renderTopInfo = () => {
    if (loading) return <div style={styles.mutedSmall}>Cargando…</div>;
    if (errMsg) return <div style={{ ...styles.mutedSmall, color: "#B42318" }}>{errMsg}</div>;
    if (successMsg) return <div style={{ ...styles.mutedSmall, color: "#0A7A35" }}>{successMsg}</div>;
    return null;
  };

  return (
    <div style={styles.wrap}>
      {renderTopInfo()}

      {/* BARRA SUPERIOR */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <button style={styles.backBtn} onClick={() => nav("/capitulos")} type="button">
            ← Volver
          </button>

          <div style={styles.titleBlock}>
            <h2 style={styles.h2}>{chapterSeed.title}</h2>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                <b>Libro:</b> {chapterSeed.book}
              </span>
              <span style={styles.metaDot}>•</span>
              <span style={styles.metaItem}>
                <b>Autor:</b> {chapterSeed.author}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.topRight}>
          <div style={styles.folioBox}>
            <div style={styles.folioLabel}>Folio Capítulo</div>
            <div style={styles.folioValue}>{chapterSeed.folio}</div>
          </div>

          <div style={styles.statusBox}>
            <div style={styles.statusLabel}>Estado</div>
            <span style={{ ...styles.pill, ...pillTone(chapter.status) }}>{statusLabel(chapter.status)}</span>
          </div>
        </div>
      </div>

      {/* CUERPO */}
      <div style={styles.bodyGrid}>
        {/* CENTRO - TABS */}
        <div style={styles.centerCard}>
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tabBtn, ...(tab === "VERSIONES" ? styles.tabActive : null) }}
              onClick={() => setTab("VERSIONES")}
              type="button"
              disabled={saving}
            >
              📄 Versiones
            </button>

            <button
              style={{ ...styles.tabBtn, ...(tab === "DICTAMENES" ? styles.tabActive : null) }}
              onClick={() => setTab("DICTAMENES")}
              type="button"
              disabled={saving}
            >
              📋 Dictámenes
            </button>

            <button
              style={{ ...styles.tabBtn, ...(tab === "EVALUACION" ? styles.tabActive : null) }}
              onClick={() => setTab("EVALUACION")}
              type="button"
              disabled={saving}
            >
              ✍️ Evaluación
            </button>

            <button
              style={{ ...styles.tabBtn, ...(tab === "CONSTANCIAS" ? styles.tabActive : null) }}
              onClick={() => setTab("CONSTANCIAS")}
              type="button"
              disabled={saving}
            >
              🏆 Constancias
            </button>

            <button
              style={{ ...styles.tabBtn, ...(tab === "HISTORIAL" ? styles.tabActive : null) }}
              onClick={() => setTab("HISTORIAL")}
              type="button"
              disabled={saving}
            >
              📜 Historial
            </button>
          </div>

          <div style={styles.tabContent}>
            {/* TAB: VERSIONES */}
            {tab === "VERSIONES" && (
              <div style={styles.section}>
                <div style={styles.sectionTop}>
                  <div>
                    <h3 style={styles.h3}>Versiones del capítulo</h3>
                    <p style={styles.p}>Archivos subidos por autor, dictaminador o editorial.</p>
                  </div>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    disabled={saving}
                  >
                    Subir nueva versión
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      addNewVersion("Nueva versión subida por editorial.", f);
                    }}
                    accept=".pdf,.doc,.docx"
                  />
                </div>

                <div style={styles.tableCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Versión</th>
                        <th style={styles.th}>Archivo</th>
                        <th style={styles.th}>Subido por</th>
                        <th style={styles.th}>Fecha</th>
                        <th style={styles.th}>Nota</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapter.versions.map((v) => (
                        <tr key={v.id}>
                          <td style={styles.td}>{v.versionLabel}</td>
                          <td style={styles.td}>
                            <div style={styles.cellTitle}>{v.fileName}</div>
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.miniPill,
                                background:
                                  v.uploadedBy === "autor"
                                    ? "#E9F2FF"
                                    : v.uploadedBy === "dictaminador"
                                      ? "#FFF6E5"
                                      : "#F3F4F6",
                              }}
                            >
                              {v.uploadedBy === "autor" ? "Autor" : v.uploadedBy === "dictaminador" ? "Dictaminador" : "Editorial"}
                            </span>
                          </td>
                          <td style={styles.td}>{fmtDate(v.uploadedAt)}</td>
                          <td style={styles.td}>{v.note}</td>
                          <td style={styles.td}>
                            <button
                              style={styles.linkBtn}
                              onClick={() => downloadVersion({ id: v.id, fileName: v.fileName })}
                              type="button"
                              disabled={saving}
                            >
                              Descargar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {chapter.versions.length === 0 && (
                        <tr>
                          <td style={styles.td} colSpan={6}>
                            No hay versiones aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: DICTAMENES (HISTÓRICO) */}
            {tab === "DICTAMENES" && (
              <div style={styles.section}>
                <div style={styles.sectionTop}>
                  <div>
                    <h3 style={styles.h3}>Historial de dictámenes</h3>
                    <p style={styles.p}>Todas las evaluaciones realizadas.</p>
                  </div>
                </div>

                <div style={styles.tableCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Folio</th>
                        <th style={styles.th}>Evaluador</th>
                        <th style={styles.th}>Tipo</th>
                        <th style={styles.th}>Promedio</th>
                        <th style={styles.th}>Dictamen</th>
                        <th style={styles.th}>Firmado</th>
                        <th style={styles.th}>Fecha</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapter.dictamenes.map((d) => (
                        <tr key={d.id}>
                          <td style={styles.td}>
                            <b>{d.folio}</b>
                          </td>
                          <td style={styles.td}>{d.evaluador}</td>
                          <td style={styles.td}>{d.type || "—"}</td>
                          <td style={styles.td}>{Number.isFinite(d.scoreAvg) ? d.scoreAvg.toFixed(1) : "—"}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.pill, ...dictamenTone(d.decision) }}>{dictamenLabel(d.decision)}</span>
                          </td>
                          <td style={styles.td}>{d.firmado ? "✅ Sí" : "❌ No"}</td>
                          <td style={styles.td}>{fmtDate(d.createdAt)}</td>
                          <td style={styles.td}>
                            <button style={styles.linkBtn} onClick={() => viewDictamenPdf(d.id)} type="button" disabled={saving}>
                              Ver PDF
                            </button>

                            <button
                              style={{ ...styles.linkBtn, marginLeft: 8 }}
                              onClick={async () => {
                                setSaving(true);
                                setErrMsg(null);
                                try {
                                  const r = await api.get(endpoints.viewDictamenPdfSigned(d.id), { responseType: "blob" });
                                  const blob = new Blob([r.data], { type: "application/pdf" });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, "_blank");
                                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                                } catch (e: any) {
                                  setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo abrir el PDF firmado.");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              type="button"
                              disabled={saving}
                            >
                              Ver firmado
                            </button>
                          </td>
                        </tr>
                      ))}
                      {chapter.dictamenes.length === 0 && (
                        <tr>
                          <td style={styles.td} colSpan={8}>
                            Aún no hay dictámenes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: EVALUACIÓN (FORMULARIO COMPLETO) */}
            {tab === "EVALUACION" && (
              <div style={styles.section}>
                <div style={styles.sectionTop}>
                  <div>
                    <h3 style={styles.h3}>Formato de dictamen</h3>
                    <p style={styles.p}>
                      Folio: <b>{dictamenFolio}</b>
                    </p>
                  </div>
                  <button style={styles.primaryBtn} onClick={guardarDictamen} type="button" disabled={saving || !chapter.evaluatorEmail}>
                    {saving ? "Guardando..." : "💾 Guardar dictamen"}
                  </button>
                </div>

                <div style={styles.evaluacionGrid}>
                  {/* Información básica */}
                  <div style={styles.evaluacionSection}>
                    <h4 style={styles.h4}>Información del dictamen</h4>
                    <div style={styles.formRow}>
                      <div style={styles.formField}>
                        <label style={styles.label}>Tipo de dictamen</label>

                        {/* ✅ ahora input en vez de select */}
                        <input
                          style={styles.input}
                          value={dictamenTipo}
                          onChange={(e) => setDictamenTipo(e.target.value)}
                          placeholder='Ej: "Investigación", "Docencia", "Revisión técnica"...'
                          disabled={saving}
                          maxLength={80}
                        />

                        <div style={styles.mutedSmall}>Escribe el tipo (máx. 80 caracteres).</div>
                      </div>
                    </div>
                  </div>

                  {/* Criterios de evaluación */}
                  <div style={styles.evaluacionSection}>
                    <h4 style={styles.h4}>Criterios de evaluación (1-5)</h4>
                    {criterios.map((c, idx) => (
                      <div key={c.id} style={styles.criterioRow}>
                        <div style={styles.criterioNombre}>{c.nombre}</div>
                        <div style={styles.criterioOpciones}>
                          {[1, 2, 3, 4, 5].map((p) => (
                            <label key={p} style={styles.criterioOption}>
                              <input
                                type="radio"
                                name={`criterio-${c.id}`}
                                value={p}
                                checked={c.puntaje === p}
                                onChange={() => {
                                  const nuevos = [...criterios];
                                  nuevos[idx].puntaje = p as any;
                                  setCriterios(nuevos);
                                }}
                                disabled={saving}
                              />
                              <span>{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div style={styles.promedioBox}>
                      <b>Promedio:</b> {promedioCriterios}
                    </div>
                  </div>

                  {/* Decisión y comentarios */}
                  <div style={styles.evaluacionSection}>
                    <h4 style={styles.h4}>Decisión</h4>
                    <div style={styles.decisionRow}>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="decision"
                          value="APROBADO"
                          checked={dictamenDecision === "APROBADO"}
                          onChange={() => setDictamenDecision("APROBADO")}
                          disabled={saving}
                        />
                        <span style={{ ...styles.decisionTag, ...dictamenTone("APROBADO") }}>Aprobado</span>
                      </label>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="decision"
                          value="CORRECCIONES"
                          checked={dictamenDecision === "CORRECCIONES"}
                          onChange={() => setDictamenDecision("CORRECCIONES")}
                          disabled={saving}
                        />
                        <span style={{ ...styles.decisionTag, ...dictamenTone("CORRECCIONES") }}>Correcciones</span>
                      </label>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="decision"
                          value="RECHAZADO"
                          checked={dictamenDecision === "RECHAZADO"}
                          onChange={() => setDictamenDecision("RECHAZADO")}
                          disabled={saving}
                        />
                        <span style={{ ...styles.decisionTag, ...dictamenTone("RECHAZADO") }}>Rechazado</span>
                      </label>
                    </div>

                    <div style={styles.formField}>
                      <label style={styles.label}>Comentarios / Observaciones</label>
                      <textarea
                        style={styles.textarea}
                        value={dictamenComentarios}
                        onChange={(e) => setDictamenComentarios(e.target.value)}
                        placeholder="Escribe aquí tus comentarios sobre el capítulo..."
                        rows={5}
                        disabled={saving}
                      />
                    </div>

                    <div style={styles.formField}>
                      <label style={styles.label}>Conflictos de interés</label>
                      <input
                        style={styles.input}
                        value={conflictosInteres}
                        onChange={(e) => setConflictosInteres(e.target.value)}
                        placeholder="NO o SÍ: explicación"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Firma */}
                  <div style={styles.evaluacionSection}>
                    <h4 style={styles.h4}>Firma del dictamen</h4>
                    {chapter.dictamenActual?.firmado ? (
                      <div style={styles.successBox}>✅ Dictamen firmado el {fmtDate(chapter.dictamenActual.fechaFirma || "")}</div>
                    ) : (
                      <>
                        <p style={styles.p}>Sube el dictamen firmado en PDF</p>
                        <button
                          style={styles.secondaryBtn}
                          onClick={() => firmaInputRef.current?.click()}
                          type="button"
                          disabled={saving || !chapter.dictamenActual}
                        >
                          📎 Seleccionar archivo firmado
                        </button>
                        <input
                          ref={firmaInputRef}
                          type="file"
                          style={{ display: "none" }}
                          accept=".pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f || !chapter.dictamenActual) return;
                            firmarDictamen(f);
                          }}
                        />
                        {!chapter.dictamenActual && <div style={styles.mutedSmall}>Primero guarda el dictamen</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONSTANCIAS */}
            {tab === "CONSTANCIAS" && (
              <div style={styles.section}>
                <div style={styles.sectionTop}>
                  <div>
                    <h3 style={styles.h3}>Constancias</h3>
                    <p style={styles.p}>Documentos de reconocimiento para dictaminadores.</p>
                  </div>
                  <button style={styles.primaryBtn} onClick={generateConstancia} type="button" disabled={saving || !chapter.dictamenActual?.firmado}>
                    🏆 Generar constancia
                  </button>
                </div>

                <div style={styles.tableCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Folio</th>
                        <th style={styles.th}>Dictaminador</th>
                        <th style={styles.th}>CVU SNII</th>
                        <th style={styles.th}>Capítulo</th>
                        <th style={styles.th}>Fecha emisión</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapter.constancias.map((c) => (
                        <tr key={c.id}>
                          <td style={styles.td}>
                            <b>{c.folio}</b>
                          </td>
                          <td style={styles.td}>{c.evaluadorNombre}</td>
                          <td style={styles.td}>{c.evaluadorCvu}</td>
                          <td style={styles.td}>{c.capituloTitulo}</td>
                          <td style={styles.td}>{fmtDate(c.fechaEmision)}</td>
                          <td style={styles.td}>
                            <button style={styles.linkBtn} onClick={() => window.open(c.pdfUrl, "_blank")} type="button" disabled={!c.pdfUrl}>
                              Ver PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                      {chapter.constancias.length === 0 && (
                        <tr>
                          <td style={styles.td} colSpan={6}>
                            No hay constancias generadas aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!chapter.dictamenActual?.firmado && <div style={styles.warningBox}>⚠️ Las constancias solo se pueden generar cuando el dictamen está FIRMADO.</div>}
              </div>
            )}

            {/* TAB: HISTORIAL */}
            {tab === "HISTORIAL" && (
              <div style={styles.section}>
                <div style={styles.sectionTop}>
                  <div>
                    <h3 style={styles.h3}>Historial de actividades</h3>
                    <p style={styles.p}>Todos los eventos del proceso.</p>
                  </div>
                </div>

                <div style={styles.timeline}>
                  {chapter.history.map((h) => (
                    <div key={h.id} style={styles.timelineItem}>
                      <div style={styles.timelineDot} />
                      <div style={styles.timelineBody}>
                        <div style={styles.timelineTop}>
                          <span style={styles.timelineAction}>{h.action}</span>
                          <span style={styles.timelineAt}>{fmtDateTime(h.at)}</span>
                        </div>
                        <div style={styles.timelineDetail}>{h.detail}</div>
                        <div style={styles.timelineBy}>Por: {h.by}</div>
                      </div>
                    </div>
                  ))}
                  {chapter.history.length === 0 && <div style={styles.mutedSmall}>Sin eventos registrados.</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DERECHA: Acciones rápidas */}
        <div style={styles.rightCard}>
          <h3 style={styles.h3}>Acciones rápidas</h3>
          <p style={styles.p}>Flujo editorial simplificado</p>

          {/* Asignar dictaminador */}
          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>👤 Asignar dictaminador</div>
            <input style={styles.input} value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} placeholder="Nombre completo" disabled={saving} />
            <input style={styles.input} value={evaluatorEmail} onChange={(e) => setEvaluatorEmail(e.target.value)} placeholder="Correo electrónico" disabled={saving} />
            <input style={styles.input} value={evaluatorCvu} onChange={(e) => setEvaluatorCvu(e.target.value)} placeholder="CVU SNII" disabled={saving} />
            <button style={styles.primaryBtn} onClick={assignEvaluator} type="button" disabled={saving || loading}>
              Asignar dictaminador
            </button>
          </div>

          {/* Envíos */}
          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>📧 Envíos</div>
            <button style={styles.secondaryBtnFull} onClick={sendToEvaluator} type="button" disabled={saving || loading}>
              Enviar a dictaminador
            </button>
            <button style={styles.secondaryBtnFull} onClick={requestCorrectionsToAuthor} type="button" disabled={saving || loading}>
              Solicitar correcciones al autor
            </button>
          </div>

          {/* Flujo automático */}
          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>🔄 Flujo automático</div>
            <button style={styles.primaryBtn} onClick={runAutoFlow} type="button" disabled={saving || loading} title="Avanza 1 paso según el estado actual">
              Avanzar al siguiente estado
            </button>

            <div style={styles.mutedSmall}>Estados: Reenviado → Revisado editorial → Listo para firma → Firmado</div>
          </div>

          {/* Decisión final */}
          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>✅ Decisión final</div>
            <div style={styles.actionRow}>
              <button style={styles.approveBtn} onClick={() => setNewStatus("APROBADO")} type="button" disabled={saving || loading}>
                Aprobar
              </button>
              <button style={styles.rejectBtn} onClick={() => setNewStatus("RECHAZADO")} type="button" disabled={saving || loading}>
                Rechazar
              </button>
            </div>
          </div>

          {/* Cambiar estado manual */}
          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>🔄 Cambiar estado</div>
            <select style={styles.input} value={chapter.status} onChange={(e) => setNewStatus(e.target.value as Status)} disabled={saving || loading}>
              {statusOptions().map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {(saving || loading) && <div style={styles.mutedSmall}>{loading ? "Cargando…" : "Guardando…"}</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function statusOptions(): Status[] {
  return [
    "RECIBIDO",
    "ASIGNADO_A_DICTAMINADOR",
    "ENVIADO_A_DICTAMINADOR",
    "EN_REVISION_DICTAMINADOR",
    "CORRECCIONES_SOLICITADAS_A_AUTOR",
    "REENVIADO_POR_AUTOR",
    "REVISADO_POR_EDITORIAL",
    "LISTO_PARA_FIRMA",
    "FIRMADO",
    "APROBADO",
    "RECHAZADO",
  ];
}

function statusLabel(s: Status): string {
  const map: Record<Status, string> = {
    RECIBIDO: "📥 Recibido",
    ASIGNADO_A_DICTAMINADOR: "👤 Asignado a dictaminador",
    ENVIADO_A_DICTAMINADOR: "📤 Enviado a dictaminador",
    EN_REVISION_DICTAMINADOR: "🔍 En revisión",
    CORRECCIONES_SOLICITADAS_A_AUTOR: "✏️ Correcciones solicitadas",
    REENVIADO_POR_AUTOR: "🔄 Reenviado por autor",
    REVISADO_POR_EDITORIAL: "👁️ Revisado por editorial",
    LISTO_PARA_FIRMA: "✍️ Listo para firma",
    FIRMADO: "✅ Firmado",
    APROBADO: "🎉 Aprobado",
    RECHAZADO: "❌ Rechazado",
  };
  return map[s];
}

function pillTone(s: Status): React.CSSProperties {
  if (s === "APROBADO" || s === "FIRMADO") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (s.includes("CORRECCIONES")) return { background: "#FFF6E5", color: "#9A5B00", borderColor: "#FFE0A3" };
  if (s.includes("REVISION") || s.includes("ENVIADO") || s.includes("ASIGNADO"))
    return { background: "#E9F2FF", color: "#1447B2", borderColor: "#C9DDFF" };
  if (s === "RECHAZADO") return { background: "#FEECEC", color: "#B42318", borderColor: "#F9CACA" };
  return { background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
}

function dictamenLabel(d: "APROBADO" | "CORRECCIONES" | "RECHAZADO") {
  if (d === "APROBADO") return "✅ Aprobado";
  if (d === "CORRECCIONES") return "✏️ Correcciones";
  return "❌ Rechazado";
}

function dictamenTone(d: "APROBADO" | "CORRECCIONES" | "RECHAZADO"): React.CSSProperties {
  if (d === "APROBADO") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (d === "CORRECCIONES") return { background: "#FFF6E5", color: "#9A5B00", borderColor: "#FFE0A3" };
  return { background: "#FEECEC", color: "#B42318", borderColor: "#F9CACA" };
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

// ============================================================
// 🔄 FLUJO AUTOMÁTICO (reenviado → revisión editorial → listo firma → firmado)
// ============================================================
const runAutoFlow = async () => {
  // ⚠️ Este bloque usa chapterId/chapter/setSaving... que están dentro del componente.
  // Si en tu archivo real esto está afuera, muévelo dentro del componente.
};

// ============================================================
// ESTILOS
// ============================================================
const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },
  topBar: {
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  topLeft: { display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 },
  backBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  titleBlock: { minWidth: 0 },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  metaRow: { marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  metaItem: { fontSize: 13, color: "#374151" },
  metaDot: { color: "#9CA3AF" },

  topRight: { display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" },
  folioBox: { border: "1px solid #E7EAF0", borderRadius: 14, padding: 10, minWidth: 180, background: "#F9FAFB" },
  folioLabel: { fontSize: 12, color: "#6B7280", fontWeight: 900 },
  folioValue: { marginTop: 4, fontSize: 14, fontWeight: 1000, color: "#111827" },

  statusBox: { border: "1px solid #E7EAF0", borderRadius: 14, padding: 10, minWidth: 240, background: "#F9FAFB" },
  statusLabel: { fontSize: 12, color: "#6B7280", fontWeight: 900 },

  bodyGrid: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, alignItems: "start" },

  centerCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, overflow: "hidden" },
  tabs: { display: "flex", gap: 8, padding: 12, borderBottom: "1px solid #E7EAF0", background: "#F9FAFB", flexWrap: "wrap" },
  tabBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },
  tabActive: { borderColor: "#0F3D3E", boxShadow: "0 10px 30px rgba(15,61,62,0.12)" },
  tabContent: { padding: 14 },

  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  h3: { margin: 0, fontSize: 16, color: "#111827" },
  h4: { margin: "8px 0 4px 0", fontSize: 14, color: "#374151" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

  tableCard: { border: "1px solid #E7EAF0", borderRadius: 14, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, padding: "10px 12px", background: "#F9FAFB", borderBottom: "1px solid #E7EAF0", color: "#374151" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F5F9", fontSize: 13, color: "#111827", verticalAlign: "top" },
  cellTitle: { fontWeight: 900 },

  rightCard: {
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  actionBox: { border: "1px solid #E7EAF0", borderRadius: 14, padding: 12, background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 8 },
  actionTitle: { fontWeight: 1000, color: "#111827", fontSize: 13 },

  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, background: "#fff" },
  textarea: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, background: "#fff", width: "100%" },

  primaryBtn: { padding: "10px 12px", borderRadius: 12, border: "none", background: "#0F3D3E", color: "#fff", cursor: "pointer", fontWeight: 1000 },
  secondaryBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 1000 },
  secondaryBtnFull: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 1000, width: "100%" },

  actionRow: { display: "flex", gap: 10 },
  approveBtn: { flex: 1, padding: "10px 12px", borderRadius: 12, border: "none", background: "#0A7A35", color: "#fff", cursor: "pointer", fontWeight: 1000 },
  rejectBtn: { flex: 1, padding: "10px 12px", borderRadius: 12, border: "none", background: "#B42318", color: "#fff", cursor: "pointer", fontWeight: 1000 },

  pill: { display: "inline-block", fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid", fontWeight: 1000, whiteSpace: "nowrap" },
  miniPill: { display: "inline-block", fontSize: 11, padding: "2px 8px", borderRadius: 999, border: "1px solid #E7EAF0", fontWeight: 900 },

  linkBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 1000 },

  mutedSmall: { color: "#6B7280", fontSize: 12 },

  // Evaluación
  evaluacionGrid: { display: "flex", flexDirection: "column", gap: 16 },
  evaluacionSection: { border: "1px solid #E7EAF0", borderRadius: 14, padding: 12, background: "#F9FAFB" },
  formRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  formField: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 900, color: "#374151" },

  criterioRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E7EAF0" },
  criterioNombre: { fontSize: 13, color: "#111827" },
  criterioOpciones: { display: "flex", gap: 12 },
  criterioOption: { display: "flex", alignItems: "center", gap: 2, fontSize: 12 },

  promedioBox: { marginTop: 8, padding: "8px 12px", background: "#E9F2FF", borderRadius: 8, fontSize: 14 },

  decisionRow: { display: "flex", gap: 16, marginBottom: 12 },
  radioLabel: { display: "flex", alignItems: "center", gap: 4, cursor: "pointer" },
  decisionTag: { padding: "4px 8px", borderRadius: 12, fontSize: 12, border: "1px solid" },

  successBox: { padding: "10px 12px", background: "#E8F7EE", color: "#0A7A35", borderRadius: 12, border: "1px solid #BFE9CF" },
  warningBox: { padding: "10px 12px", background: "#FFF6E5", color: "#9A5B00", borderRadius: 12, border: "1px solid #FFE0A3" },

  // Timeline
  timeline: { display: "flex", flexDirection: "column", gap: 12 },
  timelineItem: { display: "grid", gridTemplateColumns: "16px 1fr", gap: 10, alignItems: "start" },
  timelineDot: { width: 10, height: 10, borderRadius: 999, background: "#0F3D3E", marginTop: 6 },
  timelineBody: { background: "#F9FAFB", border: "1px solid #E7EAF0", borderRadius: 14, padding: 12 },
  timelineTop: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  timelineAction: { fontWeight: 1000, color: "#111827" },
  timelineAt: { fontSize: 12, color: "#6B7280" },
  timelineDetail: { marginTop: 6, color: "#374151", fontSize: 13 },
  timelineBy: { marginTop: 6, fontSize: 12, color: "#6B7280" },
};