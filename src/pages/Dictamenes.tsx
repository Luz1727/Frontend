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

// ✅ esto es lo único “nuevo”: tipo de respuesta del backend (misma info, solo nombres)
type AdminDictamenApi = {
  id: number;
  folio: string;
  capituloId: number | string;
  capitulo: string;
  libro: string;
  evaluador: string;
  decision: Decision;
  promedio: number;
  status: DictamenStatus;
  updatedAt: string; // ISO o YYYY-MM-DD
};

export default function Dictamenes() {
  const nav = useNavigate();

  // ✅ ahora sí viene de backend (sin seed fijo)
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | DictamenStatus>("ALL");
  const [decision, setDecision] = useState<"ALL" | Decision>("ALL");

  // ✅ cargar lista
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // ✅ ajusta URL si tu backend usa otra ruta
        const { data } = await api.get<AdminDictamenApi[]>("/admin/dictamenes");

        const mapped: Row[] = (data ?? []).map((d) => ({
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

        if (!alive) return;
        setRows(mapped);
      } catch (err: any) {
        if (!alive) return;
        const msg =
          err?.response?.data?.detail ??
          "No se pudieron cargar los dictámenes. Revisa backend, token y rol.";
        setErrorMsg(msg);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
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

  const touchRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
          : r
      )
    );
  };

  // ✅ helper: aplicar dictamen actualizado que regrese el backend
  const applyApiRow = (d: AdminDictamenApi) => {
    const updated: Row = {
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
    };

    setRows((prev) => prev.map((r) => (r.id === String(updated.id) ? updated : r)));
  };

  // ✅ Acciones reales (backend)
  const generarPdf = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    if (row.status === "FIRMADO") {
      alert("Este dictamen ya está firmado.");
      return;
    }

    try {
      setBusyId(id);
      // ✅ ajusta URL si tu backend usa otra ruta
      const { data } = await api.post<AdminDictamenApi>(`/admin/dictamenes/${Number(id)}/generate-pdf`);
      if (data) applyApiRow(data);
      else touchRow(id, { status: "GENERADO" });
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo generar el PDF.");
    } finally {
      setBusyId(null);
    }
  };

  const marcarFirmado = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    if (row.status === "BORRADOR") {
      alert("Primero genera el PDF antes de firmar.");
      return;
    }

    try {
      setBusyId(id);
      // ✅ ajusta URL si tu backend usa otra ruta
      const { data } = await api.post<AdminDictamenApi>(`/admin/dictamenes/${Number(id)}/mark-signed`);
      if (data) applyApiRow(data);
      else touchRow(id, { status: "FIRMADO" });
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo marcar como firmado.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div>
          <h2 style={styles.h2}>Dictámenes</h2>
          <p style={styles.p}>Tabla global. Abre un dictamen para editar y generar PDF.</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.muted}>Cargando dictámenes...</div>
      ) : errorMsg ? (
        <div style={styles.errorBox}>{errorMsg}</div>
      ) : null}

      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
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
              <option value="GENERADO">PDF generado</option>
              <option value="FIRMADO">Firmado</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Dictamen</label>
            <select
              style={styles.input}
              value={decision}
              onChange={(e) => setDecision(e.target.value as "ALL" | Decision)}
            >
              <option value="ALL">Todos</option>
              <option value="APROBADO">Aprobado</option>
              <option value="CORRECCIONES">Correcciones</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>
        </div>

        <div style={styles.resultsRow}>
          <span style={styles.muted}>
            Mostrando <b>{filtered.length}</b> de {rows.length} dictámenes
          </span>
        </div>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Folio</th>
              <th style={styles.th}>Capítulo</th>
              <th style={styles.th}>Libro</th>
              <th style={styles.th}>Evaluador</th>
              <th style={styles.th}>Promedio</th>
              <th style={styles.th}>Dictamen</th>
              <th style={styles.th}>Estatus</th>
              <th style={styles.th}>Actualizado</th>
              <th style={styles.th}>Acción</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((x) => (
              <tr key={x.id}>
                <td style={styles.td}>{x.folio}</td>

                <td style={styles.td}>
                  <div style={styles.cellTitle}>{x.capitulo}</div>
                  <div style={styles.cellSub}>ID: {x.id}</div>

                  <div style={{ marginTop: 8 }}>
                    <button
                      style={styles.smallLinkBtn}
                      type="button"
                      onClick={() => nav(`/capitulos/${x.capituloId}`)}
                    >
                      Ver capítulo
                    </button>
                  </div>
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

                  <div style={styles.inlineActions}>
                    <button
                      style={styles.miniBtn}
                      type="button"
                      onClick={() => generarPdf(x.id)}
                      disabled={x.status === "FIRMADO" || busyId === x.id}
                      title="Generar el PDF del dictamen"
                    >
                      {busyId === x.id ? "..." : "Generar PDF"}
                    </button>
                    <button
                      style={styles.miniBtn}
                      type="button"
                      onClick={() => marcarFirmado(x.id)}
                      disabled={x.status === "FIRMADO" || busyId === x.id}
                      title="Marcar como firmado"
                    >
                      {busyId === x.id ? "..." : "Firmar"}
                    </button>
                  </div>
                </td>

                <td style={styles.td}>{fmtDate(x.updatedAt)}</td>

                <td style={styles.td}>
                  <button
                    style={styles.linkBtn}
                    type="button"
                    onClick={() => nav(`/dictamenes/${x.id}`)}
                  >
                    Abrir
                  </button>
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
  );
}

function decisionLabel(d: Decision) {
  if (d === "APROBADO") return "Aprobado";
  if (d === "CORRECCIONES") return "Correcciones";
  return "Rechazado";
}
function statusLabel(s: DictamenStatus) {
  if (s === "BORRADOR") return "Borrador";
  if (s === "GENERADO") return "PDF generado";
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

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 14, fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  top: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

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
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, padding: "10px 12px", background: "#F9FAFB", borderBottom: "1px solid #E7EAF0", color: "#374151" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F5F9", fontSize: 13, color: "#111827", verticalAlign: "top" },

  cellTitle: { fontWeight: 900 },
  cellSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  pill: { display: "inline-block", fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid", fontWeight: 900, whiteSpace: "nowrap" },

  inlineActions: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" },
  miniBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  },

  linkBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },

  smallLinkBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  },
};
