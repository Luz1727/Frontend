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

  const [recipientName, setRecipientName] = useState("");
  const [institution, setInstitution] = useState("");
  const [cvu, setCvu] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [cargo, setCargo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Detail>(`/admin/dictamenes/${dictamenId}`);
      setDetail(data);

      const json = data.constancia_data_json || {};
      setRecipientName(data.recipient_name || "");
      setInstitution(json.institution || "");
      setCvu(json.cvu_snii || "");
      setCiudad(json.ciudad || "");
      setCargo(json.cargo || "");
      setInicio(json.inicio_dictamen || "");
      setFin(json.fin_dictamen || "");
      setFechaEmision(json.fecha_emision || "");
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
        recipient_name: recipientName,
        data: {
          institution,
          cvu_snii: cvu,
          ciudad,
          cargo,
          inicio_dictamen: inicio,
          fin_dictamen: fin,
          fecha_emision: fechaEmision,
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

  // ✅ Descarga con token
  const download = async (format: "pdf" | "docx") => {
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
            <b>Capítulo:</b> {detail.capitulo} · <b>Libro:</b> {detail.libro} · <b>Evaluador:</b> {detail.evaluador}
          </div>
        </div>

        <button style={s.backBtn} onClick={() => nav("/dictamenes")}>
          Volver
        </button>
      </div>

      {/* 1 Plantilla */}
      <div style={s.card}>
        <h3>1) Subir Plantilla Word (.docx)</h3>
        <input
          type="file"
          accept=".docx"
          disabled={saving}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadTemplate(file);
          }}
        />
        <div style={s.muted}>
          {detail.template_docx_path ? "✅ Plantilla cargada" : "⚠️ No hay plantilla subida"}
        </div>
      </div>

      {/* 2 Datos */}
      <div style={s.card}>
        <h3>2) Datos editables</h3>

        <div style={s.grid}>
          <Field label="Dirigida a" value={recipientName} onChange={setRecipientName} />
          <Field label="Institución" value={institution} onChange={setInstitution} />
          <Field label="CVU / SNII" value={cvu} onChange={setCvu} />
          <Field label="Ciudad" value={ciudad} onChange={setCiudad} />
          <Field label="Cargo" value={cargo} onChange={setCargo} />
          <Field label="Inicio dictamen (YYYY-MM-DD)" value={inicio} onChange={setInicio} />
          <Field label="Fin dictamen (YYYY-MM-DD)" value={fin} onChange={setFin} />
          <Field label="Fecha emisión (YYYY-MM-DD)" value={fechaEmision} onChange={setFechaEmision} />
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
          <button onClick={() => download("pdf")} disabled={detail.status === "BORRADOR"}>
            Descargar PDF
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
      <input
        style={s.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 },

  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600 },
  input: { padding: 10, borderRadius: 8, border: "1px solid #D1D5DB" },

  actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  btn: { padding: 10, borderRadius: 8, cursor: "pointer" },
  btnStrong: { padding: 10, borderRadius: 8, background: "#111827", color: "#fff", cursor: "pointer" },

  muted: { marginTop: 8, fontSize: 12, color: "#6B7280" },
};