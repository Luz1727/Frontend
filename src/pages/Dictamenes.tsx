// src/pages/Dictamenes.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

type Decision = "APROBADO" | "CORRECCIONES" | "RECHAZADO";
type DictamenStatus = "BORRADOR" | "GENERADO" | "FIRMADO";

type Row = {
  id: string;
  folio: string;
  capituloId: string;
  capitulo: string;
  libro: string;
  evaluador: string;
  decision: Decision;
  promedio: number;
  status: DictamenStatus;
  updatedAt: string; // YYYY-MM-DD
};

type AdminDictamenApi = {
  id: number;
  folio: string;
  capituloId: number;
  capitulo: string;
  libro: string;
  evaluador: string;
  decision: Decision;
  promedio: number;
  status: DictamenStatus;
  updatedAt?: string | null;
};

export default function Dictamenes() {
  const nav = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | DictamenStatus>("ALL");
  const [decision, setDecision] = useState<"ALL" | Decision>("ALL");

  const mapApi = (data: AdminDictamenApi[] = []): Row[] =>
    data.map((d) => ({
      id: String(d.id),
      folio: d.folio ?? "—",
      capituloId: String(d.capituloId ?? ""),
      capitulo: d.capitulo ?? "—",
      libro: d.libro ?? "—",
      evaluador: d.evaluador ?? "—",
      decision: d.decision,
      promedio: Number(d.promedio ?? 0),
      status: d.status,
      updatedAt: (d.updatedAt || "").slice(0, 10),
    }));

  const load = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.get<AdminDictamenApi[]>("/admin/dictamenes");
      setRows(mapApi(data ?? []));
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail ??
          "No se pudieron cargar los dictámenes. Revisa backend, token y rol."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((x) => {
      if (status !== "ALL" && x.status !== status) return false;
      if (decision !== "ALL" && x.decision !== decision) return false;

      if (!qq) return true;
      const blob = `${x.folio} ${x.capitulo} ${x.evaluador} ${x.libro}`.toLowerCase();
      return blob.includes(qq);
    });
  }, [rows, q, status, decision]);

  const renderDoc = async (id: string) => {
    try {
      setBusyId(id);
      await api.post(`/admin/dictamenes/${Number(id)}/render-document`);
      await load();
      alert("Documento generado (DOCX + PDF).");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo generar el documento.");
    } finally {
      setBusyId(null);
    }
  };

  // ✅ DESCARGA con TOKEN (Bearer) usando blob
  const download = async (row: Row, format: "pdf" | "docx") => {
    try {
      setBusyId(row.id);

      const res = await api.get(
        `/admin/dictamenes/${Number(row.id)}/download?format=${format}`,
        { responseType: "blob" }
      );

      const contentType =
        (res.headers?.["content-type"] as string | undefined) ||
        (format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

      const blob = new Blob([res.data], { type: contentType });

      // Si backend manda Content-Disposition, lo intentamos leer
      const cd = res.headers?.["content-disposition"] as string | undefined;
      const fromHeader = cd ? /filename="?([^"]+)"?/i.exec(cd)?.[1] : undefined;

      const fallback = `dictamen-${row.folio || row.id}.${format}`;
      const filename = sanitizeFilename(fromHeader || fallback);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo descargar el archivo.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={styles.wrap}>
      <style>{responsiveCss}</style>

      <div style={styles.top}>
        <div style={{ minWidth: 0 }}>
          <h2 style={styles.h2}>Dictámenes</h2>
          <p style={styles.p}>
            Emite el documento con plantilla Word: editar datos, generar DOCX/PDF y descargar (con token).
          </p>
        </div>

        <button style={styles.refreshBtn} onClick={load} disabled={loading}>
          {loading ? "..." : "Recargar"}
        </button>
      </div>

      {loading ? <div style={styles.muted}>Cargando dictámenes...</div> : null}
      {errorMsg ? <div style={styles.errorBox}>{errorMsg}</div> : null}

      <div style={styles.filtersCard}>
        <div className="d-grid" style={styles.filtersGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Buscar</label>
            <input
              style={styles.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Folio, capítulo, evaluador..."
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Estatus</label>
            <select
              style={styles.input}
              value={status}
              onChange={(e) => setStatus(e.target.value as "ALL" | DictamenStatus)}
            >
              <option value="ALL">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="GENERADO">Generado</option>
              <option value="FIRMADO">Firmado</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Decisión</label>
            <select
              style={styles.input}
              value={decision}
              onChange={(e) => setDecision(e.target.value as "ALL" | Decision)}
            >
              <option value="ALL">Todas</option>
              <option value="APROBADO">Aprobado</option>
              <option value="CORRECCIONES">Correcciones</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>
        </div>

        <div style={styles.resultsRow}>
          <span style={styles.muted}>
            Mostrando <b>{filtered.length}</b> de {rows.length}
          </span>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Folio</th>
                <th style={styles.th}>Capítulo</th>
                <th style={styles.th}>Libro</th>
                <th style={styles.th}>Evaluador</th>
                <th style={styles.th}>Promedio</th>
                <th style={styles.th}>Decisión</th>
                <th style={styles.th}>Estatus</th>
                <th style={styles.th}>Actualizado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td style={styles.td}>
                    <div style={styles.cellTitle}>{x.folio}</div>
                    <div style={styles.cellSub}>ID: {x.id}</div>
                  </td>

                  <td style={styles.td}>
                    <div style={styles.cellTitle}>{x.capitulo}</div>
                    <div style={styles.cellSub}>Capítulo ID: {x.capituloId}</div>
                  </td>

                  <td style={styles.td}>{x.libro}</td>
                  <td style={styles.td}>{x.evaluador}</td>
                  <td style={styles.td}>{x.promedio.toFixed(1)}</td>

                  <td style={styles.td}>
                    <span style={{ ...styles.pill, ...decisionTone(x.decision) }}>
                      {decisionLabel(x.decision)}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <span style={{ ...styles.pill, ...statusTone(x.status) }}>
                      {statusLabel(x.status)}
                    </span>
                  </td>

                  <td style={styles.td}>{fmtDate(x.updatedAt)}</td>

                  <td style={styles.td}>
                    <div style={styles.inlineActions}>
                      <button
                        style={styles.miniBtn}
                        type="button"
                        onClick={() => nav(`/dictamenes/${x.id}/documento`)}
                        title="Subir plantilla, editar datos y generar documento"
                      >
                        Documento
                      </button>

                      <button
                        style={styles.miniBtn}
                        type="button"
                        onClick={() => renderDoc(x.id)}
                        disabled={busyId === x.id}
                        title="Genera DOCX y PDF"
                      >
                        {busyId === x.id ? "..." : "Generar"}
                      </button>

                      <button
                        style={styles.miniBtn}
                        type="button"
                        onClick={() => download(x, "pdf")}
                        disabled={x.status === "BORRADOR" || busyId === x.id}
                        title="Descargar PDF"
                      >
                        PDF
                      </button>

                      <button
                        style={styles.miniBtn}
                        type="button"
                        onClick={() => download(x, "docx")}
                        disabled={x.status === "BORRADOR" || busyId === x.id}
                        title="Descargar DOCX"
                      >
                        DOCX
                      </button>
                    </div>

                    {x.status === "BORRADOR" ? (
                      <div style={styles.cellSub}>Primero sube plantilla y genera.</div>
                    ) : null}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={9}>
                    No hay resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function decisionLabel(d: Decision) {
  if (d === "APROBADO") return "Aprobado";
  if (d === "CORRECCIONES") return "Correcciones";
  return "Rechazado";
}
function statusLabel(s: DictamenStatus) {
  if (s === "BORRADOR") return "Borrador";
  if (s === "GENERADO") return "Generado";
  return "Firmado";
}

function decisionTone(d: Decision): React.CSSProperties {
  if (d === "APROBADO") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (d === "CORRECCIONES") return { background: "#FFF6E5", color: "#9A5B00", borderColor: "#FFE0A3" };
  return { background: "#FEECEC", color: "#B42318", borderColor: "#F9CACA" };
}
function statusTone(s: DictamenStatus): React.CSSProperties {
  if (s === "FIRMADO") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (s === "GENERADO") return { background: "#E9F2FF", color: "#1447B2", borderColor: "#C9DDFF" };
  return { background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}

// evita caracteres raros en el nombre de archivo
function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim();
}

const responsiveCss = `
@media (max-width: 980px){
  .d-grid{
    grid-template-columns: 1fr !important;
  }
}
`;

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: 12,
    maxWidth: 1200,
    margin: "0 auto",
  },
  top: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap" },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280", maxWidth: 720 },

  refreshBtn: { padding: "10px 12px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },

  errorBox: {
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#991B1B",
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 900,
  },

  filtersCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, padding: 12 },
  filtersGrid: { display: "grid", gridTemplateColumns: "1fr 220px 220px", gap: 10, alignItems: "end" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 900, color: "#374151" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, background: "#fff" },

  resultsRow: { marginTop: 10, display: "flex", justifyContent: "space-between" },
  muted: { color: "#6B7280", fontSize: 12 },

  tableCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, overflow: "hidden" },
  tableScroll: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  th: { textAlign: "left", fontSize: 12, padding: "10px 12px", background: "#F9FAFB", borderBottom: "1px solid #E7EAF0", color: "#374151" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F5F9", fontSize: 13, color: "#111827", verticalAlign: "top" },

  cellTitle: { fontWeight: 900 },
  cellSub: { fontSize: 11, color: "#6B7280", marginTop: 4 },

  pill: { display: "inline-block", fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid", fontWeight: 900, whiteSpace: "nowrap" },

  inlineActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  miniBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  },
};