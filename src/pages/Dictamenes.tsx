import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import styles from "./Dictamenes.module.css";

type Decision = "APROBADO" | "CORRECCIONES" | "RECHAZADO";
type DictamenStatus = "BORRADOR" | "GENERADO" | "FIRMADO";

type Row = {
  id: string;
  folio: string;         // folio del capítulo (si existe)
  dictamenFolio: string; // folio real del dictamen
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
  folio: string; // dictamenes.folio
  chapterFolio?: string | null; // chapters.folio
  capituloId: number;
  capitulo: string;
  libro: string;
  evaluador: string;
  decision: Decision;
  promedio: number;
  status: DictamenStatus;
  updatedAt?: string | null;
};

function getDecisionPillClass(decision: Decision) {
  const base = styles.pill;
  if (decision === "APROBADO") return `${base} ${styles.pillApproved}`;
  if (decision === "CORRECCIONES") return `${base} ${styles.pillCorrections}`;
  return `${base} ${styles.pillRejected}`;
}

function getStatusPillClass(status: DictamenStatus) {
  const base = styles.pill;
  if (status === "FIRMADO") return `${base} ${styles.pillFirmado}`;
  if (status === "GENERADO") return `${base} ${styles.pillGenerado}`;
  return `${base} ${styles.pillBorrador}`;
}

function getStatusChipClass(status: DictamenStatus) {
  const base = styles.chip;
  if (status === "FIRMADO") return `${base} ${styles.chipFirmado}`;
  if (status === "GENERADO") return `${base} ${styles.chipGenerado}`;
  return `${base} ${styles.chipBorrador}`;
}

function getDecisionChipClass(decision: Decision) {
  const base = styles.chip;
  if (decision === "APROBADO") return `${base} ${styles.chipAprobado}`;
  if (decision === "CORRECCIONES") return `${base} ${styles.chipCorrecciones}`;
  return `${base} ${styles.chipRechazado}`;
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
        folio: chapterFolio || dictamenFolio || "—",
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
      setErrorMsg(err?.response?.data?.detail ?? "No se pudieron cargar los dictámenes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((x) => {
      if (status !== "ALL" && x.status !== status) return false;
      if (decision !== "ALL" && x.decision !== decision) return false;
      if (!qq) return true;

      const blob = `${x.folio} ${x.dictamenFolio} ${x.capitulo} ${x.evaluador} ${x.libro}`.toLowerCase();
      return blob.includes(qq);
    });
  }, [rows, q, status, decision]);

  const stats = useMemo(() => {
    const out = { BORRADOR: 0, GENERADO: 0, FIRMADO: 0, APROBADO: 0, CORRECCIONES: 0, RECHAZADO: 0 };
    for (const r of filtered) {
      out[r.status] += 1 as any;
      out[r.decision] += 1 as any;
    }
    return out;
  }, [filtered]);

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

  const download = async (row: Row, format: "pdf" | "docx") => {
    try {
      setBusyId(row.id);

      const res = await api.get(`/admin/dictamenes/${Number(row.id)}/download?format=${format}`, {
        responseType: "blob",
      });

      const contentType =
        (res.headers?.["content-type"] as string | undefined) ||
        (format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

      const blob = new Blob([res.data], { type: contentType });

      const cd = res.headers?.["content-disposition"] as string | undefined;
      const fromHeader = cd ? /filename="?([^"]+)"?/i.exec(cd)?.[1] : undefined;

      const baseFolio = row.folio && row.folio !== "—" ? row.folio : row.dictamenFolio;
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

          <div className={styles.chips}>
            <span className={getStatusChipClass("BORRADOR")}>Borrador: {stats.BORRADOR}</span>
            <span className={getStatusChipClass("GENERADO")}>Generado: {stats.GENERADO}</span>
            <span className={getStatusChipClass("FIRMADO")}>Firmado: {stats.FIRMADO}</span>

            <span className={getDecisionChipClass("APROBADO")}>Aprobado: {stats.APROBADO}</span>
            <span className={getDecisionChipClass("CORRECCIONES")}>Correcciones: {stats.CORRECCIONES}</span>
            <span className={getDecisionChipClass("RECHAZADO")}>Rechazado: {stats.RECHAZADO}</span>
          </div>
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
                    <span className={getDecisionPillClass(x.decision)}>{decisionLabel(x.decision)}</span>
                  </td>

                  <td className={styles.td}>
                    <span className={getStatusPillClass(x.status)}>{statusLabel(x.status)}</span>
                  </td>

                  <td className={styles.td}>{fmtDate(x.updatedAt)}</td>

                  <td className={styles.td}>
                    <div className={styles.inlineActions}>
                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => nav(`/dictamenes/${x.id}/documento`)}
                      >
                        Documento
                      </button>

                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => renderDoc(x.id)}
                        disabled={busyId === x.id}
                      >
                        {busyId === x.id ? "..." : "Generar"}
                      </button>

                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => download(x, "pdf")}
                        disabled={x.status === "BORRADOR" || busyId === x.id}
                      >
                        PDF
                      </button>

                      <button
                        className={styles.miniBtn}
                        type="button"
                        onClick={() => download(x, "docx")}
                        disabled={x.status === "BORRADOR" || busyId === x.id}
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

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim();
}