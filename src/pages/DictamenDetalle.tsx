import React, { useMemo, useState, type CSSProperties, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from './DictamenDetalle.module.css';

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

// ✅ Función para obtener la clase del pill según el estado del dictamen
function getStatusPillClass(status: DictamenStatus): string {
  const baseClass = styles.pill;
  
  if (status === "FIRMADO") return `${baseClass} ${styles.pillFirmado}`;
  if (status === "GENERADO") return `${baseClass} ${styles.pillGenerado}`;
  return `${baseClass} ${styles.pillBorrador}`;
}

// ✅ Función para obtener la clase del pill según la decisión
function getDecisionPillClass(decision: Decision): string {
  const baseClass = styles.pill;
  
  if (decision === "APROBADO") return `${baseClass} ${styles.pillApproved}`;
  if (decision === "CORRECCIONES") return `${baseClass} ${styles.pillCorrections}`;
  return `${baseClass} ${styles.pillRejected}`;
}

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

  // ✅ Tipado correcto
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
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <div className={styles.leftTop}>
          <button className={styles.backBtn} onClick={() => nav("/dictamenes")}>
            ← Volver
          </button>

          <div className={styles.titleBlock}>
            <h2 className={styles.h2}>Dictamen {base.folio}</h2>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <b>Capítulo:</b> {base.capitulo}
              </span>
              <span className={styles.metaDot}>•</span>
              <span className={styles.metaItem}>
                <b>Evaluador:</b> {base.evaluador}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.rightTop}>
          <div className={styles.kpiBox}>
            <div className={styles.kpiLabel}>Promedio</div>
            <div className={styles.kpiValue}>{promedio.toFixed(1)}</div>
          </div>

          <div className={styles.kpiBox}>
            <div className={styles.kpiLabel}>Estatus</div>
            <span className={getStatusPillClass(status)}>{statusLabel(status)}</span>
          </div>

          <div className={styles.kpiBox}>
            <div className={styles.kpiLabel}>Dictamen</div>
            <span className={getDecisionPillClass(decision)}>{decisionLabel(decision)}</span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Formulario */}
        <div className={styles.formCard}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.h3}>Formulario</h3>
              <p className={styles.p}>Criterios en escala 1 a 5. (demo)</p>
            </div>

            <button className={styles.secondaryBtn} onClick={guardar}>
              Guardar
            </button>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo</label>
              <input className={styles.input} value={base.tipo === "INVESTIGACION" ? "Investigación" : "Docencia"} readOnly />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Libro</label>
              <input className={styles.input} value={base.libro} readOnly />
            </div>

            <div className={styles.fieldWide}>
              <label className={styles.label}>Criterios (1–5)</label>

              <div className={styles.criteriaList}>
                {criterios.map((c) => (
                  <div key={c.key} className={styles.criteriaRow}>
                    <div className={styles.criteriaLabel}>{c.label}</div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={c.value}
                      onChange={(e) => setCriterio(c.key, Number(e.target.value))}
                      className={styles.range}
                    />
                    <div className={styles.criteriaValue}>{c.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.fieldWide}>
              <label className={styles.label}>Decisión</label>
              <select className={styles.input} value={decision} onChange={(e) => setDecision(e.target.value as Decision)}>
                <option value="APROBADO">Aprobado</option>
                <option value="CORRECCIONES">Correcciones</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>

            <div className={styles.fieldWide}>
              <label className={styles.label}>Comentarios</label>
              <textarea className={styles.textarea} value={comentarios} onChange={(e) => setComentarios(e.target.value)} rows={7} />
            </div>

            <div className={styles.fieldWide}>
              <label className={styles.label}>Conflictos de interés</label>
              <textarea className={styles.textarea} value={conflicto} onChange={(e) => setConflicto(e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        {/* Acciones / PDF / Firma */}
        <div className={styles.sideCard}>
          <h3 className={styles.h3}>PDF / Firma</h3>
          <p className={styles.p}>Generación y firmado dentro de la plataforma.</p>

          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>Generar dictamen PDF</div>
            <button className={styles.primaryBtn} onClick={generarPDF}>
              Generar PDF
            </button>
            <button
              className={styles.secondaryBtnFull}
              onClick={verPDF}
              disabled={status === "BORRADOR"}
              title={status === "BORRADOR" ? "Primero genera el PDF" : "Ver PDF"}
            >
              Ver PDF
            </button>
          </div>

          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>Firma del dictaminador (imagen)</div>
            <div className={styles.mutedSmall}>
              Se guarda por usuario (demo). En backend: se guardará ruta/archivo y auditoría.
            </div>

            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => onUploadSignature(e.target.files?.[0] ?? null)}
              className={styles.fileInput}
            />

            {signatureDataUrl ? (
              <div className={styles.sigPreviewWrap}>
                <div className={styles.mutedSmall}>Vista previa:</div>
                <img src={signatureDataUrl} alt="Firma" className={styles.sigPreview} />
                <button className={styles.ghostBtnFull} onClick={clearSignature}>
                  Quitar firma
                </button>
              </div>
            ) : (
              <div className={styles.mutedSmall}>Aún no has cargado firma.</div>
            )}

            <button className={styles.approveBtn} onClick={firmar} disabled={!validarParaFirmar}>
              Firmar dictamen (UI)
            </button>

            {!validarParaFirmar && (
              <div className={styles.mutedSmall}>
                Para firmar: PDF generado + decisión final (no “Correcciones”) + firma cargada.
              </div>
            )}
          </div>

          <div className={styles.actionBox}>
            <div className={styles.actionTitle}>Estado actual</div>
            <span className={getStatusPillClass(status)}>{statusLabel(status)}</span>
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