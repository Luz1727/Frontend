import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import styles from "./Capitulos.module.css";

// ✅ ALERTA PREMIUM (ajusta la ruta si es diferente)
import { alertService } from "../utils/alerts";

type Status =
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
  | "APROBADO"
  | "RECHAZADO"
  // ✅ tu código usa EN_REVISION en UI, así que lo incluyo para evitar conflictos TS
  | "EN_REVISION";

type ChapterRow = {
  id: string;
  folio: string;
  title: string;
  book: string;
  author: string;
  status: Status;
  updatedAt: string; // yyyy-mm-dd
  evaluatorEmail?: string | null;
  // ✅ NUEVO (añadido por tu compañera)
  deadlineAt?: string | null; // yyyy-mm-dd
  deadlineStage?: string | null; // DICTAMEN | CORRECCION_AUTOR | REDICTAMEN | etc
};

type AdminChapterApi = {
  id: number;
  folio: string | null;
  title: string;
  book_id: number;
  book_name: string;
  author_name: string;
  author_email: string;
  status: Status;
  updated_at: string;
  evaluator_email?: string | null;
  // ✅ NUEVO
  deadline_at?: string | null; // DATETIME o DATE
  deadline_stage?: string | null;
};

// ✅ Función para obtener la clase del chip según el estado (TUYA)
function getChipClass(status: Status): string {
  const baseClass = styles.chip;

  const statusMap: Partial<Record<Status, string>> = {
    RECIBIDO: styles.chipRecibido,
    ASIGNADO_A_DICTAMINADOR: styles.chipAsignado,
    ENVIADO_A_DICTAMINADOR: styles.chipEnviado,
    EN_REVISION_DICTAMINADOR: styles.chipRevision,
    CORRECCIONES_SOLICITADAS_A_AUTOR: styles.chipCorreccionesSolicitadas,
    CORRECCIONES: styles.chipCorrecciones,
    REENVIADO_POR_AUTOR: styles.chipReenviado,
    REVISADO_POR_EDITORIAL: styles.chipRevisadoEditorial,
    LISTO_PARA_FIRMA: styles.chipListoFirma,
    FIRMADO: styles.chipFirmado,
    EN_REVISION: styles.chipRevision,
    APROBADO: styles.chipAprobado,
    RECHAZADO: styles.chipRechazado,
  };

  return `${baseClass} ${statusMap[status] || styles.chipRecibido}`;
}

// ✅ Función para obtener la clase del pill según el estado (TUYA)
function getPillClass(status: Status): string {
  const baseClass = styles.pill;

  if (status === "APROBADO" || status === "FIRMADO") {
    return `${baseClass} ${styles.pillApproved}`;
  }
  if (status === "CORRECCIONES" || status === "CORRECCIONES_SOLICITADAS_A_AUTOR") {
    return `${baseClass} ${styles.pillCorrections}`;
  }
  if (
    status === "EN_REVISION" ||
    status === "EN_REVISION_DICTAMINADOR" ||
    status === "ENVIADO_A_DICTAMINADOR"
  ) {
    return `${baseClass} ${styles.pillRevision}`;
  }
  if (
    status === "ASIGNADO_A_DICTAMINADOR" ||
    status === "REVISADO_POR_EDITORIAL" ||
    status === "LISTO_PARA_FIRMA"
  ) {
    return `${baseClass} ${styles.pillAsignado}`;
  }
  if (status === "REENVIADO_POR_AUTOR") {
    return `${baseClass} ${styles.pillReenviado}`;
  }
  if (status === "RECHAZADO") {
    return `${baseClass} ${styles.pillRejected}`;
  }
  return `${baseClass} ${styles.pillDefault}`;
}

