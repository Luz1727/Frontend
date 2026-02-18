import { api } from "./api";

export type Convocatoria = {
  id: number;
  year: number;

  title: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd

  // Los guardaremos dentro de "text" en backend, pero en UI los separo
  description: string;
  requirements: string;
  submissionEmail: string;
  contactInfo: string;
  notes: string;

  // Plantilla PDF (backend: pdf_path)
  templatePdfName: string | null;
  templatePdfUrl: string | null;

  // PDF final generado (backend: final_pdf_path)
  finalPdfName: string | null;
  finalPdfUrl: string | null;

  updatedAt: string;
};

// --------------------
// helpers: map UI <-> backend
// --------------------
function buildTextFromFields(c: Pick<
  Convocatoria,
  "description" | "requirements" | "submissionEmail" | "contactInfo" | "notes"
>) {
  return [
    "=== DESCRIPCIÓN / OBJETIVO ===",
    c.description?.trim() || "",
    "",
    "=== REQUISITOS ===",
    c.requirements?.trim() || "",
    "",
    "=== CORREO DE ENVÍO ===",
    c.submissionEmail?.trim() || "",
    "",
    "=== CONTACTO ===",
    c.contactInfo?.trim() || "",
    "",
    "=== NOTAS ===",
    c.notes?.trim() || "",
  ].join("\n");
}

function parseFieldsFromText(text: string | null | undefined) {
  const t = (text || "").replaceAll("\r\n", "\n");

  const take = (start: string, end?: string) => {
    const i = t.indexOf(start);
    if (i === -1) return "";
    const from = i + start.length;
    const j = end ? t.indexOf(end, from) : -1;
    const chunk = j === -1 ? t.slice(from) : t.slice(from, j);
    return chunk.trim();
  };

  return {
    description: take("=== DESCRIPCIÓN / OBJETIVO ===", "=== REQUISITOS ==="),
    requirements: take("=== REQUISITOS ===", "=== CORREO DE ENVÍO ==="),
    submissionEmail: take("=== CORREO DE ENVÍO ===", "=== CONTACTO ==="),
    contactInfo: take("=== CONTACTO ===", "=== NOTAS ==="),
    notes: take("=== NOTAS ==="),
  };
}

function fromBackend(row: any): Convocatoria {
  const fields = parseFieldsFromText(row?.text);

  return {
    id: Number(row.id),
    year: Number(row.year),
    title: String(row.title || ""),
    startDate: String(row.startDate || ""),
    endDate: String(row.endDate || ""),

    description: fields.description,
    requirements: fields.requirements,
    submissionEmail: fields.submissionEmail,
    contactInfo: fields.contactInfo,
    notes: fields.notes,

    templatePdfName: row.pdfName ?? null,
    templatePdfUrl: row.pdfUrl ?? null,

    finalPdfName: row.finalPdfName ?? null,
    finalPdfUrl: row.finalPdfUrl ?? null,

    updatedAt: String(row.updatedAt || ""),
  };
}

// --------------------
// API calls
// --------------------
export async function listConvocatorias(onlyActive = true) {
  const { data } = await api.get<any[]>("/convocatorias", {
    params: { only_active: onlyActive },
  });
  return (data || []).map(fromBackend);
}

/**
 * Requiere backend: POST /convocatorias
 * (si no lo tienes, abajo te dejo fallback en el componente)
 */
export async function createConvocatoria(payload: {
  year: number;
  title: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd

  description: string;
  requirements: string;
  submission_email: string;
  contact_info: string;
  notes: string;

  active: number;
}) {
  const text = buildTextFromFields({
    description: payload.description,
    requirements: payload.requirements,
    submissionEmail: payload.submission_email,
    contactInfo: payload.contact_info,
    notes: payload.notes,
  });

  const body = {
    year: payload.year,
    title: payload.title,
    start_date: payload.start_date,
    end_date: payload.end_date,
    text,
    description: "", // opcional si tu backend lo recibe
    active: payload.active,
  };

  const { data } = await api.post<any>("/convocatorias", body);
  return fromBackend(data);
}

export async function updateConvocatoria(
  convId: number,
  payload: {
    year: number;
    title: string;
    start_date: string;
    end_date: string;

    description: string;
    requirements: string;
    submission_email: string;
    contact_info: string;
    notes: string;

    active: number;
  }
) {
  const text = buildTextFromFields({
    description: payload.description,
    requirements: payload.requirements,
    submissionEmail: payload.submission_email,
    contactInfo: payload.contact_info,
    notes: payload.notes,
  });

  const body = {
    year: payload.year,
    title: payload.title,
    start_date: payload.start_date,
    end_date: payload.end_date,
    text,
    description: "", // opcional si tu backend lo recibe
    active: payload.active,
  };

  const { data } = await api.put<any>(`/convocatorias/${convId}`, body);
  return fromBackend(data);
}

/**
 * Sube plantilla/formato base (PDF)
 * Backend: POST /convocatorias/{id}/pdf
 */
export async function uploadConvocatoriaTemplatePdf(convId: number, file: File) {
  const form = new FormData();
  form.append("file", file);

  const { data } = await api.post<any>(`/convocatorias/${convId}/pdf`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return fromBackend(data);
}

/**
 * Genera PDF final (plantilla + overlay con datos)
 * Backend: POST /convocatorias/{id}/generate
 */
export async function generateConvocatoriaFinalPdf(convId: number): Promise<{
  ok: boolean;
  finalPdfName: string;
  finalPdfUrl: string;
}> {
  const { data } = await api.post(`/convocatorias/${convId}/generate`);
  return data;
}
