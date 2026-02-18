import React, { useEffect, useMemo, useState } from "react";
import { getDashboardSummary, DashboardSummary } from "../services/dashboard";

type Stat = {
  label: string;
  value: number;
  hint: string;
  tone: "neutral" | "info" | "warn" | "ok";
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const data = await getDashboardSummary();
        if (alive) setSummary(data);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ??
          "No se pudo cargar el dashboard (revisa que el backend esté encendido).";
        if (alive) setErrMsg(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const stats: Stat[] = useMemo(() => {
    const s = summary ?? {
      capitulos_recibidos_hoy: 0,
      en_revision: 0,
      correcciones: 0,
      aprobados: 0,
      constancias_pendientes: 0,
    };

    return [
      { label: "Capítulos recibidos", value: s.capitulos_recibidos_hoy, hint: "Hoy", tone: "info" },
      { label: "En revisión", value: s.en_revision, hint: "Activos", tone: "neutral" },
      { label: "Pendientes de corrección", value: s.correcciones, hint: "Requieren respuesta", tone: "warn" },
      { label: "Aprobados", value: s.aprobados, hint: "Listos", tone: "ok" },
      { label: "Constancias por emitir", value: s.constancias_pendientes, hint: "Pendientes", tone: "warn" },
    ];
  }, [summary]);

  return (
    <div style={styles.wrap}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Resumen del día</h2>
          <p style={styles.p}>
            {loading
              ? "Cargando datos reales..."
              : errMsg
              ? `Error: ${errMsg}`
              : "Datos reales desde el backend."}
          </p>
        </div>

        <button
          style={styles.refreshBtn}
          onClick={() => window.location.reload()}
          disabled={loading}
          title="Recargar"
        >
          {loading ? "..." : "Recargar"}
        </button>
      </div>

      <div style={styles.grid}>
        {stats.map((s) => (
          <div key={s.label} style={styles.card}>
            <div style={styles.cardTop}>
              <div style={styles.cardLabel}>{s.label}</div>
              <span style={{ ...styles.badge, ...badgeTone(s.tone) }}>{s.hint}</span>
            </div>
            <div style={styles.cardValue}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.h3}>Acciones rápidas</h3>
        <p style={styles.p2}>Atajos (después los conectamos a endpoints reales).</p>

        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={() => alert("Después: Crear libro")}>
            Crear libro
          </button>

          <button style={styles.actionBtn} onClick={() => alert("Después: Asignar dictaminador")}>
            Asignar dictaminador
          </button>

          <button style={styles.actionBtn} onClick={() => alert("Después: Generar constancias")}>
            Generar constancias
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.h3}>Pendientes</h3>
        <p style={styles.p2}>Esta tabla sigue “dummy” por ahora; luego la conectamos.</p>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Folio</th>
                <th style={styles.th}>Capítulo</th>
                <th style={styles.th}>Libro</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>DIC-2026-02-001</td>
                <td style={styles.td}>Educación y talento</td>
                <td style={styles.td}>Libro 1</td>
                <td style={styles.td}>
                  <span style={{ ...styles.statePill, ...badgeTone("warn") }}>Correcciones</span>
                </td>
                <td style={styles.td}>
                  <button style={styles.linkBtn} onClick={() => alert("Después: abrir detalle del capítulo")}>
                    Ver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function badgeTone(tone: "neutral" | "info" | "warn" | "ok"): React.CSSProperties {
  if (tone === "ok") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (tone === "warn") return { background: "#FFF6E5", color: "#9A5B00", borderColor: "#FFE0A3" };
  if (tone === "info") return { background: "#E9F2FF", color: "#1447B2", borderColor: "#C9DDFF" };
  return { background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  topRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280", maxWidth: 700 },

  refreshBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(160px, 1fr))",
    gap: 12,
  },

  card: {
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
    minWidth: 0,
  },
  cardTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  cardLabel: { fontSize: 13, color: "#374151", fontWeight: 700, minWidth: 0 },
  badge: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid",
    whiteSpace: "nowrap",
  },
  cardValue: { marginTop: 10, fontSize: 28, fontWeight: 900, color: "#111827" },

  section: {
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 14,
  },
  h3: { margin: 0, fontSize: 16, color: "#111827" },
  p2: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

  actions: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  actionBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    background: "#0F3D3E",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },

  tableCard: {
    marginTop: 12,
    borderRadius: 14,
    border: "1px solid #E7EAF0",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 12,
    padding: "10px 12px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E7EAF0",
    color: "#374151",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #F1F5F9",
    fontSize: 13,
    color: "#111827",
    verticalAlign: "middle",
  },
  statePill: {
    display: "inline-block",
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
  },
  linkBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },
};