export default function Capitulos() {
  const nav = useNavigate();

  const [all, setAll] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros
  const [book, setBook] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [q, setQ] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // folio editable por fila
  const [folioDraft, setFolioDraft] = useState<Record<string, string>>({});

  // modal acciones
  const [actionOpen, setActionOpen] = useState(false);
  // ✅ CAMBIADO por tu compañera: solo "ASIGNAR"
  const [actionType, setActionType] = useState<"ASIGNAR" | null>(null);
  const [selected, setSelected] = useState<ChapterRow | null>(null);

  const [actionForm, setActionForm] = useState({
    dictaminador: "",
    comentario: "",
    // ✅ NUEVO
    deadlineAt: "", // yyyy-mm-dd
  });

  const apiMsg = (err: any, fallback: string) =>
    err?.response?.data?.detail || err?.message || fallback;

  // cargar capítulos (admin)
  const reload = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data } = await api.get<AdminChapterApi[]>("/admin/chapters");

      const mapped: ChapterRow[] = (data ?? []).map((c) => ({
        id: String(c.id),
        folio: c.folio ?? "",
        title: c.title,
        book: c.book_name ?? "—",
        author: `${c.author_name} (${c.author_email})`,
        status: c.status,
        updatedAt: (c.updated_at || "").slice(0, 10),
        evaluatorEmail: c.evaluator_email ?? null,
        deadlineAt: c.deadline_at ? (c.deadline_at || "").slice(0, 10) : null,
        deadlineStage: c.deadline_stage ?? null,
      }));

      setAll(mapped);

      // inicializa draft con folios actuales
      setFolioDraft((prev) => {
        const next = { ...prev };
        for (const r of mapped) {
          if (next[r.id] === undefined) next[r.id] = r.folio || "";
        }
        return next;
      });
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudieron cargar los capítulos.");
      setErrorMsg(msg);
      alertService.toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await reload();
    })();
    return () => {
      alive = false;
    };
  }, []);

  const books = useMemo(() => {
    const setb = new Set(all.map((x) => x.book).filter(Boolean));
    return ["ALL", ...Array.from(setb).sort((a, b) => a.localeCompare(b))];
  }, [all]);

  const filtered = useMemo(() => {
    const qNorm = q.trim().toLowerCase();

    return all.filter((x) => {
      if (book !== "ALL" && x.book !== book) return false;
      if (status !== "ALL" && x.status !== (status as any)) return false;

      if (qNorm) {
        const hay =
          (x.folio || "").toLowerCase().includes(qNorm) ||
          (x.title || "").toLowerCase().includes(qNorm) ||
          (x.author || "").toLowerCase().includes(qNorm) ||
          (x.evaluatorEmail || "").toLowerCase().includes(qNorm) ||
          (x.id || "").toLowerCase().includes(qNorm);
        if (!hay) return false;
      }

      if (from && x.updatedAt < from) return false;
      if (to && x.updatedAt > to) return false;

      return true;
    });
  }, [all, book, status, q, from, to]);

  const counts = useMemo(() => countStatuses(filtered), [filtered]);

  const clearFilters = () => {
    setBook("ALL");
    setStatus("ALL");
    setQ("");
    setFrom("");
    setTo("");
  };

  // ✅ CAMBIADO por tu compañera: solo "ASIGNAR"
  const openAction = (type: "ASIGNAR", row: ChapterRow) => {
    setSelected(row);
    setActionType(type);
    setActionForm({ dictaminador: "", comentario: "", deadlineAt: "" });
    setActionOpen(true);
  };

  // =========================
  // BACKEND CALLS
  // =========================

  const mapApiToRow = (data: AdminChapterApi): ChapterRow => ({
    id: String(data.id),
    folio: data.folio ?? "",
    title: data.title,
    book: data.book_name ?? "—",
    author: `${data.author_name} (${data.author_email})`,
    status: data.status,
    updatedAt: (data.updated_at || "").slice(0, 10),
    evaluatorEmail: data.evaluator_email ?? null,
    deadlineAt: data.deadline_at ? (data.deadline_at || "").slice(0, 10) : null,
    deadlineStage: data.deadline_stage ?? null,
  });

  // guardar folio
  const saveFolioBackend = async (chapterId: string, folio: string) => {
    const { data } = await api.patch<AdminChapterApi>(
      `/admin/chapters/${Number(chapterId)}/folio`,
      { folio }
    );
    const updated = mapApiToRow(data);

    setAll((prev) => prev.map((x) => (x.id === chapterId ? updated : x)));
    setFolioDraft((p) => ({ ...p, [chapterId]: updated.folio }));
  };

  // asignar dictaminador + fecha límite
  const assignEvaluatorBackend = async (chapterId: string, evaluatorEmail: string, deadlineAt: string) => {
    const { data } = await api.post<AdminChapterApi>(
      `/admin/chapters/${Number(chapterId)}/assign`,
      {
        evaluator_email: evaluatorEmail,
        deadline_at: deadlineAt,
        deadline_stage: "DICTAMEN",
      }
    );

    const updated = mapApiToRow(data);
    setAll((prev) => prev.map((x) => (x.id === chapterId ? updated : x)));
  };

  const runAction = async () => {
    if (!selected || !actionType) return;

    try {
      setBusyId(selected.id);
      setErrorMsg(null);

      if (actionType === "ASIGNAR") {
        const email = actionForm.dictaminador.trim().toLowerCase();
        if (!email) {
          await alertService.warning("Escribe el correo del dictaminador.", "Falta un dato");
          return;
        }

        const deadlineAt = actionForm.deadlineAt.trim();
        if (!deadlineAt) {
          await alertService.warning("Selecciona la fecha límite.", "Falta un dato");
          return;
        }

        // ✅ confirmación premium
        const confirm = await alertService.confirm({
          title: "¿Asignar dictaminador?",
          text: `Se asignará a: ${email}\nFecha límite: ${fmtDate(deadlineAt)}`,
          icon: "question",
          confirmText: "Sí, asignar",
          cancelText: "Cancelar",
        });

        if (!confirm.isConfirmed) return;

        // ✅ loading premium
        alertService.loading("Asignando...");

        await assignEvaluatorBackend(selected.id, email, deadlineAt);
        alertService.close();

        alertService.toastSuccess("Dictaminador asignado ✅");
        setActionOpen(false);
        return;
      }
    } catch (err: any) {
      alertService.close();
      const msg = apiMsg(err, "No se pudo ejecutar la acción.");
      setErrorMsg(msg);
      await alertService.error(msg, "Error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>Capítulos (Admin)</h2>
          <p className={styles.p}>Lista global filtrable conectada al backend.</p>
        </div>

        <button className={styles.ghostBtn} type="button" onClick={reload} disabled={loading}>
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

      {loading ? (
        <div className={styles.empty}>Cargando capítulos...</div>
      ) : (
        <>
          {/* Filtros */}
          <div className={styles.filtersCard}>
            <div className={styles.filtersGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Libro</label>
                <select className={styles.input} value={book} onChange={(e) => setBook(e.target.value)}>
                  {books.map((b) => (
                    <option key={b} value={b}>
                      {b === "ALL" ? "Todos" : b}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Estado</label>
                <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ALL">Todos</option>
                  <option value="RECIBIDO">Recibido</option>
                  <option value="ASIGNADO_A_DICTAMINADOR">Asignado</option>
                  <option value="ENVIADO_A_DICTAMINADOR">Enviado a dictaminador</option>
                  <option value="EN_REVISION_DICTAMINADOR">En revisión (dictaminador)</option>
                  <option value="EN_REVISION">En revisión</option>
                  <option value="CORRECCIONES_SOLICITADAS_A_AUTOR">Correcciones solicitadas</option>
                  <option value="CORRECCIONES">Correcciones</option>
                  <option value="REENVIADO_POR_AUTOR">Reenviado</option>
                  <option value="REVISADO_POR_EDITORIAL">Revisado por editorial</option>
                  <option value="LISTO_PARA_FIRMA">Listo para firma</option>
                  <option value="FIRMADO">Firmado</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="RECHAZADO">Rechazado</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Buscar</label>
                <input
                  className={styles.input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Folio, título, autor, dictaminador..."
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Fecha desde</label>
                <input className={styles.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Fecha hasta</label>
                <input className={styles.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>

              <div className={styles.fieldActions}>
                <button className={styles.ghostBtn} onClick={clearFilters} type="button">
                  Limpiar
                </button>
              </div>
            </div>

            <div className={styles.resultsRow}>
              <span className={styles.muted}>
                Mostrando <b>{filtered.length}</b> de {all.length} capítulos
              </span>

              <div className={styles.chips}>
                <span className={getChipClass("RECIBIDO")}>Recibidos: {counts.RECIBIDO}</span>
                <span className={getChipClass("ASIGNADO_A_DICTAMINADOR")}>Asignados: {counts.ASIGNADO_A_DICTAMINADOR}</span>
                <span className={getChipClass("ENVIADO_A_DICTAMINADOR")}>Enviados: {counts.ENVIADO_A_DICTAMINADOR}</span>
                <span className={getChipClass("EN_REVISION_DICTAMINADOR")}>En revisión (dict): {counts.EN_REVISION_DICTAMINADOR}</span>
                <span className={getChipClass("EN_REVISION")}>En revisión: {counts.EN_REVISION}</span>
                <span className={getChipClass("CORRECCIONES_SOLICITADAS_A_AUTOR")}>Correcciones sol: {counts.CORRECCIONES_SOLICITADAS_A_AUTOR}</span>
                <span className={getChipClass("CORRECCIONES")}>Correcciones: {counts.CORRECCIONES}</span>
                <span className={getChipClass("REENVIADO_POR_AUTOR")}>Reenviados: {counts.REENVIADO_POR_AUTOR}</span>
                <span className={getChipClass("REVISADO_POR_EDITORIAL")}>Revisado editorial: {counts.REVISADO_POR_EDITORIAL}</span>
                <span className={getChipClass("LISTO_PARA_FIRMA")}>Listo firma: {counts.LISTO_PARA_FIRMA}</span>
                <span className={getChipClass("FIRMADO")}>Firmados: {counts.FIRMADO}</span>
                <span className={getChipClass("APROBADO")}>Aprobados: {counts.APROBADO}</span>
                <span className={getChipClass("RECHAZADO")}>Rechazados: {counts.RECHAZADO}</span>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Folio</th>
                  <th className={styles.th}>Capítulo</th>
                  <th className={styles.th}>Libro</th>
                  <th className={styles.th}>Autor</th>
                  <th className={styles.th}>Dictaminador</th>
                  <th className={styles.th}>Estado</th>
                  <th className={styles.th}>Actualizado</th>
                  <th className={styles.th}>Fecha límite</th>
                  <th className={styles.th}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((x) => {
                  const draft = folioDraft[x.id] ?? "";
                  const changed = (x.folio ?? "") !== draft;

                  return (
                    <tr key={x.id}>
                      {/* folio editable */}
                      <td className={styles.td}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            className={styles.inlineInput}
                            value={draft}
                            onChange={(e) => setFolioDraft((p) => ({ ...p, [x.id]: e.target.value }))}
                            placeholder="Ej: CAP-2026-001"
                          />
                          <button
                            className={styles.inlineBtn}
                            style={{ opacity: changed ? 1 : 0.55 }}
                            type="button"
                            disabled={!changed || busyId === x.id}
                            onClick={async () => {
                              const v = (folioDraft[x.id] || "").trim();
                              if (!v) {
                                await alertService.warning("El folio no puede ir vacío.", "Falta un dato");
                                return;
                              }
                              try {
                                setBusyId(x.id);

                                alertService.loading("Guardando folio...");
                                await saveFolioBackend(x.id, v);
                                alertService.close();

                                alertService.toastSuccess("Folio guardado ✅");
                              } catch (err: any) {
                                alertService.close();
                                await alertService.error(apiMsg(err, "No se pudo guardar el folio."), "Error");
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            {busyId === x.id ? "..." : "Guardar"}
                          </button>
                        </div>
                      </td>

                      <td className={styles.td}>
                        <div className={styles.cellTitle}>{x.title}</div>
                        <div className={styles.cellSub}>ID: {x.id}</div>
                      </td>

                      <td className={styles.td}>{x.book}</td>
                      <td className={styles.td}>{x.author}</td>
                      <td className={styles.td}>{x.evaluatorEmail || "—"}</td>

                      <td className={styles.td}>
                        <span className={getPillClass(x.status)}>{statusLabel(x.status)}</span>
                      </td>

                      <td className={styles.td}>{fmtDate(x.updatedAt)}</td>

                      <td className={styles.td}>{x.deadlineAt ? fmtDate(x.deadlineAt) : "—"}</td>

                      <td className={styles.td}>
                        <div className={styles.actions}>
                          <button className={styles.linkBtn} onClick={() => nav(`/capitulos/${x.id}`)} type="button">
                            Ver
                          </button>

                          <button className={styles.secondaryBtn} onClick={() => openAction("ASIGNAR", x)} type="button">
                            Asignar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td className={styles.td} colSpan={9}>
                      No hay resultados con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL acciones */}
      {actionOpen && selected && actionType && (
        <div className={styles.modalOverlay} onClick={() => setActionOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Asignar dictaminador</div>

            <div className={styles.modalHint}>
              Capítulo: <b>{selected.title}</b> • Folio: <b>{selected.folio || "—"}</b>
            </div>

            <label className={styles.modalLabel}>Correo del dictaminador</label>
            <input
              className={styles.modalInput}
              value={actionForm.dictaminador}
              onChange={(e) => setActionForm((s) => ({ ...s, dictaminador: e.target.value }))}
              placeholder="ej: dictaminador@correo.com"
            />
            <div className={styles.modalInfo}>
              El correo debe existir en la tabla <b>users</b> y tener <b>role=dictaminador</b>.
            </div>

            <label className={styles.modalLabel}>Fecha límite (dictaminador)</label>
            <input
              className={styles.modalInput}
              type="date"
              value={actionForm.deadlineAt}
              onChange={(e) => setActionForm((s) => ({ ...s, deadlineAt: e.target.value }))}
            />

            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} type="button" onClick={() => setActionOpen(false)}>
                Cancelar
              </button>
              <button className={styles.primaryBtn} type="button" onClick={runAction} disabled={busyId === selected.id}>
                {busyId === selected.id ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: Status) {
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

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}

function countStatuses(rows: ChapterRow[]) {
  const out: Record<Status, number> = {
    RECIBIDO: 0,
    ASIGNADO_A_DICTAMINADOR: 0,
    ENVIADO_A_DICTAMINADOR: 0,
    EN_REVISION_DICTAMINADOR: 0,
    CORRECCIONES_SOLICITADAS_A_AUTOR: 0,
    CORRECCIONES: 0,
    REENVIADO_POR_AUTOR: 0,
    REVISADO_POR_EDITORIAL: 0,
    LISTO_PARA_FIRMA: 0,
    FIRMADO: 0,
    EN_REVISION: 0,
    APROBADO: 0,
    RECHAZADO: 0,
  };
  for (const r of rows) out[r.status] += 1;
  return out;
}