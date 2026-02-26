import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import styles from './CapituloDetalle.module.css';

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
  tipo: string;
  titulo: string;
  criterios: CriterioEvaluacion[];
  promedio: number;
  decision: "APROBADO" | "CORRECCIONES" | "RECHAZADO";
  comentarios: string;
  conflictosInteres: string;
  fechaEvaluacion: string;
  fechaFirma?: string;
  firmado: boolean;
  archivoFirma?: string;
};

type DictamenHistorico = {
  id: string;
  evaluador: string;
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
  evaluatorCvu: string | null;
  versions: VersionFile[];
  dictamenes: DictamenHistorico[];
  dictamenActual?: DictamenCompleto;
  history: HistoryItem[];
  constancias: Constancia[];
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
  uploadVersion: (chapterId: string) => `/admin/chapters/${chapterId}/versions/upload`,
  generarConstancia: (chapterId: string) => `/admin/chapters/${chapterId}/constancias/generate`,
  markResentByAuthor: (chapterId: string) => `/admin/chapters/${chapterId}/mark-resent`,
  findDictaminadorByEmail: (email: string) =>
    `/admin/users/dictaminador/by-email?email=${encodeURIComponent(email)}`,
  // ✅ NUEVO: evaluación (añadido por tu compañera)
  upsertEvaluacion: (chapterId: string) => `/admin/chapters/${chapterId}/evaluacion/upsert`,
};

