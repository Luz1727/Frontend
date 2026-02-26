import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Convocatoria,
  createConvocatoria,
  generateConvocatoriaFinalPdf,
  listConvocatorias,
  updateConvocatoria,
  uploadConvocatoriaTemplatePdf,
} from "../services/convocatoria";

export default function ConvocatoriasPage() {
  const [items, setItems] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const createInputRef = useRef<HTMLInputElement | null>(null);
  const editTemplateInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId == null ? null : items.find((x) => x.id === selectedId) ?? null;

  // cargar
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const data = await listConvocatorias(true);
        if (alive) setItems(data);
      } catch (e: any) {
        const msg = e?.response?.data?.detail ?? "No se pudieron cargar convocatorias.";
        if (alive) setErrMsg(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // seleccionar primera
  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null) {
      setSelectedId(items[0].id);
      return;
    }
    const exists = items.some((x) => x.id === selectedId);
    if (!exists) setSelectedId(items[0].id);
  }, [items, selectedId]);

  const years = useMemo(() => {
    const ys = Array.from(new Set(items.map((x) => x.year)));
    ys.sort((a, b) => b - a);
    return ys;
  }, [items]);

  const updateSelectedLocal = (patch: Partial<Convocatoria>) => {
    if (!selected) return;
    setItems((prev) =>
      prev.map((x) =>
        x.id === selected.id ? { ...x, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : x
      )
    );
  };

  // ✅ Crear convocatoria (con o sin plantilla)
  const createNew = async (file: File | null) => {
    try {
      setBusy(true);
      setErrMsg(null);

      const now = new Date();
      const year = now.getFullYear();
      const start = `${year}-03-01`;
      const end = `${year}-04-30`;

      const created = await createConvocatoria({
        year,
        title: `Convocatoria Editorial ${year}`,
        start_date: start,
        end_date: end,
        description: "## Descripción\n\nEscribe aquí el objetivo de la convocatoria.\n",
        requirements: "## Requisitos\n\n- Requisito 1\n- Requisito 2\n",
        submission_email: "",
        contact_info: "",
        notes: "## Notas\n\n",
        active: 1,
      });

      let finalRow = created;
      if (file) finalRow = await uploadConvocatoriaTemplatePdf(created.id, file);

      setItems((prev) => [finalRow, ...prev]);
      setSelectedId(finalRow.id);

      alert(file ? "✅ Convocatoria creada y plantilla subida." : "✅ Convocatoria creada. Ahora sube la plantilla.");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        "No se pudo crear. Si marca 404, te falta POST /convocatorias en backend (o crearla en BD manualmente).";
      setErrMsg(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  // subir/cambiar plantilla
  const uploadTemplate = async (file: File | null) => {
    if (!selected || !file) return;

    try {
      setBusy(true);
      setErrMsg(null);

      const updated = await uploadConvocatoriaTemplatePdf(selected.id, file);
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

      alert("✅ Plantilla actualizada.");
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "No se pudo subir la plantilla.";
      setErrMsg(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  // guardar datos
  const save = async () => {
    if (!selected) return;

    try {
      setBusy(true);
      setErrMsg(null);

      const updated = await updateConvocatoria(selected.id, {
        year: selected.year,
        title: selected.title,
        start_date: selected.startDate,
        end_date: selected.endDate,
        description: selected.description,
        requirements: selected.requirements,
        submission_email: selected.submissionEmail,
        contact_info: selected.contactInfo,
        notes: selected.notes,
        active: 1,
      });

      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      alert("✅ Guardado en backend.");
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "No se pudo guardar.";
      setErrMsg(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  // ✅ generar PDF final
  const generateFinal = async () => {
    if (!selected) return;

    if (!selected.templatePdfUrl) {
      alert("Primero sube la plantilla PDF.");
      return;
    }

    try {
      setBusy(true);
      setErrMsg(null);

      // guardar antes de generar
      await save();

      const res = await generateConvocatoriaFinalPdf(selected.id);

      setItems((prev) =>
        prev.map((x) =>
          x.id === selected.id
            ? {
                ...x,
                finalPdfName: res.finalPdfName,
                finalPdfUrl: res.finalPdfUrl,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : x
        )
      );

      alert("✅ PDF final generado. Ya puedes descargarlo.");
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "No se pudo generar el PDF final.";
      setErrMsg(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  // =========================
  // ✅ Helpers de formato Markdown
  // =========================

  const applyMd = (key: "desc" | "req" | "notes", action: MdAction) => {
    if (!selected) return;

    const fieldName =
      key === "desc" ? "description" : key === "req" ? "requirements" : "notes";

    const current = (selected as any)[fieldName] as string;

    const next = action(current);
    updateSelectedLocal({ [fieldName]: next } as any);
  };

  const mdToolbar = (key: "desc" | "req" | "notes") => (
    <div style={styles.mdToolbar}>
      <button
        style={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n## Título\n\n"))}
      >
        Título
      </button>
      <button
        style={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n### Subtítulo\n\n"))}
      >
        Subtítulo
      </button>
      <button
        style={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "**negritas**"))}
      >
        Negrita
      </button>
      <button
        style={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n- Item 1\n- Item 2\n"))}
      >
        Lista
      </button>
      <button
        style={styles.mdBtnGhost}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n---\n"))}
      >
        Separador
      </button>
    </div>
  );

  const previewMd = (label: string, value: string) => (
    <div style={styles.previewCard}>
      <div style={styles.previewHeader}>{label}</div>
      <div style={styles.previewBody}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "_(vacío)_"}</ReactMarkdown>
      </div>
    </div>
  );

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div>
          <h2 style={styles.h2}>Convocatorias</h2>
          <p style={styles.p}>
            {loading
              ? "Cargando convocatorias..."
              : errMsg
              ? `Error: ${errMsg}`
              : "Escribe con formato (Markdown), sube plantilla PDF y genera el PDF final."}
          </p>
        </div>

        {/* ✅ SOLO 1 BOTÓN ARRIBA */}
        <div style={styles.topActions}>
          <button
            style={styles.primaryBtn}
            type="button"
            onClick={() => createInputRef.current?.click()}
            disabled={loading || busy}
            title="Crear convocatoria y seleccionar plantilla"
          >
            {busy ? "Procesando..." : "Crear convocatoria"}
          </button>

          <input
            ref={createInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.currentTarget.value = "";
              createNew(file);
            }}
          />
        </div>
      </div>

      <div style={styles.grid}>
        {/* Lista */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <div style={styles.listTitle}>Años</div>
            <div style={styles.listHint}>{items.length} registros</div>
          </div>

          <div style={styles.list}>
            {items.length === 0 ? (
              <div style={styles.emptyList}>Aún no hay convocatorias. Usa “Crear convocatoria”.</div>
            ) : (
              years.map((y) => (
                <div key={y} style={styles.yearBlock}>
                  <div style={styles.yearTitle}>{y}</div>

                  {items
                    .filter((x) => x.year === y)
                    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
                    .map((c) => {
                      const active = c.id === selectedId;
                      return (
                        <button
                          key={c.id}
                          style={{ ...styles.row, ...(active ? styles.rowActive : null) }}
                          onClick={() => setSelectedId(c.id)}
                          type="button"
                        >
                          <div style={styles.rowMain}>
                            <div style={styles.rowTitle}>{c.title}</div>
                            <div style={styles.rowSub}>
                              {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                            </div>
                            <div style={styles.rowMeta}>
                              {c.templatePdfName ? `Plantilla: ${c.templatePdfName}` : "Sin plantilla"}
                              {c.finalPdfName ? ` • Final: ${c.finalPdfName}` : ""}
                            </div>
                          </div>
                          <span style={styles.rowChip}>Actualizado {fmtDate(c.updatedAt)}</span>
                        </button>
                      );
                    })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div style={styles.editorCard}>
          {loading ? (
            <div style={styles.empty}>Cargando...</div>
          ) : !selected ? (
            <div style={styles.empty}>Selecciona una convocatoria o crea una nueva.</div>
          ) : (
            <>
              <div style={styles.editorHeader}>
                <div>
                  <div style={styles.editorTitle}>{selected.title}</div>
                  <div style={styles.editorSub}>Año {selected.year}</div>
                </div>
                <div style={styles.editorRight}>
                  <span style={styles.badge}>Backend</span>
                </div>
              </div>

              {/* ✅ Layout: Form + Preview */}
              <div style={styles.editorSplit}>
                {/* FORM */}
                <div style={styles.formCol}>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Título</label>
                      <input
                        style={styles.input}
                        value={selected.title}
                        onChange={(e) => updateSelectedLocal({ title: e.target.value })}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Inicio</label>
                      <input
                        style={styles.input}
                        type="date"
                        value={selected.startDate}
                        onChange={(e) => updateSelectedLocal({ startDate: e.target.value })}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Fin</label>
                      <input
                        style={styles.input}
                        type="date"
                        value={selected.endDate}
                        onChange={(e) => updateSelectedLocal({ endDate: e.target.value })}
                      />
                    </div>

                    {/* Descripción */}
                    <div style={styles.fieldWide}>
                      <div style={styles.fieldTop}>
                        <label style={styles.label}>Descripción / objetivo (Markdown)</label>
                      </div>
                      {mdToolbar("desc")}
                      <textarea
                        style={styles.textarea}
                        value={selected.description}
                        onChange={(e) => updateSelectedLocal({ description: e.target.value })}
                        rows={6}
                        placeholder="Usa ## para títulos, - para listas, **negritas**"
                      />
                      <div style={styles.smallHint}>
                        Ejemplo: <code>## Requisitos</code>, <code>- Item</code>, <code>**negritas**</code>
                      </div>
                    </div>

                    {/* Requisitos */}
                    <div style={styles.fieldWide}>
                      <div style={styles.fieldTop}>
                        <label style={styles.label}>Requisitos (Markdown)</label>
                      </div>
                      {mdToolbar("req")}
                      <textarea
                        style={styles.textarea}
                        value={selected.requirements}
                        onChange={(e) => updateSelectedLocal({ requirements: e.target.value })}
                        rows={6}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Correo de envío</label>
                      <input
                        style={styles.input}
                        value={selected.submissionEmail}
                        onChange={(e) => updateSelectedLocal({ submissionEmail: e.target.value })}
                        placeholder="recepcion@editorial.mx"
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Contacto</label>
                      <input
                        style={styles.input}
                        value={selected.contactInfo}
                        onChange={(e) => updateSelectedLocal({ contactInfo: e.target.value })}
                        placeholder="Tel / correo / horario"
                      />
                    </div>

                    {/* Notas */}
                    <div style={styles.fieldWide}>
                      <div style={styles.fieldTop}>
                        <label style={styles.label}>Notas (Markdown)</label>
                      </div>
                      {mdToolbar("notes")}
                      <textarea
                        style={styles.textarea}
                        value={selected.notes}
                        onChange={(e) => updateSelectedLocal({ notes: e.target.value })}
                        rows={4}
                      />
                    </div>

                    {/* Plantilla */}
                    <div style={styles.fieldWide}>
                      <div style={styles.pdfHeader}>
                        <label style={styles.label}>Plantilla PDF (formato)</label>

                        <button
                          style={styles.secondaryBtn}
                          type="button"
                          onClick={() => editTemplateInputRef.current?.click()}
                          disabled={busy}
                        >
                          Subir / cambiar plantilla
                        </button>

                        <input
                          ref={editTemplateInputRef}
                          type="file"
                          accept="application/pdf"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            e.currentTarget.value = "";
                            uploadTemplate(file);
                          }}
                        />
                      </div>

                      <div style={styles.pdfBox}>
                        <div style={styles.pdfName}>
                          {selected.templatePdfName ? selected.templatePdfName : "Sin plantilla PDF"}
                        </div>
                        <div style={styles.pdfHint}>
                          {selected.templatePdfName ? "Plantilla guardada en servidor." : "Sube el formato base."}
                        </div>

                        {selected.templatePdfUrl ? (
                          <div style={{ marginTop: 10 }}>
                            <a href={selected.templatePdfUrl} target="_blank" rel="noreferrer" style={styles.link}>
                              Ver plantilla
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* PDF final */}
                    <div style={styles.fieldWide}>
                      <div style={styles.pdfHeader}>
                        <label style={styles.label}>PDF final (plantilla + datos)</label>

                        <button
                          style={styles.primaryBtn}
                          type="button"
                          onClick={generateFinal}
                          disabled={busy || !selected.templatePdfUrl}
                          title={!selected.templatePdfUrl ? "Primero sube la plantilla" : "Generar PDF final"}
                        >
                          {busy ? "Procesando..." : "Generar PDF final"}
                        </button>
                      </div>

                      <div style={styles.pdfBox}>
                        <div style={styles.pdfName}>{selected.finalPdfName ? selected.finalPdfName : "Aún no generado"}</div>
                        <div style={styles.pdfHint}>
                          {selected.finalPdfName ? "Listo para descargar y publicar." : "Genera el PDF final al terminar."}
                        </div>

                        {selected.finalPdfUrl ? (
                          <div style={{ marginTop: 10 }}>
                            <a href={selected.finalPdfUrl} target="_blank" rel="noreferrer" style={styles.link}>
                              Descargar / abrir PDF final
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div style={styles.saveRow}>
                    <button style={styles.secondaryBtn} onClick={save} type="button" disabled={busy}>
                      {busy ? "Guardando..." : "Guardar datos"}
                    </button>
                    <div style={styles.muted}>Última actualización: {fmtDate(selected.updatedAt)}</div>
                  </div>

                  <div style={styles.note}>
                    <b>Tip:</b> Escribe con Markdown (títulos, listas y negritas). Lo mismo se verá en el PDF final.
                  </div>
                </div>

                {/* PREVIEW */}
                <div style={styles.previewCol}>
                  <div style={styles.previewTitle}>Vista previa (cómo se verá)</div>
                  {previewMd("Descripción / objetivo", selected.description)}
                  {previewMd("Requisitos", selected.requirements)}
                  {previewMd("Notas", selected.notes)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type MdAction = (current: string) => string;

function insertAtEnd(current: string, snippet: string) {
  const c = current ?? "";
  // si no tiene salto al final, agrega
  const needsNL = c.length > 0 && !c.endsWith("\n");
  return c + (needsNL ? "\n" : "") + snippet;
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },

  top: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

  topActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  primaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#0F3D3E",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },
  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },

  grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, alignItems: "start" },

  listCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, overflow: "hidden" },
  listHeader: {
    padding: 12,
    borderBottom: "1px solid #E7EAF0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#F9FAFB",
  },
  listTitle: { fontWeight: 900, color: "#111827" },
  listHint: { fontSize: 12, color: "#6B7280" },
  list: { padding: 12, display: "flex", flexDirection: "column", gap: 14 },

  emptyList: {
    padding: 14,
    border: "1px dashed #D8DEE9",
    borderRadius: 14,
    color: "#6B7280",
    fontSize: 13,
    background: "#FAFAFB",
  },

  yearBlock: { display: "flex", flexDirection: "column", gap: 8 },
  yearTitle: { fontWeight: 900, color: "#111827", fontSize: 13, opacity: 0.9 },

  row: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #E7EAF0",
    background: "#fff",
    borderRadius: 14,
    padding: 12,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  rowActive: { borderColor: "#0F3D3E", boxShadow: "0 10px 30px rgba(15,61,62,0.12)" },
  rowMain: { minWidth: 0 },
  rowTitle: { fontWeight: 900, color: "#111827", fontSize: 13 },
  rowSub: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  rowMeta: { marginTop: 6, fontSize: 12, color: "#374151", opacity: 0.9 },
  rowChip: {
    fontSize: 11,
    color: "#374151",
    background: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: 999,
    padding: "4px 8px",
    whiteSpace: "nowrap",
  },

  editorCard: {
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  },
  empty: { padding: 20, color: "#6B7280" },

  editorHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  editorTitle: { fontWeight: 1000 as any, color: "#111827", fontSize: 16 },
  editorSub: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  editorRight: { display: "flex", gap: 8, alignItems: "center" },
  badge: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #BFE9CF",
    background: "#E8F7EE",
    color: "#0A7A35",
    fontWeight: 800,
  },

  // split
  editorSplit: { marginTop: 12, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, alignItems: "start" },
  formCol: { minWidth: 0 },
  previewCol: {
    minWidth: 0,
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 12,
    background: "#FAFAFB",
    position: "sticky",
    top: 12,
  },
  previewTitle: { fontWeight: 900, color: "#111827", marginBottom: 10 },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 180px 180px", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldWide: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 },
  fieldTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },

  label: { fontSize: 13, fontWeight: 900, color: "#374151" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14 },
  textarea: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    outline: "none",
    fontSize: 14,
    minHeight: 120,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  smallHint: { fontSize: 12, color: "#6B7280" },

  // Markdown toolbar
  mdToolbar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    padding: 8,
    borderRadius: 12,
    border: "1px solid #E7EAF0",
    background: "#F9FAFB",
  },
  mdBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  },
  mdBtnGhost: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px dashed #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    color: "#374151",
  },

  // Preview cards
  previewCard: { border: "1px solid #E7EAF0", borderRadius: 14, overflow: "hidden", marginBottom: 10, background: "#fff" },
  previewHeader: { padding: "10px 12px", background: "#F3F4F6", fontWeight: 900, color: "#111827", fontSize: 12 },
  previewBody: { padding: 12, color: "#111827", fontSize: 13, lineHeight: 1.4 },

  pdfHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  pdfBox: { border: "1px solid #E7EAF0", borderRadius: 14, padding: 12, background: "#F9FAFB" },
  pdfName: { fontWeight: 900, color: "#111827" },
  pdfHint: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  link: { color: "#0F3D3E", fontWeight: 900, textDecoration: "none" },

  saveRow: { marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  muted: { color: "#6B7280", fontSize: 12 },

  note: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #E7EAF0",
    background: "#F9FAFB",
    color: "#374151",
    fontSize: 13,
  },
};