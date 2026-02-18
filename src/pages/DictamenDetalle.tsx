import React, { useMemo, useState, type CSSProperties, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Decision = "APROBADO" | "CORRECCIONES" | "RECHAZADO";
type DictamenStatus = "BORRADOR" | "GENERADO" | "FIRMADO";

type Criterio = {
  key: string;
  label: string;
  value: number;
};

type Dictamen = {
  id: string;
  folio: string;
  capitulo: string;
  libro: string;
  evaluador: string;
  tipo: "INVESTIGACION" | "DOCENCIA";
  status: DictamenStatus;
  decision: Decision;
  criterios: Criterio[];
  comentarios: string;
  conflictoInteres: string;
};

type User = {
  id: number | string;
  name: string;
  email: string;
  role: "editorial" | "dictaminador" | "autor";
};

export default function DictamenDetalle() {
  const nav = useNavigate();
  const { id } = useParams();

  const base = useMemo(() => seedDictamen(id ?? "unknown"), [id]);

  const [status, setStatus] = useState<DictamenStatus>(base.status);
  const [decision, setDecision] = useState<Decision>(base.decision);
  const [criterios, setCriterios] = useState<Criterio[]>(base.criterios);
  const [comentarios, setComentarios] = useState<string>(base.comentarios);
  const [conflicto, setConflicto] = useState<string>(base.conflictoInteres);

  // ✅ Usuario en sesión (mock por ahora)
  const userRaw = localStorage.getItem("user");
  const user: User | null = useMemo(() => {
    if (!userRaw) return null;
    try {
      return JSON.parse(userRaw) as User;
    } catch {
      return null;
    }
  }, [userRaw]);

  // ✅ Firma guardada como imagen (base64) por dictaminador
  const signatureKey = useMemo(() => {
    const who = user?.email || user?.name || "unknown";
    return `sig:${who}`;
  }, [user?.email, user?.name]);

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(signatureKey);
    setSignatureDataUrl(saved || null);
  }, [signatureKey]);

  const promedio = useMemo(() => {
    const sum = criterios.reduce((a, c) => a + c.value, 0);
    return criterios.length ? sum / criterios.length : 0;
  }, [criterios]);

  const setCriterio = (key: string, value: number) => {
    setCriterios((prev) => prev.map((c) => (c.key === key ? { ...c, value } : c)));
  };

  const guardar = () => {
    alert("Después: guardar en backend (dictamen).");
  };

  const generarPDF = () => {
    setStatus("GENERADO");
    alert("PDF generado (demo). Después: generar PDF real con plantilla.");
  };

  const verPDF = () => {
    alert("Después: visor PDF (embed) con archivo real.");
  };

  // ✅ Tipado correcto (ya no 'any')
  const validarParaFirmar: boolean =
    status === "GENERADO" &&
    decision !== "CORRECCIONES" &&
    !!signatureDataUrl &&
    (user?.role === "dictaminador" || user?.role === "editorial");

  const firmar = () => {
    if (!validarParaFirmar) {
      alert("Para firmar: genera el PDF, selecciona decisión final y carga una firma.");
      return;
    }
    setStatus("FIRMADO");
    alert("Firmado (demo). Después: insertar firma en PDF y sellar auditoría en backend.");
  };

  const onUploadSignature = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Sube una imagen (PNG/JPG).");
      return;
    }
    const dataUrl = await readFileAsDataURL(file);
    localStorage.setItem(signatureKey, dataUrl);
    setSignatureDataUrl(dataUrl);
    alert("Firma guardada (demo) para este dictaminador.");
  };

  const clearSignature = () => {
    localStorage.removeItem(signatureKey);
    setSignatureDataUrl(null);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.topBar}>
        <div style={styles.leftTop}>
          <button style={styles.backBtn} onClick={() => nav("/dictamenes")}>
            ← Volver
          </button>

          <div style={styles.titleBlock}>
            <h2 style={styles.h2}>Dictamen {base.folio}</h2>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                <b>Capítulo:</b> {base.capitulo}
              </span>
              <span style={styles.metaDot}>•</span>
              <span style={styles.metaItem}>
                <b>Evaluador:</b> {base.evaluador}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.rightTop}>
          <div style={styles.kpiBox}>
            <div style={styles.kpiLabel}>Promedio</div>
            <div style={styles.kpiValue}>{promedio.toFixed(1)}</div>
          </div>

          <div style={styles.kpiBox}>
            <div style={styles.kpiLabel}>Estatus</div>
            <span style={{ ...styles.pill, ...statusTone(status) }}>{statusLabel(status)}</span>
          </div>

          <div style={styles.kpiBox}>
            <div style={styles.kpiLabel}>Dictamen</div>
            <span style={{ ...styles.pill, ...decisionTone(decision) }}>{decisionLabel(decision)}</span>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Formulario */}
        <div style={styles.formCard}>
          <div style={styles.sectionTop}>
            <div>
              <h3 style={styles.h3}>Formulario</h3>
              <p style={styles.p}>Criterios en escala 1 a 5. (demo)</p>
            </div>

            <button style={styles.secondaryBtn} onClick={guardar}>
              Guardar
            </button>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Tipo</label>
              <input style={styles.input} value={base.tipo === "INVESTIGACION" ? "Investigación" : "Docencia"} readOnly />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Libro</label>
              <input style={styles.input} value={base.libro} readOnly />
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>Criterios (1–5)</label>

              <div style={styles.criteriaList}>
                {criterios.map((c) => (
                  <div key={c.key} style={styles.criteriaRow}>
                    <div style={styles.criteriaLabel}>{c.label}</div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={c.value}
                      onChange={(e) => setCriterio(c.key, Number(e.target.value))}
                      style={styles.range}
                    />
                    <div style={styles.criteriaValue}>{c.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>Decisión</label>
              <select style={styles.input} value={decision} onChange={(e) => setDecision(e.target.value as Decision)}>
                <option value="APROBADO">Aprobado</option>
                <option value="CORRECCIONES">Correcciones</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>Comentarios</label>
              <textarea style={styles.textarea} value={comentarios} onChange={(e) => setComentarios(e.target.value)} rows={7} />
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>Conflictos de interés</label>
              <textarea style={styles.textarea} value={conflicto} onChange={(e) => setConflicto(e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        {/* Acciones / PDF / Firma */}
        <div style={styles.sideCard}>
          <h3 style={styles.h3}>PDF / Firma</h3>
          <p style={styles.p}>Generación y firmado dentro de la plataforma.</p>

          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>Generar dictamen PDF</div>
            <button style={styles.primaryBtn} onClick={generarPDF}>
              Generar PDF
            </button>
            <button
              style={styles.secondaryBtnFull}
              onClick={verPDF}
              disabled={status === "BORRADOR"}
              title={status === "BORRADOR" ? "Primero genera el PDF" : "Ver PDF"}
            >
              Ver PDF
            </button>
          </div>

          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>Firma del dictaminador (imagen)</div>
            <div style={styles.mutedSmall}>
              Se guarda por usuario (demo). En backend: se guardará ruta/archivo y auditoría.
            </div>

            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => onUploadSignature(e.target.files?.[0] ?? null)}
              style={styles.fileInput}
            />

            {signatureDataUrl ? (
              <div style={styles.sigPreviewWrap}>
                <div style={styles.mutedSmall}>Vista previa:</div>
                <img src={signatureDataUrl} alt="Firma" style={styles.sigPreview} />
                <button style={styles.ghostBtnFull} onClick={clearSignature}>
                  Quitar firma
                </button>
              </div>
            ) : (
              <div style={styles.mutedSmall}>Aún no has cargado firma.</div>
            )}

            <button style={styles.approveBtn} onClick={firmar} disabled={!validarParaFirmar}>
              Firmar dictamen (UI)
            </button>

            {!validarParaFirmar && (
              <div style={styles.mutedSmall}>
                Para firmar: PDF generado + decisión final (no “Correcciones”) + firma cargada.
              </div>
            )}
          </div>

          <div style={styles.actionBox}>
            <div style={styles.actionTitle}>Estado actual</div>
            <span style={{ ...styles.pill, ...statusTone(status) }}>{statusLabel(status)}</span>
          </div>
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
  if (s === "GENERADO") return "PDF generado";
  return "Firmado";
}
function decisionTone(d: Decision): CSSProperties {
  if (d === "APROBADO") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (d === "CORRECCIONES") return { background: "#FFF6E5", color: "#9A5B00", borderColor: "#FFE0A3" };
  return { background: "#FEECEC", color: "#B42318", borderColor: "#F9CACA" };
}
function statusTone(s: DictamenStatus): CSSProperties {
  if (s === "FIRMADO") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (s === "GENERADO") return { background: "#E9F2FF", color: "#1447B2", borderColor: "#C9DDFF" };
  return { background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
}

function seedDictamen(id: string): Dictamen {
  return {
    id,
    folio: "DIC-2026-02-001",
    capitulo: "Educación y talento",
    libro: "Libro 1",
    evaluador: "Dra. Carmen Rivera",
    tipo: "INVESTIGACION",
    status: "BORRADOR",
    decision: "CORRECCIONES",
    criterios: [
      { key: "c1", label: "Pertinencia del tema", value: 4 },
      { key: "c2", label: "Rigor metodológico", value: 4 },
      { key: "c3", label: "Estructura y coherencia", value: 3 },
      { key: "c4", label: "Aportes / originalidad", value: 4 },
      { key: "c5", label: "Redacción y formato", value: 3 },
    ],
    comentarios:
      "Se sugiere fortalecer el marco teórico y ajustar referencias a un formato uniforme. Revisar congruencia entre objetivos y conclusiones.",
    conflictoInteres: "Ninguno.",
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },
  topBar: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  leftTop: { display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 },
  backBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" },
  titleBlock: { minWidth: 0 },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  metaRow: { marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  metaItem: { fontSize: 13, color: "#374151" },
  metaDot: { color: "#9CA3AF" },

  rightTop: { display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" },
  kpiBox: { border: "1px solid #E7EAF0", borderRadius: 14, padding: 10, minWidth: 160, background: "#F9FAFB" },
  kpiLabel: { fontSize: 12, color: "#6B7280", fontWeight: 900 },
  kpiValue: { marginTop: 4, fontSize: 18, fontWeight: 1000, color: "#111827" },

  grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 12, alignItems: "start" },

  formCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, padding: 14 },
  sideCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12 },

  sectionTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  h3: { margin: 0, fontSize: 16, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

  formGrid: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldWide: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 },

  label: { fontSize: 13, fontWeight: 900, color: "#374151" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, background: "#fff" },
  textarea: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, resize: "vertical" },

  criteriaList: { display: "flex", flexDirection: "column", gap: 10, padding: 12, border: "1px solid #E7EAF0", borderRadius: 14, background: "#F9FAFB" },
  criteriaRow: { display: "grid", gridTemplateColumns: "1fr 180px 30px", gap: 10, alignItems: "center" },
  criteriaLabel: { fontSize: 13, fontWeight: 900, color: "#111827" },
  range: { width: "100%" },
  criteriaValue: { fontWeight: 1000, textAlign: "right" },

  actionBox: { border: "1px solid #E7EAF0", borderRadius: 14, padding: 12, background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 8 },
  actionTitle: { fontWeight: 1000, color: "#111827", fontSize: 13 },
  mutedSmall: { color: "#6B7280", fontSize: 12 },

  fileInput: { width: "100%" },
  sigPreviewWrap: { display: "flex", flexDirection: "column", gap: 8, marginTop: 6 },
  sigPreview: { width: "100%", maxHeight: 120, objectFit: "contain", background: "#fff", border: "1px dashed #D8DEE9", borderRadius: 12, padding: 8 },

  primaryBtn: { padding: "10px 12px", borderRadius: 12, border: "none", background: "#0F3D3E", color: "#fff", cursor: "pointer", fontWeight: 1000 },
  secondaryBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 1000 },
  secondaryBtnFull: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 1000, width: "100%" },

  approveBtn: { padding: "10px 12px", borderRadius: 12, border: "none", background: "#0A7A35", color: "#fff", cursor: "pointer", fontWeight: 1000 },
  ghostBtnFull: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 1000, width: "100%" },

  pill: { display: "inline-block", fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid", fontWeight: 900, whiteSpace: "nowrap" },
};
