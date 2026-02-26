// src/pages/Capitulos.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

type Status =
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "ENVIADO_A_DICTAMINADOR"
  | "EN_REVISION_DICTAMINADOR"
  | "CORRECCIONES_SOLICITITADAS_A_AUTOR"
  | "CORRECCIONES_SOLICITADAS_A_AUTOR"
  | "REENVIADO_POR_AUTOR"
  | "REVISADO_POR_EDITORIAL"
  | "LISTO_PARA_FIRMA"
  | "FIRMADO"
  | "APROBADO"
  | "RECHAZADO";

type ChapterRow = {
  id: string;
  folio: string;
  title: string;
  book: string;
  author: string;
  status: Status;
  updatedAt: string; // yyyy-mm-dd
  evaluatorEmail?: string | null;

  // ✅ NUEVO (fechas / deadline)
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

  // ✅ NUEVO (lo debe devolver tu backend)
  deadline_at?: string | null; // DATETIME o DATE
  deadline_stage?: string | null;
};

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
  const [actionType, setActionType] = useState<"ASIGNAR" | null>(null);
  const [selected, setSelected] = useState<ChapterRow | null>(null);

  const [actionForm, setActionForm] = useState({
    dictaminador: "",
    comentario: "",

    // ✅ NUEVO: la editorial selecciona la fecha límite
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

        // ✅ NUEVO
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
      setErrorMsg(apiMsg(err, "No se pudieron cargar los capítulos."));
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

  const openAction = (type: "ASIGNAR", row: ChapterRow) => {
    setSelected(row);
    setActionType(type);

    // ✅ NUEVO: limpiamos deadlineAt
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

    // ✅ NUEVO
    deadlineAt: data.deadline_at ? (data.deadline_at || "").slice(0, 10) : null,
    deadlineStage: data.deadline_stage ?? null,
  });

  // guardar folio
  const saveFolioBackend = async (chapterId: string, folio: string) => {
    const { data } = await api.patch<AdminChapterApi>(`/admin/chapters/${Number(chapterId)}/folio`, { folio });
    const updated = mapApiToRow(data);

    setAll((prev) => prev.map((x) => (x.id === chapterId ? updated : x)));
    setFolioDraft((p) => ({ ...p, [chapterId]: updated.folio }));
  };

  // ✅ asignar dictaminador + fecha límite (la editorial la pone)
  const assignEvaluatorBackend = async (chapterId: string, evaluatorEmail: string, deadlineAt: string) => {
    const { data } = await api.post<AdminChapterApi>(`/admin/chapters/${Number(chapterId)}/assign`, {
      evaluator_email: evaluatorEmail,

      // ✅ NUEVO
      deadline_at: deadlineAt, // yyyy-mm-dd
      deadline_stage: "DICTAMEN",
    });

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
        if (!email) return alert("Escribe el correo del dictaminador.");

        // ✅ NUEVO
        const deadlineAt = actionForm.deadlineAt.trim();
        if (!deadlineAt) return alert("Selecciona la fecha límite.");

        await assignEvaluatorBackend(selected.id, email, deadlineAt);
        alert("Dictaminador asignado ✅");
        setActionOpen(false);
        return;
      }
    } catch (err: any) {
      const msg = apiMsg(err, "No se pudo ejecutar la acción.");
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div>
          <h2 style={styles.h2}>Capítulos (Admin)</h2>
          <p style={styles.p}>Lista global filtrable conectada al backend.</p>
        </div>

        <button style={styles.ghostBtn} type="button" onClick={reload} disabled={loading}>
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

      {loading ? (
        <div style={styles.empty}>Cargando capítulos...</div>
      ) : (
        <>
          {/* Filtros */}
          <div style={styles.filtersCard}>
            <div style={styles.filtersGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Libro</label>
                <select style={styles.input} value={book} onChange={(e) => setBook(e.target.value)}>
                  {books.map((b) => (
                    <option key={b} value={b}>
                      {b === "ALL" ? "Todos" : b}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Estado</label>
                <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
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

              <div style={styles.field}>
                <label style={styles.label}>Buscar</label>
                <input
                  style={styles.input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Folio, título, autor, dictaminador..."
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Fecha desde</label>
                <input style={styles.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Fecha hasta</label>
                <input style={styles.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>

              <div style={styles.fieldActions}>
                <button style={styles.ghostBtn} onClick={clearFilters} type="button">
                  Limpiar
                </button>
              </div>
            </div>

            <div style={styles.resultsRow}>
              <span style={styles.muted}>
                Mostrando <b>{filtered.length}</b> de {all.length} capítulos
              </span>

              <div style={styles.chips}>
                <span style={{ ...styles.chip, ...pillTone("RECIBIDO") }}>Recibidos: {counts.RECIBIDO}</span>
                <span style={{ ...styles.chip, ...pillTone("ASIGNADO_A_DICTAMINADOR") }}>
                  Asignados: {counts.ASIGNADO_A_DICTAMINADOR}
                </span>
                <span style={{ ...styles.chip, ...pillTone("ENVIADO_A_DICTAMINADOR") }}>
                  Enviados: {counts.ENVIADO_A_DICTAMINADOR}
                </span>
                <span style={{ ...styles.chip, ...pillTone("EN_REVISION_DICTAMINADOR") }}>
                  En revisión (dict): {counts.EN_REVISION_DICTAMINADOR}
                </span>
                <span style={{ ...styles.chip, ...pillTone("EN_REVISION") }}>En revisión: {counts.EN_REVISION}</span>
                <span style={{ ...styles.chip, ...pillTone("CORRECCIONES_SOLICITADAS_A_AUTOR") }}>
                  Correcciones sol: {counts.CORRECCIONES_SOLICITADAS_A_AUTOR}
                </span>
                <span style={{ ...styles.chip, ...pillTone("CORRECCIONES") }}>Correcciones: {counts.CORRECCIONES}</span>
                <span style={{ ...styles.chip, ...pillTone("REENVIADO_POR_AUTOR") }}>
                  Reenviados: {counts.REENVIADO_POR_AUTOR}
                </span>
                <span style={{ ...styles.chip, ...pillTone("REVISADO_POR_EDITORIAL") }}>
                  Revisado editorial: {counts.REVISADO_POR_EDITORIAL}
                </span>
                <span style={{ ...styles.chip, ...pillTone("LISTO_PARA_FIRMA") }}>
                  Listo firma: {counts.LISTO_PARA_FIRMA}
                </span>
                <span style={{ ...styles.chip, ...pillTone("FIRMADO") }}>Firmados: {counts.FIRMADO}</span>
                <span style={{ ...styles.chip, ...pillTone("APROBADO") }}>Aprobados: {counts.APROBADO}</span>
                <span style={{ ...styles.chip, ...pillTone("RECHAZADO") }}>Rechazados: {counts.RECHAZADO}</span>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Folio</th>
                  <th style={styles.th}>Capítulo</th>
                  <th style={styles.th}>Libro</th>
                  <th style={styles.th}>Autor</th>
                  <th style={styles.th}>Dictaminador</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Actualizado</th>

                  {/* ✅ NUEVO */}
                  <th style={styles.th}>Fecha límite</th>

                  <th style={styles.th}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((x) => {
                  const draft = folioDraft[x.id] ?? "";
                  const changed = (x.folio ?? "") !== draft;

                  return (
                    <tr key={x.id}>
                      {/* folio editable */}
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            style={{ ...styles.inlineInput }}
                            value={draft}
                            onChange={(e) => setFolioDraft((p) => ({ ...p, [x.id]: e.target.value }))}
                            placeholder="Ej: CAP-2026-001"
                          />
                          <button
                            style={{ ...styles.inlineBtn, opacity: changed ? 1 : 0.55 }}
                            type="button"
                            disabled={!changed || busyId === x.id}
                            onClick={async () => {
                              const v = (folioDraft[x.id] || "").trim();
                              if (!v) return alert("El folio no puede ir vacío.");
                              try {
                                setBusyId(x.id);
                                await saveFolioBackend(x.id, v);
                                alert("Folio guardado ✅");
                              } catch (err: any) {
                                alert(apiMsg(err, "No se pudo guardar el folio."));
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            {busyId === x.id ? "..." : "Guardar"}
                          </button>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.cellTitle}>{x.title}</div>
                        <div style={styles.cellSub}>ID: {x.id}</div>
                      </td>

                      <td style={styles.td}>{x.book}</td>
                      <td style={styles.td}>{x.author}</td>
                      <td style={styles.td}>{x.evaluatorEmail || "—"}</td>

                      <td style={styles.td}>
                        <span style={{ ...styles.pill, ...pillTone(x.status) }}>{statusLabel(x.status)}</span>
                      </td>

                      <td style={styles.td}>{fmtDate(x.updatedAt)}</td>

                      {/* ✅ NUEVO */}
                      <td style={styles.td}>{x.deadlineAt ? fmtDate(x.deadlineAt) : "—"}</td>

                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button style={styles.linkBtn} onClick={() => nav(`/capitulos/${x.id}`)} type="button">
                            Ver
                          </button>

                          <button style={styles.secondaryBtn} onClick={() => openAction("ASIGNAR", x)} type="button">
                            Asignar
                          </button>

                          {/* ✅ QUITADOS: Corrección y Enviar */}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td style={styles.td} colSpan={9}>
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
        <div style={styles.modalOverlay} onClick={() => setActionOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Asignar dictaminador</div>

            <div style={styles.modalHint}>
              Capítulo: <b>{selected.title}</b> • Folio: <b>{selected.folio || "—"}</b>
            </div>

            <label style={styles.modalLabel}>Correo del dictaminador</label>
            <input
              style={styles.modalInput}
              value={actionForm.dictaminador}
              onChange={(e) => setActionForm((s) => ({ ...s, dictaminador: e.target.value }))}
              placeholder="ej: dictaminador@correo.com"
            />
            <div style={styles.modalInfo}>
              El correo debe existir en la tabla <b>users</b> y tener <b>role=dictaminador</b>.
            </div>

            {/* ✅ NUEVO: Fecha límite */}
            <label style={styles.modalLabel}>Fecha límite (dictaminador)</label>
            <input
              style={styles.modalInput}
              type="date"
              value={actionForm.deadlineAt}
              onChange={(e) => setActionForm((s) => ({ ...s, deadlineAt: e.target.value }))}
            />

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} type="button" onClick={() => setActionOpen(false)}>
                Cancelar
              </button>
              <button style={styles.primaryBtn} type="button" onClick={runAction} disabled={busyId === selected.id}>
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

function pillTone(s: Status): React.CSSProperties {
  if (s === "APROBADO" || s === "FIRMADO")
    return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (s === "CORRECCIONES" || s === "CORRECCIONES_SOLICITADAS_A_AUTOR")
    return { background: "#FFF6E5", color: "#9A5B00", borderColor: "#FFE0A3" };
  if (s === "EN_REVISION" || s === "EN_REVISION_DICTAMINADOR" || s === "ENVIADO_A_DICTAMINADOR")
    return { background: "#E9F2FF", color: "#1447B2", borderColor: "#C9DDFF" };
  if (s === "ASIGNADO_A_DICTAMINADOR" || s === "REVISADO_POR_EDITORIAL" || s === "LISTO_PARA_FIRMA")
    return { background: "#EEF2FF", color: "#3730A3", borderColor: "#C7D2FE" };
  if (s === "REENVIADO_POR_AUTOR") return { background: "#ECFDF5", color: "#065F46", borderColor: "#A7F3D0" };
  if (s === "RECHAZADO") return { background: "#FEECEC", color: "#B42318", borderColor: "#F9CACA" };
  return { background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
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

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  top: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

  empty: { padding: 20, color: "#6B7280" },

  errorBox: {
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#991B1B",
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 800,
  },

  filtersCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, padding: 12 },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "220px 220px 1fr 180px 180px 140px",
    gap: 10,
    alignItems: "end",
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 900, color: "#374151" },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  fieldActions: { display: "flex", justifyContent: "flex-end" },

  resultsRow: { marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  muted: { color: "#6B7280", fontSize: 12 },

  chips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: {
    display: "inline-block",
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  tableCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 12,
    padding: "10px 12px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E7EAF0",
    color: "#374151",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F5F9", fontSize: 13, color: "#111827", verticalAlign: "top" },

  cellTitle: { fontWeight: 900 },
  cellSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  pill: {
    display: "inline-block",
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  linkBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },
  secondaryBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },
  ghostBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },
  ghostBtnSmall: { padding: "8px 10px", borderRadius: 10, border: "1px solid #E7EAF0", background: "#fff", cursor: "pointer", fontWeight: 900 },
  primaryBtn: { padding: "10px 12px", borderRadius: 12, border: "none", background: "#0F3D3E", color: "#fff", cursor: "pointer", fontWeight: 900 },

  inlineInput: { width: 160, padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", outline: "none" },
  inlineBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(17,24,39,0.35)", display: "grid", placeItems: "center", padding: 16, zIndex: 999 },
  modal: { width: "100%", maxWidth: 560, background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, padding: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" },
  modalTitle: { fontWeight: 1000, color: "#111827", fontSize: 16, marginBottom: 8 },
  modalHint: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: 900, color: "#374151", marginTop: 10, display: "block" },
  modalInput: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, marginTop: 6, background: "#fff" },
  modalTextarea: { width: "100%", minHeight: 110, padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, marginTop: 6, resize: "vertical", background: "#fff" },
  modalInfo: { marginTop: 10, fontSize: 13, color: "#374151", background: "#F9FAFB", border: "1px solid #E7EAF0", padding: 12, borderRadius: 12 },
  modalActions: { marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 },
};