function ensureString(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function toStatus(v: any): Status {
  return v as Status;
}

// Generador de folio para dictamen
function generarFolioDictamen(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `DICT-${year}-${month}-${day}-${random}`;
}

// Generador de folio para constancia
function generarFolioConstancia(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `CONST-${year}-${month}-${day}-${random}`;
}

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

// ✅ FUNCIONES PARA OBTENER CLASES CSS (agregadas por ti)
function getPillClass(status: Status): string {
  const baseClass = styles.pill;
  
  if (status === "APROBADO" || status === "FIRMADO") {
    return `${baseClass} ${styles.pillApproved}`;
  }
  if (status.includes("CORRECCIONES")) {
    return `${baseClass} ${styles.pillCorrections}`;
  }
  if (status.includes("REVISION") || status.includes("ENVIADO") || status.includes("ASIGNADO")) {
    return `${baseClass} ${styles.pillRevision}`;
  }
  if (status === "RECHAZADO") {
    return `${baseClass} ${styles.pillRejected}`;
  }
  return `${baseClass} ${styles.pillDefault}`;
}

function getDictamenPillClass(decision: "APROBADO" | "CORRECCIONES" | "RECHAZADO"): string {
  const baseClass = styles.pill;
  
  if (decision === "APROBADO") {
    return `${baseClass} ${styles.pillApproved}`;
  }
  if (decision === "CORRECCIONES") {
    return `${baseClass} ${styles.pillCorrections}`;
  }
  return `${baseClass} ${styles.pillRejected}`;
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

  const [tab, setTab] = useState<"VERSIONES" | "DICTAMENES" | "HISTORIAL" | "EVALUACION" | "CONSTANCIAS">(
    "VERSIONES"
  );

  // Estados para asignación
  const [evaluatorName, setEvaluatorName] = useState<string>("");
  const [evaluatorEmail, setEvaluatorEmail] = useState<string>("");
  const [evaluatorCvu, setEvaluatorCvu] = useState<string>("");

  // ============================
  // ✅ EVALUACIÓN (nuevo) - AGREGADO POR TU COMPAÑERA (NO BORRAR)
  // ============================
  const [evalTipo, setEvalTipo] = useState<string>("");
  const [evalCriterios, setEvalCriterios] = useState<CriterioEvaluacion[]>(
    CRITERIOS_PREDEFINIDOS.map((c) => ({ ...c, puntaje: 3 }))
  );
  const [evalDecision, setEvalDecision] = useState<"APROBADO" | "CORRECCIONES" | "RECHAZADO">("CORRECCIONES");
  const [evalComentarios, setEvalComentarios] = useState<string>("");
  const [evalConflictosInteres, setEvalConflictosInteres] = useState<string>("NO");

  const promedioEvaluacion = useMemo(() => {
    if (evalCriterios.length === 0) return 0;
    const suma = evalCriterios.reduce((acc, c) => acc + c.puntaje, 0);
    return Number((suma / evalCriterios.length).toFixed(1));
  }, [evalCriterios]);

  // ✅ Estado para el dictamen actual (tuyo)
  const [dictamenTipo, setDictamenTipo] = useState<string>("");
  const [criterios, setCriterios] = useState<CriterioEvaluacion[]>(
    CRITERIOS_PREDEFINIDOS.map((c) => ({ ...c, puntaje: 3 }))
  );
  const [dictamenDecision, setDictamenDecision] = useState<"APROBADO" | "CORRECCIONES" | "RECHAZADO">("CORRECCIONES");
  const [dictamenComentarios, setDictamenComentarios] = useState("");
  const [conflictosInteres, setConflictosInteres] = useState("NO");
  const [dictamenFolio, setDictamenFolio] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firmaInputRef = useRef<HTMLInputElement | null>(null);

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

    // TU PARTE: dictamenActual
    if (c.dictamenActual) {
      setDictamenTipo(c.dictamenActual.tipo || "");
      setCriterios(c.dictamenActual.criterios);
      setDictamenDecision(c.dictamenActual.decision);
      setDictamenComentarios(c.dictamenActual.comentarios);
      setConflictosInteres(c.dictamenActual.conflictosInteres);
      setDictamenFolio(c.dictamenActual.folio);
    } else {
      setDictamenTipo("");
      setCriterios(CRITERIOS_PREDEFINIDOS.map((c) => ({ ...c, puntaje: 3 })));
      setDictamenDecision("CORRECCIONES");
      setDictamenComentarios("");
      setConflictosInteres("NO");
      setDictamenFolio(generarFolioDictamen());
    }

    // ✅ PARTE DE TU COMPAÑERA: Precarga EVALUACIÓN desde backend si existe
    const src = (c as any).evaluacionActual ?? (c as any).dictamenActual ?? null;

    if (src) {
      setEvalTipo(src.tipo || "");
      setEvalCriterios(
        Array.isArray(src.criterios) && src.criterios.length
          ? src.criterios
          : CRITERIOS_PREDEFINIDOS.map((x) => ({ ...x, puntaje: 3 }))
      );
      setEvalDecision(src.decision || "CORRECCIONES");
      setEvalComentarios(src.comentarios || "");
      setEvalConflictosInteres(src.conflictosInteres || src.conflictos_interes || "NO");
    } else {
      setEvalTipo("");
      setEvalCriterios(CRITERIOS_PREDEFINIDOS.map((x) => ({ ...x, puntaje: 3 })));
      setEvalDecision("CORRECCIONES");
      setEvalComentarios("");
      setEvalConflictosInteres("NO");
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
    if (!evaluatorName.trim()) return alert("Escribe el nombre del dictaminador.");
    if (!evaluatorEmail.trim()) return alert("Escribe el correo del dictaminador.");
    if (!evaluatorCvu.trim()) return alert("Escribe el CVU SNII del dictaminador.");

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
  // GUARDAR DICTAMEN (tuyo)
  // ============================================================
  const guardarDictamen = async () => {
    if (!chapter.evaluatorEmail) return alert("Primero asigna un dictaminador.");

    const tipoFinal = normalizeTipo(dictamenTipo);
    if (!tipoFinal) return alert("Escribe el tipo de dictamen.");

    setSaving(true);
    setErrMsg(null);

    try {
      const dictamenData = {
        folio: dictamenFolio,
        evaluador_email: chapter.evaluatorEmail,
        evaluador_nombre: chapter.evaluatorName,
        evaluador_cvu: evaluatorCvu,
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
  // ✅ GUARDAR EVALUACIÓN (NUEVO) - AGREGADO POR TU COMPAÑERA (NO BORRAR)
  // ============================================================
  const guardarEvaluacion = async () => {
    if (!chapterId) return;

    const tipoFinal = normalizeTipo(evalTipo);
    if (!tipoFinal) return alert("Escribe el tipo de evaluación.");

    setSaving(true);
    setErrMsg(null);

    try {
      const payload = {
        chapter_id: Number(chapterId),
        tipo: tipoFinal,
        criterios: evalCriterios.map((c) => ({ id: c.id, nombre: c.nombre, puntaje: c.puntaje })),
        promedio: promedioEvaluacion,
        decision: evalDecision,
        comentarios: evalComentarios,
        conflictos_interes: evalConflictosInteres,
      };

      await api.post(endpoints.upsertEvaluacion(chapterId), payload);

      pushHistory(
        "Editorial",
        "Evaluación guardada",
        `Se guardó evaluación (${evalDecision}) con promedio ${promedioEvaluacion}.`
      );

      setSuccessMsg("Evaluación guardada correctamente ✅");
      setTimeout(() => setSuccessMsg(null), 3000);

      await reloadAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo guardar la evaluación.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ENVIAR A DICTAMINADOR
  // ============================================================
  const sendToEvaluator = async () => {
    if (!chapter.evaluatorEmail) return alert("Falta correo del dictaminador.");

    setSaving(true);
    setErrMsg(null);

    try {
      await api.post(endpoints.sendToEvaluator(chapterId));
      await setNewStatus("ENVIADO_A_DICTAMINADOR");
      pushHistory(
        "Editorial",
        "Envío",
        `Se envió al dictaminador: ${chapter.evaluatorName} (${chapter.evaluatorEmail})`
      );
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
      pushHistory(
        "Editorial",
        "Correcciones solicitadas",
        dictamenComentarios?.trim() || "Se solicitaron correcciones al autor."
      );
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
    if (!chapter.dictamenActual) return alert("No hay dictamen para firmar.");

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
    if (!chapter.dictamenActual?.firmado) return alert("El dictamen debe estar firmado para generar constancia.");

    setSaving(true);
    setErrMsg(null);

    try {
      const response = await api.post(endpoints.generarConstancia(chapterId), {}, { responseType: "blob" });

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
      const r = await api.get(endpoints.downloadVersion(chapterId, v.id), { responseType: "blob" });

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
      const r = await api.get(endpoints.viewDictamenPdf(dictamenId), { responseType: "blob" });

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
    if (loading) return <div className={styles.mutedSmall}>Cargando…</div>;
    if (errMsg) return <div className={styles.mutedSmall} style={{ color: "#B42318" }}>{errMsg}</div>;
    if (successMsg) return <div className={styles.mutedSmall} style={{ color: "#0A7A35" }}>{successMsg}</div>;
    return null;
  };

  return (
    <div className={styles.wrap}>
      {renderTopInfo()}

      {/* BARRA SUPERIOR */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <button className={styles.backBtn} onClick={() => nav("/capitulos")} type="button">
            ← Volver
          </button>

          <div className={styles.titleBlock}>
            <h2 className={styles.h2}>{chapterSeed.title}</h2>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <b>Libro:</b> {chapterSeed.book}
              </span>
              <span className={styles.metaDot}>•</span>
              <span className={styles.metaItem}>
                <b>Autor:</b> {chapterSeed.author}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.topRight}>
          <div className={styles.folioBox}>
            <div className={styles.folioLabel}>Folio Capítulo</div>
            <div className={styles.folioValue}>{chapterSeed.folio}</div>
          </div>

          <div className={styles.statusBox}>
            <div className={styles.statusLabel}>Estado</div>
            <span className={getPillClass(chapter.status)}>{statusLabel(chapter.status)}</span>
          </div>
        </div>
      </div>

      {/* CUERPO */}
      <div className={styles.bodyGrid}>
        {/* CENTRO - TABS */}
        <div className={styles.centerCard}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${tab === "VERSIONES" ? styles.tabActive : ""}`}
              onClick={() => setTab("VERSIONES")}
              type="button"
              disabled={saving}
            >
              📄 Versiones
            </button>

            <button
              className={`${styles.tabBtn} ${tab === "DICTAMENES" ? styles.tabActive : ""}`}
              onClick={() => setTab("DICTAMENES")}
              type="button"
              disabled={saving}
            >
              📋 Dictámenes
            </button>

            <button
              className={`${styles.tabBtn} ${tab === "EVALUACION" ? styles.tabActive : ""}`}
              onClick={() => setTab("EVALUACION")}
              type="button"
              disabled={saving}
            >
              ✍️ Evaluación
            </button>

            <button
              className={`${styles.tabBtn} ${tab === "CONSTANCIAS" ? styles.tabActive : ""}`}
              onClick={() => setTab("CONSTANCIAS")}
              type="button"
              disabled={saving}
            >
              🏆 Constancias
            </button>

            <button
              className={`${styles.tabBtn} ${tab === "HISTORIAL" ? styles.tabActive : ""}`}
              onClick={() => setTab("HISTORIAL")}
              type="button"
              disabled={saving}
            >
              📜 Historial
            </button>
          </div>

          <div className={styles.tabContent}>
            {/* TAB: VERSIONES */}
            {tab === "VERSIONES" && (
              <div className={styles.section}>
                <div className={styles.sectionTop}>
                  <div>
                    <h3 className={styles.h3}>Versiones del capítulo</h3>
                    <p className={styles.p}>Archivos subidos por autor, dictaminador o editorial.</p>
                  </div>
                  <button
                    className={styles.secondaryBtn}
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

                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Versión</th>
                        <th className={styles.th}>Archivo</th>
                        <th className={styles.th}>Subido por</th>
                        <th className={styles.th}>Fecha</th>
                        <th className={styles.th}>Nota</th>
                        <th className={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapter.versions.map((v) => (
                        <tr key={v.id}>
                          <td className={styles.td}>{v.versionLabel}</td>
                          <td className={styles.td}>
                            <div className={styles.cellTitle}>{v.fileName}</div>
                          </td>
                          <td className={styles.td}>
                            <span
                              className={styles.miniPill}
                              style={{
                                background:
                                  v.uploadedBy === "autor"
                                    ? "#E9F2FF"
                                    : v.uploadedBy === "dictaminador"
                                    ? "#FFF6E5"
                                    : "#F3F4F6",
                              }}
                            >
                              {v.uploadedBy === "autor"
                                ? "Autor"
                                : v.uploadedBy === "dictaminador"
                                ? "Dictaminador"
                                : "Editorial"}
                            </span>
                          </td>
                          <td className={styles.td}>{fmtDate(v.uploadedAt)}</td>
                          <td className={styles.td}>{v.note}</td>
                          <td className={styles.td}>
                            <button
                              className={styles.linkBtn}
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
                          <td className={styles.td} colSpan={6}>
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
              <div className={styles.section}>
                <div className={styles.sectionTop}>
                  <div>
                    <h3 className={styles.h3}>Historial de dictámenes</h3>
                    <p className={styles.p}>Todas las evaluaciones realizadas.</p>
                  </div>
                </div>

                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Folio</th>
                        <th className={styles.th}>Evaluador</th>
                        <th className={styles.th}>Tipo</th>
                        <th className={styles.th}>Promedio</th>
                        <th className={styles.th}>Dictamen</th>
                        <th className={styles.th}>Firmado</th>
                        <th className={styles.th}>Fecha</th>
                        <th className={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapter.dictamenes.map((d) => (
                        <tr key={d.id}>
                          <td className={styles.td}>
                            <b>{d.folio}</b>
                          </td>
                          <td className={styles.td}>{d.evaluador}</td>
                          <td className={styles.td}>{d.type || "—"}</td>
                          <td className={styles.td}>{Number.isFinite(d.scoreAvg) ? d.scoreAvg.toFixed(1) : "—"}</td>
                          <td className={styles.td}>
                            <span className={getDictamenPillClass(d.decision)}>{dictamenLabel(d.decision)}</span>
                          </td>
                          <td className={styles.td}>{d.firmado ? "✅ Sí" : "❌ No"}</td>
                          <td className={styles.td}>{fmtDate(d.createdAt)}</td>
                          <td className={styles.td}>
                            <button className={styles.linkBtn} onClick={() => viewDictamenPdf(d.id)} type="button" disabled={saving}>
                              Ver PDF
                            </button>

                            <button
                              className={styles.linkBtn}
                              style={{ marginLeft: 8 }}
                              onClick={async () => {
                                setSaving(true);
                                setErrMsg(null);
                                try {
                                  const r = await api.get(endpoints.viewDictamenPdfSigned(d.id), {
                                    responseType: "blob",
                                  });
                                  const blob = new Blob([r.data], { type: "application/pdf" });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, "_blank");
                                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                                } catch (e: any) {
                                  setErrMsg(
                                    e?.response?.data?.detail ?? e?.message ?? "No se pudo abrir el PDF firmado."
                                  );
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
                          <td className={styles.td} colSpan={8}>
                            Aún no hay dictámenes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ✅ TAB: EVALUACIÓN (con funcionalidad de tu compañera + tus estilos) */}
            {tab === "EVALUACION" && (
              <div className={styles.section}>
                <div className={styles.sectionTop}>
                  <div>
                    <h3 className={styles.h3}>Evaluación</h3>
                    <p className={styles.p}>
                      Captura criterios (1–5), decisión y observaciones. El promedio se calcula automáticamente.
                    </p>
                  </div>

                  <button className={styles.primaryBtn} onClick={guardarEvaluacion} type="button" disabled={saving}>
                    {saving ? "Guardando..." : "💾 Guardar evaluación"}
                  </button>
                </div>

                <div className={styles.evaluacionGrid}>
                  {/* Información básica */}
                  <div className={styles.evaluacionSection}>
                    <h4 className={styles.h4}>Información de la evaluación</h4>

                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label className={styles.label}>Tipo</label>
                        <input
                          className={styles.input}
                          value={evalTipo}
                          onChange={(e) => setEvalTipo(e.target.value)}
                          placeholder='Ej: "Investigación", "Docencia", "Revisión técnica"...'
                          disabled={saving}
                          maxLength={80}
                        />
                        <div className={styles.mutedSmall}>Texto libre (máx. 80 caracteres).</div>
                      </div>
                    </div>
                  </div>

                  {/* Criterios */}
                  <div className={styles.evaluacionSection}>
                    <h4 className={styles.h4}>Criterios de evaluación (1-5)</h4>

                    {evalCriterios.map((c, idx) => (
                      <div key={c.id} className={styles.criterioRow}>
                        <div className={styles.criterioNombre}>{c.nombre}</div>

                        <div className={styles.criterioOpciones}>
                          {[1, 2, 3, 4, 5].map((p) => (
                            <label key={p} className={styles.criterioOption}>
                              <input
                                type="radio"
                                name={`eval-criterio-${c.id}`}
                                value={p}
                                checked={c.puntaje === p}
                                onChange={() => {
                                  const nuevos = [...evalCriterios];
                                  nuevos[idx].puntaje = p as any;
                                  setEvalCriterios(nuevos);
                                }}
                                disabled={saving}
                              />
                              <span>{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className={styles.promedioBox}>
                      <b>Promedio:</b> {promedioEvaluacion}
                    </div>
                  </div>

                  {/* Decisión + comentarios */}
                  <div className={styles.evaluacionSection}>
                    <h4 className={styles.h4}>Decisión</h4>

                    <div className={styles.decisionRow}>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="eval-decision"
                          value="APROBADO"
                          checked={evalDecision === "APROBADO"}
                          onChange={() => setEvalDecision("APROBADO")}
                          disabled={saving}
                        />
                        <span className={`${styles.decisionTag} ${getDictamenPillClass("APROBADO")}`}>Aprobado</span>
                      </label>

                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="eval-decision"
                          value="CORRECCIONES"
                          checked={evalDecision === "CORRECCIONES"}
                          onChange={() => setEvalDecision("CORRECCIONES")}
                          disabled={saving}
                        />
                        <span className={`${styles.decisionTag} ${getDictamenPillClass("CORRECCIONES")}`}>Correcciones</span>
                      </label>

                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="eval-decision"
                          value="RECHAZADO"
                          checked={evalDecision === "RECHAZADO"}
                          onChange={() => setEvalDecision("RECHAZADO")}
                          disabled={saving}
                        />
                        <span className={`${styles.decisionTag} ${getDictamenPillClass("RECHAZADO")}`}>Rechazado</span>
                      </label>
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Comentarios / Observaciones</label>
                      <textarea
                        className={styles.textarea}
                        value={evalComentarios}
                        onChange={(e) => setEvalComentarios(e.target.value)}
                        placeholder="Escribe aquí tus comentarios sobre el capítulo..."
                        rows={5}
                        disabled={saving}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Conflictos de interés</label>
                      <input
                        className={styles.input}
                        value={evalConflictosInteres}
                        onChange={(e) => setEvalConflictosInteres(e.target.value)}
                        placeholder="NO o SÍ: explicación"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Firma (tu parte) */}
                  <div className={styles.evaluacionSection}>
                    <h4 className={styles.h4}>Firma del dictamen</h4>
                    {chapter.dictamenActual?.firmado ? (
                      <div className={styles.successBox}>
                        ✅ Dictamen firmado el {fmtDate(chapter.dictamenActual.fechaFirma || "")}
                      </div>
                    ) : (
                      <>
                        <p className={styles.p}>Sube el dictamen firmado en PDF</p>
                        <button
                          className={styles.secondaryBtn}
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
                        {!chapter.dictamenActual && <div className={styles.mutedSmall}>Primero guarda el dictamen</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONSTANCIAS */}
            {tab === "CONSTANCIAS" && (
              <div className={styles.section}>
                <div className={styles.sectionTop}>
                  <div>
                    <h3 className={styles.h3}>Constancias</h3>
                    <p className={styles.p}>Documentos de reconocimiento para dictaminadores.</p>
                  </div>
                  <button className={styles.primaryBtn} onClick={generateConstancia} type="button" disabled={saving || !chapter.dictamenActual?.firmado}>
                    🏆 Generar constancia
                  </button>
                </div>

                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Folio</th>
                        <th className={styles.th}>Dictaminador</th>
                        <th className={styles.th}>CVU SNII</th>
                        <th className={styles.th}>Capítulo</th>
                        <th className={styles.th}>Fecha emisión</th>
                        <th className={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapter.constancias.map((c) => (
                        <tr key={c.id}>
                          <td className={styles.td}>
                            <b>{c.folio}</b>
                          </td>
                          <td className={styles.td}>{c.evaluadorNombre}</td>
                          <td className={styles.td}>{c.evaluadorCvu}</td>
                          <td className={styles.td}>{c.capituloTitulo}</td>
                          <td className={styles.td}>{fmtDate(c.fechaEmision)}</td>
                          <td className={styles.td}>
                            <button className={styles.linkBtn} onClick={() => window.open(c.pdfUrl, "_blank")} type="button" disabled={!c.pdfUrl}>
                              Ver PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                      {chapter.constancias.length === 0 && (
                        <tr>
                          <td className={styles.td} colSpan={6}>
                            No hay constancias generadas aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!chapter.dictamenActual?.firmado && <div className={styles.warningBox}>⚠️ Las constancias solo se pueden generar cuando el dictamen está FIRMADO.</div>}
              </div>
            )}

            {/* TAB: HISTORIAL */}
            {tab === "HISTORIAL" && (
              <div className={styles.section}>
                <div className={styles.sectionTop}>
                  <div>
                    <h3 className={styles.h3}>Historial de actividades</h3>
                    <p className={styles.p}>Todos los eventos del proceso.</p>
                  </div>
                </div>

                <div className={styles.timeline}>
                  {chapter.history.map((h) => (
                    <div key={h.id} className={styles.timelineItem}>
                      <div className={styles.timelineDot} />
                      <div className={styles.timelineBody}>
                        <div className={styles.timelineTop}>
                          <span className={styles.timelineAction}>{h.action}</span>
                          <span className={styles.timelineAt}>{fmtDateTime(h.at)}</span>
                        </div>
                        <div className={styles.timelineDetail}>{h.detail}</div>
                        <div className={styles.timelineBy}>Por: {h.by}</div>
                      </div>
                    </div>
                  ))}
                  {chapter.history.length === 0 && <div className={styles.mutedSmall}>Sin eventos registrados.</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DERECHA: Acciones rápidas */}
        <div className={styles.rightCard}>
          <h3 className={styles.h3}>Acciones rápidas</h3>
          <p className={styles.p}>Flujo editorial simplificado</p>

          {/* Asignar dictaminador */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>👤 Asignar dictaminador</div>
            <input className={styles.input} value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} placeholder="Nombre completo" disabled={saving} />
            <input className={styles.input} value={evaluatorEmail} onChange={(e) => setEvaluatorEmail(e.target.value)} placeholder="Correo electrónico" disabled={saving} />
            <input className={styles.input} value={evaluatorCvu} onChange={(e) => setEvaluatorCvu(e.target.value)} placeholder="CVU SNII" disabled={saving} />
            <button className={styles.primaryBtn} onClick={assignEvaluator} type="button" disabled={saving || loading}>
              Asignar dictaminador
            </button>
          </div>

          {/* Envíos */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>📧 Envíos</div>
            <button className={styles.secondaryBtnFull} onClick={sendToEvaluator} type="button" disabled={saving || loading}>
              Enviar a dictaminador
            </button>
            <button className={styles.secondaryBtnFull} onClick={requestCorrectionsToAuthor} type="button" disabled={saving || loading}>
              Solicitar correcciones al autor
            </button>
          </div>

          {/* Flujo automático */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>🔄 Flujo automático</div>
            <button
              className={styles.primaryBtn}
              onClick={() => alert("Luego lo revisamos (flujo automático).")}
              type="button"
              disabled={saving || loading}
              title="Avanza 1 paso según el estado actual"
            >
              Avanzar al siguiente estado
            </button>

            <div className={styles.mutedSmall}>Estados: Reenviado → Revisado editorial → Listo para firma → Firmado</div>
          </div>

          {/* Decisión final */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>✅ Decisión final</div>
            <div className={styles.actionRow}>
              <button className={styles.approveBtn} onClick={() => setNewStatus("APROBADO")} type="button" disabled={saving || loading}>
                Aprobar
              </button>
              <button className={styles.rejectBtn} onClick={() => setNewStatus("RECHAZADO")} type="button" disabled={saving || loading}>
                Rechazar
              </button>
            </div>
          </div>

          {/* Cambiar estado manual */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>🔄 Cambiar estado</div>
            <select className={styles.input} value={chapter.status} onChange={(e) => setNewStatus(e.target.value as Status)} disabled={saving || loading}>
              {statusOptions().map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {(saving || loading) && <div className={styles.mutedSmall}>{loading ? "Cargando…" : "Guardando…"}</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUXILIARES
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

function dictamenLabel(d: "APROBADO" | "CORRECCIONES" | "RECHAZADO") {
  if (d === "APROBADO") return "✅ Aprobado";
  if (d === "CORRECCIONES") return "✏️ Correcciones";
  return "❌ Rechazado";
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