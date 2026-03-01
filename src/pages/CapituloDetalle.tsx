import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import styles from "./CapituloDetalle.module.css";

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

type HistoryItem = {
  id: string;
  at: string;
  by: string;
  action: string;
  detail: string;
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

  deadline_at: string | null;
  deadline_stage: string | null;

  versions: VersionFile[];
  history: HistoryItem[];

  // si tu backend manda evaluación guardada, la usamos para precarga
  evaluacionActual?: {
    tipo?: string;
    criterios?: CriterioEvaluacion[];
    promedio?: number;
    decision?: "APROBADO" | "CORRECCIONES" | "RECHAZADO";
    comentarios?: string;
    conflictosInteres?: string;
    conflictos_interes?: string;
  } | null;
};

const endpoints = {
  chapterDetail: (chapterId: string) => `/admin/chapters/${chapterId}`,
  chapterStatus: (chapterId: string) => `/admin/chapters/${chapterId}/status`,
  versions: (chapterId: string) => `/admin/chapters/${chapterId}/versions`,
  downloadVersion: (chapterId: string, versionId: string) =>
    `/admin/chapters/${chapterId}/versions/${versionId}/download`,
  uploadVersion: (chapterId: string) => `/admin/chapters/${chapterId}/versions/upload`,
  history: (chapterId: string) => `/admin/chapters/${chapterId}/history`,
  // ✅ evaluación
  upsertEvaluacion: (chapterId: string) => `/admin/chapters/${chapterId}/evaluacion/upsert`,
};

function ensureString(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function toStatus(v: any): Status {
  return v as Status;
}

function normalizeTipo(s: string): string {
  return (s || "").trim().slice(0, 80);
}

function mapChapterResponseToChapter(payload: any): Chapter {
  const bookName = payload?.book?.name ?? payload?.book_name ?? payload?.bookName ?? payload?.book ?? "";
  const evaluatorName = payload?.evaluator?.name ?? payload?.evaluator_name ?? payload?.evaluatorName ?? null;
  const evaluatorEmail = payload?.evaluator?.email ?? payload?.evaluator_email ?? payload?.evaluatorEmail ?? null;

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
    deadline_at: payload?.deadline_at ? ensureString(payload.deadline_at).slice(0, 10) : null,
    deadline_stage: payload?.deadline_stage ? ensureString(payload.deadline_stage) : null,
    versions,
    history,
    evaluacionActual: payload?.evaluacion_actual ?? payload?.evaluacionActual ?? null,
  };
}

// ✅ FUNCIONES PARA CLASES CSS
function getPillClass(status: Status): string {
  const baseClass = styles.pill;

  if (status === "APROBADO" || status === "FIRMADO") return `${baseClass} ${styles.pillApproved}`;
  if (status.includes("CORRECCIONES")) return `${baseClass} ${styles.pillCorrections}`;
  if (status.includes("REVISION") || status.includes("ENVIADO") || status.includes("ASIGNADO"))
    return `${baseClass} ${styles.pillRevision}`;
  if (status === "RECHAZADO") return `${baseClass} ${styles.pillRejected}`;
  return `${baseClass} ${styles.pillDefault}`;
}

function getDecisionPillClass(decision: "APROBADO" | "CORRECCIONES" | "RECHAZADO"): string {
  const baseClass = styles.pill;
  if (decision === "APROBADO") return `${baseClass} ${styles.pillApproved}`;
  if (decision === "CORRECCIONES") return `${baseClass} ${styles.pillCorrections}`;
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
    deadline_at: null,
    deadline_stage: null,
    versions: [],
    history: [],
    evaluacionActual: null,
  }));

  const [tab, setTab] = useState<"VERSIONES" | "EVALUACION" | "HISTORIAL">("VERSIONES");

  // Estados (solo nombre y correo) — (UI)
  const [evaluatorName, setEvaluatorName] = useState<string>("");
  const [evaluatorEmail, setEvaluatorEmail] = useState<string>("");

  // ✅ EVALUACIÓN
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const chapterSeed = useMemo(() => chapter, [chapter]);

  const applyChapterToUI = (c: Chapter) => {
    setChapter(c);

    setEvaluatorName(c.evaluatorName ?? "");
    setEvaluatorEmail(c.evaluatorEmail ?? "");

    // Precarga EVALUACIÓN desde backend si existe
    const src = (c as any).evaluacionActual ?? null;
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
      history: [{ id: `h-${Date.now()}`, at: new Date().toISOString(), by, action, detail }, ...prev.history],
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

  // ✅ GUARDAR EVALUACIÓN
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

      pushHistory("Editorial", "Evaluación guardada", `Se guardó evaluación (${evalDecision}) con promedio ${promedioEvaluacion}.`);

      setSuccessMsg("Evaluación guardada correctamente ✅");
      setTimeout(() => setSuccessMsg(null), 3000);

      await reloadAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail ?? e?.message ?? "No se pudo guardar la evaluación.");
    } finally {
      setSaving(false);
    }
  };

  // SUBIR NUEVA VERSIÓN
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
              {chapterSeed.deadline_at && (
                <>
                  <span className={styles.metaDot}>•</span>
                  <span className={styles.metaItem}>
                    <b>Fecha límite:</b> {fmtDate(chapterSeed.deadline_at)}{" "}
                    {chapterSeed.deadline_stage ? `(${chapterSeed.deadline_stage})` : ""}
                  </span>
                </>
              )}
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
              className={`${styles.tabBtn} ${tab === "EVALUACION" ? styles.tabActive : ""}`}
              onClick={() => setTab("EVALUACION")}
              type="button"
              disabled={saving}
            >
              ✍️ Evaluación
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

            {/* TAB: EVALUACIÓN */}
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
                        <span className={`${styles.decisionTag} ${getDecisionPillClass("APROBADO")}`}>Aprobado</span>
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
                        <span className={`${styles.decisionTag} ${getDecisionPillClass("CORRECCIONES")}`}>Correcciones</span>
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
                        <span className={`${styles.decisionTag} ${getDecisionPillClass("RECHAZADO")}`}>Rechazado</span>
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
                </div>
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

          {/* Inputs (solo UI, no asigna en backend aquí) */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>👤 Dictaminador</div>
            <input
              className={styles.input}
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              placeholder="Nombre completo"
              disabled={saving}
            />
            <input
              className={styles.input}
              value={evaluatorEmail}
              onChange={(e) => setEvaluatorEmail(e.target.value)}
              placeholder="Correo electrónico"
              disabled={saving}
            />
            <div className={styles.mutedSmall}>
              *Estos campos se muestran aquí, pero en este archivo no se hace el POST de asignación (para no tocar tu flujo).
            </div>
          </div>

          {/* Decisión final */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>✅ Decisión final</div>
            <div className={styles.actionRow}>
              <button
                className={styles.approveBtn}
                onClick={() => setNewStatus("APROBADO")}
                type="button"
                disabled={saving || loading}
              >
                Aprobar
              </button>
              <button
                className={styles.rejectBtn}
                onClick={() => setNewStatus("RECHAZADO")}
                type="button"
                disabled={saving || loading}
              >
                Rechazar
              </button>
            </div>
          </div>

          {/* Cambiar estado manual */}
          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>🔄 Cambiar estado</div>
            <select
              className={styles.input}
              value={chapter.status}
              onChange={(e) => setNewStatus(e.target.value as Status)}
              disabled={saving || loading}
            >
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