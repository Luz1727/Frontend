import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import styles from './Dictamenes.module.css';

type Decision = "APROBADO" | "CORRECCIONES" | "RECHAZADO";
type DictamenStatus = "BORRADOR" | "GENERADO" | "FIRMADO";

type Row = {
  id: string;
  // ✅ folio que se muestra como principal (folio del capítulo)
  folio: string;
  // ✅ folio real del dictamen (para referencia/descargas)
  dictamenFolio: string;
  capituloId: string;
  capitulo: string;
  libro: string;
  evaluador: string;
  decision: Decision;
  promedio: number;
  status: DictamenStatus;
  updatedAt: string;
};

type AdminDictamenApi = {
  id: number;
  folio: string; // folio del dictamen (dictamenes.folio)
  // ✅ folio del capítulo (chapters.folio) agregado desde backend
  chapterFolio?: string | null;
  capituloId: number;
  capitulo: string;
  libro: string;
  evaluador: string;
  decision: Decision;
  promedio: number;
  status: DictamenStatus;
  updatedAt?: string | null;
};

// ✅ Función para obtener la clase del pill según la decisión
function getDecisionPillClass(decision: Decision): string {
  const baseClass = styles.pill;
  
  if (decision === "APROBADO") return `${baseClass} ${styles.pillApproved}`;
  if (decision === "CORRECCIONES") return `${baseClass} ${styles.pillCorrections}`;
  return `${baseClass} ${styles.pillRejected}`;
}

// ✅ Función para obtener la clase del pill según el estado
function getStatusPillClass(status: DictamenStatus): string {
  const baseClass = styles.pill;
  
  if (status === "FIRMADO") return `${baseClass} ${styles.pillFirmado}`;
  if (status === "GENERADO") return `${baseClass} ${styles.pillGenerado}`;
  return `${baseClass} ${styles.pillBorrador}`;
}

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
    data.map((d) => {
      const chapterFolio = (d.chapterFolio || "").trim();
      const dictamenFolio = (d.folio || "").trim();

      return {
        id: String(d.id),
        // ✅ Folio que se muestra en la tabla: prioriza folio del capítulo
        folio: chapterFolio || dictamenFolio || "—",
        // ✅ Folio real del dictamen siempre guardado aparte
        dictamenFolio: dictamenFolio || "—",
        capituloId: String(d.capituloId ?? ""),
        capitulo: d.capitulo ?? "—",
        libro: d.libro ?? "—",
        evaluador: d.evaluador ?? "—",
        decision: d.decision,
        promedio: Number(d.promedio ?? 0),
        status: d.status,
        updatedAt: (d.updatedAt || "").slice(0, 10),
      };
    });

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

      // ✅ Buscar por folio capitulo + folio dictamen + texto (mejora de tu compañera)
      const blob = `${x.folio} ${x.dictamenFolio} ${x.capitulo} ${x.evaluador} ${x.libro}`.toLowerCase();
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

      // ✅ Nombre: preferir folio del capítulo (row.folio) y si no, el del dictamen (mejora de tu compañera)
      const baseFolio = (row.folio && row.folio !== "—") ? row.folio : row.dictamenFolio;
      const fallback = `dictamen-${baseFolio || row.id}.${format}`;
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
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div style={{ minWidth: 0 }}>
          <h2 className={styles.h2}>Dictámenes</h2>
          <p className={styles.p}>
            Emite el documento con plantilla Word: editar datos, generar DOCX/PDF y descargar (con token).
          </p>
        </div>

        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          {loading ? "..." : "Recargar"}
        </button>
      </div>

      {loading ? <div className={styles.muted}>Cargando dictámenes...</div> : null}
      {errorMsg ? <div className={styles.errorBox}>{errorMsg}</div> : null}

      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Buscar</label>
            <input
              className={styles.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Folio capítulo, folio dictamen, capítulo, evaluador..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Estatus</label>
            <select
              className={styles.input}
              value={status}
              onChange={(e) => setStatus(e.target.value as "ALL" | DictamenStatus)}
            >
              <option value="ALL">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="GENERADO">Generado</option>
              <option value="FIRMADO">Firmado</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Decisión</label>
            <select
              className={styles.input}
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

        <div className={styles.resultsRow}>
          <span className={styles.muted}>
            Mostrando <b>{filtered.length}</b> de {rows.length}
          </span>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Folio (Capítulo)</th>
                <th className={styles.th}>Capítulo</th>
                <th className={styles.th}>Libro</th>
                <th className={styles.th}>Evaluador</th>
                <th className={styles.th}>Promedio</th>
                <th className={styles.th}>Decisión</th>
                <th className={styles.th}>Estatus</th>
                <th className={styles.th}>Actualizado</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td className={styles.td}>
                    <div className={styles.cellTitle}>{x.folio}</div>
                    <div className={styles.cellSub}>Dictamen: {x.dictamenFolio} • ID: {x.id}</div>
                  </td>

                  <td className={styles.td}>
                    <div className={styles.cellTitle}>{x.capitulo}</div>
                    <div className={styles.cellSub}>Capítulo ID: {x.capituloId}</div>
                  </td>

                  <td className={styles.td}>{x.libro}</td>
                  <td className={styles.td}>{x.evaluador}</td>
                  <td className={styles.td}>{x.promedio.toFixed(1)}</td>

                  <td className={styles.td}>
                    <span className={getDecisionPillClass(x.decision)}>
                      {decisionLabel(x.decision)}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <span className={getStatusPillClass(x.status)}>
                      {statusLabel(x.status)}
                    </span>
                  </td>

                  <td className={styles.td}>{fmtDate(x.updatedAt)}</td>

                  <td className={styles.td}>
                    <div className={styles.inlineActions}>
                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => nav(`/dictamenes/${x.id}/documento`)}
                        title="Subir plantilla, editar datos y generar documento"
                      >
                        Documento
                      </button>

                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => renderDoc(x.id)}
                        disabled={busyId === x.id}
                        title="Genera DOCX y PDF"
                      >
                        {busyId === x.id ? "..." : "Generar"}
                      </button>

                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => download(x, "pdf")}
                        disabled={x.status === "BORRADOR" || busyId === x.id}
                        title="Descargar PDF"
                      >
                        PDF
                      </button>

                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => download(x, "docx")}
                        disabled={x.status === "BORRADOR" || busyId === x.id}
                        title="Descargar DOCX"
                      >
                        DOCX
                      </button>
                    </div>

                    {x.status === "BORRADOR" ? (
                      <div className={styles.cellSub}>Primero sube plantilla y genera.</div>
                    ) : null}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={9}>
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