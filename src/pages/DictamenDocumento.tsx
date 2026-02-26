// src/pages/DictamenDocumento.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

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

export default function DictamenDocumento() {
  const { id } = useParams();
  const nav = useNavigate();
  const dictamenId = Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

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

  // ✅ NUEVO: nombres para UI (evita que diga "cargada" cuando aún no subes)
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

      // ✅ SOLO plantilla guardada en backend
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
      setSelectedTemplateName(null); // ✅ ya quedó guardada, limpiamos "seleccionada"
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

  const download = async (format: "docx") => {
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

  if (loading) return <div style={s.wrap}>Cargando...</div>;
  if (!detail) return <div style={s.wrap}>No encontrado</div>;

  return (
    <div style={s.wrap}>
      <div style={s.top}>
        <div>
          <h2 style={s.h2}>Documento del Dictamen</h2>
          <div style={s.sub}>
            <b>Folio:</b> {detail.folio} · <b>Estatus:</b> {detail.status}
          </div>
          <div style={s.sub}>
            <b>Capítulo:</b> {detail.capitulo} · <b>Libro:</b> {detail.libro} ·{" "}
            <b>Evaluador:</b> {detail.evaluador}
          </div>
        </div>

        <button style={s.backBtn} onClick={() => nav("/dictamenes")}>
          Volver
        </button>
      </div>

      {/* 1 Plantilla */}
      <div style={s.card}>
        <h3>1) Subir Plantilla Word (.docx)</h3>

        {/* ✅ FIX: NO usar disabled en input file (si lo deshabilitas, el navegador borra la selección) */}
        <div style={{ pointerEvents: saving ? "none" : "auto", opacity: saving ? 0.85 : 1 }}>
          <input
            type="file"
            accept=".docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedTemplateName(file.name); // ✅ solo UI
                uploadTemplate(file);
                // Si quieres limpiar el input al terminar (opcional):
                // e.currentTarget.value = "";
              }
            }}
          />
        </div>

        <div style={s.muted}>
          {saving && selectedTemplateName
            ? `⏳ Subiendo: ${selectedTemplateName}`
            : storedTemplateName
            ? `✅ Plantilla actual: ${storedTemplateName}`
            : "⚠️ No hay plantilla subida"}
        </div>
      </div>

      {/* 2 Datos */}
      <div style={s.card}>
        <h3>2) Datos editables</h3>

        <div style={s.grid}>
          <Field label="Folio (único)" value={folioEdit} onChange={setFolioEdit} />

          <Field label="Dirigida a (nombre)" value={recipientName} onChange={setRecipientName} />
          <Field
            label="Institución (destinatario)"
            value={recipientInstitucion}
            onChange={setRecipientInstitucion}
          />
          <Field label="CVU / SNII" value={cvu} onChange={setCvu} />

          <Field label="Ciudad y Estado" value={ciudadEstado} onChange={setCiudadEstado} />
          <Field
            label="Fecha de emisión (texto)"
            value={fechaEmisionTexto}
            onChange={setFechaEmisionTexto}
          />

          <Field label="Capítulo (título)" value={capituloTitulo} onChange={setCapituloTitulo} />
          <Field label="Libro (título)" value={libroTitulo} onChange={setLibroTitulo} />
          <Field label="Entrega (texto)" value={entregaTexto} onChange={setEntregaTexto} />

          <Field label="Inicio dictamen (texto)" value={inicioTexto} onChange={setInicioTexto} />
          <Field label="Fin dictamen (texto)" value={finTexto} onChange={setFinTexto} />
          <Field label="Cargo (texto)" value={cargoTexto} onChange={setCargoTexto} />

          <Field label="Firma 1 (nombre)" value={firma1Nombre} onChange={setFirma1Nombre} />
          <Field label="Firma 2 (nombre)" value={firma2Nombre} onChange={setFirma2Nombre} />
        </div>

        <div style={s.actions}>
          <button style={s.btn} onClick={saveData} disabled={saving}>
            Guardar datos
          </button>
          <button
            style={s.btnStrong}
            onClick={renderDocument}
            disabled={saving || !detail.template_docx_path}
          >
            Generar DOCX + PDF
          </button>
        </div>
      </div>

      {/* 3 Descargas */}
      <div style={s.card}>
        <h3>3) Descargas</h3>
        <div style={s.actions}>
          <button onClick={() => download("docx")} disabled={detail.status === "BORRADOR"}>
            Descargar DOCX
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input style={s.input} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 16, padding: 16 },
  top: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  h2: { margin: 0 },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  backBtn: { padding: 10, borderRadius: 8, cursor: "pointer" },

  card: { border: "1px solid #E5E7EB", padding: 16, borderRadius: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 },

  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600 },
  input: { padding: 10, borderRadius: 8, border: "1px solid #D1D5DB" },

  actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  btn: { padding: 10, borderRadius: 8, cursor: "pointer" },
  btnStrong: { padding: 10, borderRadius: 8, background: "#111827", color: "#fff", cursor: "pointer" },

  muted: { marginTop: 8, fontSize: 12, color: "#6B7280" },
};