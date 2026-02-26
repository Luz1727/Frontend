import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import styles from './DictamenDocumento.module.css';

type DictamenStatus = "BORRADOR" | "GENERADO" | "FIRMADO";

type Detail = {
  id: number;
  folio: string;
  status: DictamenStatus;

  template_docx_path?: string | null;
  generated_docx_path?: string | null;
  pdf_path?: string | null;
  recipient_name?: string | null;
  constancia_data_json?: Record<string, any> | null;

  capituloId: number;
  capitulo: string;
  libro: string;
  evaluador: string;
};

function Field({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

export default function DictamenDocumento() {
  const { id } = useParams();
  const nav = useNavigate();
  const dictamenId = Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  // ✅ Campos de tu compañera (más completos)
  const [folioEdit, setFolioEdit] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [ciudadEstado, setCiudadEstado] = useState("");
  const [fechaEmisionTexto, setFechaEmisionTexto] = useState("");
  const [recipientInstitucion, setRecipientInstitucion] = useState("");
  const [cvu, setCvu] = useState("");
  const [capituloTitulo, setCapituloTitulo] = useState("");
  const [libroTitulo, setLibroTitulo] = useState("");
  const [entregaTexto, setEntregaTexto] = useState("");
  const [inicioTexto, setInicioTexto] = useState("");
  const [finTexto, setFinTexto] = useState("");
  const [cargoTexto, setCargoTexto] = useState("");
  const [firma1Nombre, setFirma1Nombre] = useState("");
  const [firma2Nombre, setFirma2Nombre] = useState("");

  // ✅ UI para plantilla (de tu compañera)
  const [storedTemplateName, setStoredTemplateName] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Detail>(`/admin/dictamenes/${dictamenId}`);
      setDetail(data);

      setFolioEdit(data.folio || "");

      const json = data.constancia_data_json || {};
      setRecipientName(data.recipient_name || "");

      // ✅ Todos los campos de tu compañera
      setCiudadEstado(json.ciudad_estado || "");
      setFechaEmisionTexto(json.fecha_emision_texto || "");
      setRecipientInstitucion(json.recipient_institucion || "");
      setCvu(json.cvu_snii || "");
      setCapituloTitulo(json.capitulo_titulo || "");
      setLibroTitulo(json.libro_titulo || "");
      setEntregaTexto(json.entrega_texto || "");
      setInicioTexto(json.inicio_dictamen_texto || "");
      setFinTexto(json.fin_dictamen_texto || "");
      setCargoTexto(json.cargo_texto || "");
      setFirma1Nombre(json.firma1_nombre || "");
      setFirma2Nombre(json.firma2_nombre || "");

      // ✅ Plantilla guardada
      if (data.template_docx_path) {
        const name = data.template_docx_path.split("\\").pop()?.split("/").pop();
        setStoredTemplateName(name || null);
      } else {
        setStoredTemplateName(null);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo cargar el dictamen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dictamenId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictamenId]);

  const uploadTemplate = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    try {
      setSaving(true);
      await api.post(`/admin/dictamenes/${dictamenId}/template`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
      setSelectedTemplateName(null);
      alert("Plantilla subida correctamente.");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al subir plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const saveData = async () => {
    try {
      setSaving(true);

      await api.put(`/admin/dictamenes/${dictamenId}/document-data`, {
        folio: folioEdit,
        recipient_name: recipientName,
        data: {
          ciudad_estado: ciudadEstado,
          fecha_emision_texto: fechaEmisionTexto,
          recipient_institucion: recipientInstitucion,
          cvu_snii: cvu,
          capitulo_titulo: capituloTitulo,
          libro_titulo: libroTitulo,
          entrega_texto: entregaTexto,
          inicio_dictamen_texto: inicioTexto,
          fin_dictamen_texto: finTexto,
          cargo_texto: cargoTexto,
          firma1_nombre: firma1Nombre,
          firma2_nombre: firma2Nombre,
        },
      });

      await load();
      alert("Datos guardados.");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  };

  const renderDocument = async () => {
    try {
      setSaving(true);
      await api.post(`/admin/dictamenes/${dictamenId}/render-document`);
      await load();
      alert("Documento generado correctamente.");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo generar el documento.");
    } finally {
      setSaving(false);
    }
  };

  const download = async (format: "docx" | "pdf") => {
    try {
      const res = await api.get(
        `/admin/dictamenes/${dictamenId}/download?format=${format}`,
        { responseType: "blob" }
      );

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dictamen-${detail?.folio || dictamenId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo descargar.");
    }
  };

  if (loading) return <div className={styles.wrap}>Cargando...</div>;
  if (!detail) return <div className={styles.wrap}>No encontrado</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>Documento del Dictamen</h2>
          <div className={styles.sub}>
            <b>Folio:</b> {detail.folio} · <b>Estatus:</b> {detail.status}
          </div>
          <div className={styles.sub}>
            <b>Capítulo:</b> {detail.capitulo} · <b>Libro:</b> {detail.libro} · <b>Evaluador:</b> {detail.evaluador}
          </div>
        </div>

        <button className={styles.backBtn} onClick={() => nav("/dictamenes")}>
          Volver
        </button>
      </div>

      {/* 1 Plantilla - Versión mejorada de tu compañera */}
      <div className={styles.card}>
        <h3>1) Subir Plantilla Word (.docx)</h3>
        
        {/* ✅ Input file sin disabled para que funcione correctamente */}
        <div style={{ pointerEvents: saving ? "none" : "auto", opacity: saving ? 0.85 : 1 }}>
          <input
            type="file"
            accept=".docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedTemplateName(file.name);
                uploadTemplate(file);
              }
            }}
            className={styles.fileInput}
          />
        </div>

        <div className={styles.muted}>
          {saving && selectedTemplateName ? (
            <span className={styles.warning}>⏳ Subiendo: {selectedTemplateName}</span>
          ) : storedTemplateName ? (
            <span className={styles.success}>✅ Plantilla actual: {storedTemplateName}</span>
          ) : (
            <span className={styles.warning}>⚠️ No hay plantilla subida</span>
          )}
        </div>
      </div>

      {/* 2 Datos - Versión completa de tu compañera con tus estilos */}
      <div className={styles.card}>
        <h3>2) Datos editables</h3>

        <div className={styles.grid}>
          <Field label="Folio (único)" value={folioEdit} onChange={setFolioEdit} disabled={saving} />
          <Field label="Dirigida a (nombre)" value={recipientName} onChange={setRecipientName} disabled={saving} />
          <Field label="Institución (destinatario)" value={recipientInstitucion} onChange={setRecipientInstitucion} disabled={saving} />
          <Field label="CVU / SNII" value={cvu} onChange={setCvu} disabled={saving} />
          <Field label="Ciudad y Estado" value={ciudadEstado} onChange={setCiudadEstado} disabled={saving} />
          <Field label="Fecha de emisión (texto)" value={fechaEmisionTexto} onChange={setFechaEmisionTexto} disabled={saving} />
          <Field label="Capítulo (título)" value={capituloTitulo} onChange={setCapituloTitulo} disabled={saving} />
          <Field label="Libro (título)" value={libroTitulo} onChange={setLibroTitulo} disabled={saving} />
          <Field label="Entrega (texto)" value={entregaTexto} onChange={setEntregaTexto} disabled={saving} />
          <Field label="Inicio dictamen (texto)" value={inicioTexto} onChange={setInicioTexto} disabled={saving} />
          <Field label="Fin dictamen (texto)" value={finTexto} onChange={setFinTexto} disabled={saving} />
          <Field label="Cargo (texto)" value={cargoTexto} onChange={setCargoTexto} disabled={saving} />
          <Field label="Firma 1 (nombre)" value={firma1Nombre} onChange={setFirma1Nombre} disabled={saving} />
          <Field label="Firma 2 (nombre)" value={firma2Nombre} onChange={setFirma2Nombre} disabled={saving} />
        </div>

        <div className={styles.actions}>
          <button className={styles.btn} onClick={saveData} disabled={saving}>
            Guardar datos
          </button>
          <button
            className={styles.btnStrong}
            onClick={renderDocument}
            disabled={saving || !detail.template_docx_path}
          >
            Generar DOCX + PDF
          </button>
        </div>
      </div>

      {/* 3 Descargas - Tus botones con PDF incluido */}
      <div className={styles.card}>
        <h3>3) Descargas</h3>
        <div className={styles.actions}>
          <button 
            className={styles.btn} 
            onClick={() => download("docx")} 
            disabled={detail.status === "BORRADOR" || saving}
          >
            Descargar DOCX
          </button>
          <button 
            className={styles.btn} 
            onClick={() => download("pdf")} 
            disabled={detail.status === "BORRADOR" || saving}
          >
            Descargar PDF
          </button>
        </div>
        {detail.status === "BORRADOR" && (
          <div className={styles.muted}>
            ⚠️ Debes generar el documento antes de poder descargarlo.
          </div>
        )}
      </div>
    </div>
  );
}