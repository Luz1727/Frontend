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
import styles from './ConvocatoriasPage.module.css';

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
    <div className={styles.mdToolbar}>
      <button
        className={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n## Título\n\n"))}
      >
        Título
      </button>
      <button
        className={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n### Subtítulo\n\n"))}
      >
        Subtítulo
      </button>
      <button
        className={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "**negritas**"))}
      >
        Negrita
      </button>
      <button
        className={styles.mdBtn}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n- Item 1\n- Item 2\n"))}
      >
        Lista
      </button>
      <button
        className={styles.mdBtnGhost}
        type="button"
        onClick={() => applyMd(key, (t) => insertAtEnd(t, "\n---\n"))}
      >
        Separador
      </button>
    </div>
  );

  const previewMd = (label: string, value: string) => (
    <div className={styles.previewCard}>
      <div className={styles.previewHeader}>{label}</div>
      <div className={styles.previewBody}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "_(vacío)_"}</ReactMarkdown>
      </div>
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>Convocatorias</h2>
          <p className={styles.p}>
            {loading
              ? "Cargando convocatorias..."
              : errMsg
              ? `Error: ${errMsg}`
              : "Escribe con formato (Markdown), sube plantilla PDF y genera el PDF final."}
          </p>
        </div>

        <div className={styles.topActions}>
          <button
            className={styles.primaryBtn}
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

      <div className={styles.grid}>
        {/* Lista */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>Años</div>
            <div className={styles.listHint}>{items.length} registros</div>
          </div>

          <div className={styles.list}>
            {items.length === 0 ? (
              <div className={styles.emptyList}>Aún no hay convocatorias. Usa “Crear convocatoria”.</div>
            ) : (
              years.map((y) => (
                <div key={y} className={styles.yearBlock}>
                  <div className={styles.yearTitle}>{y}</div>

                  {items
                    .filter((x) => x.year === y)
                    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
                    .map((c) => {
                      const active = c.id === selectedId;
                      return (
                        <button
                          key={c.id}
                          className={`${styles.row} ${active ? styles.rowActive : ""}`}
                          onClick={() => setSelectedId(c.id)}
                          type="button"
                        >
                          <div className={styles.rowMain}>
                            <div className={styles.rowTitle}>{c.title}</div>
                            <div className={styles.rowSub}>
                              {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                            </div>
                            <div className={styles.rowMeta}>
                              {c.templatePdfName ? `Plantilla: ${c.templatePdfName}` : "Sin plantilla"}
                              {c.finalPdfName ? ` • Final: ${c.finalPdfName}` : ""}
                            </div>
                          </div>
                          <span className={styles.rowChip}>Actualizado {fmtDate(c.updatedAt)}</span>
                        </button>
                      );
                    })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className={styles.editorCard}>
          {loading ? (
            <div className={styles.empty}>Cargando...</div>
          ) : !selected ? (
            <div className={styles.empty}>Selecciona una convocatoria o crea una nueva.</div>
          ) : (
            <>
              <div className={styles.editorHeader}>
                <div>
                  <div className={styles.editorTitle}>{selected.title}</div>
                  <div className={styles.editorSub}>Año {selected.year}</div>
                </div>
                <div className={styles.editorRight}>
                  <span className={styles.badge}>Backend</span>
                </div>
              </div>

              <div className={styles.editorSplit}>
                {/* FORM */}
                <div className={styles.formCol}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Título</label>
                      <input
                        className={styles.input}
                        value={selected.title}
                        onChange={(e) => updateSelectedLocal({ title: e.target.value })}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Inicio</label>
                      <input
                        className={styles.input}
                        type="date"
                        value={selected.startDate}
                        onChange={(e) => updateSelectedLocal({ startDate: e.target.value })}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Fin</label>
                      <input
                        className={styles.input}
                        type="date"
                        value={selected.endDate}
                        onChange={(e) => updateSelectedLocal({ endDate: e.target.value })}
                      />
                    </div>

                    {/* Descripción */}
                    <div className={styles.fieldWide}>
                      <div className={styles.fieldTop}>
                        <label className={styles.label}>Descripción / objetivo (Markdown)</label>
                      </div>
                      {mdToolbar("desc")}
                      <textarea
                        className={styles.textarea}
                        value={selected.description}
                        onChange={(e) => updateSelectedLocal({ description: e.target.value })}
                        rows={6}
                        placeholder="Usa ## para títulos, - para listas, **negritas**"
                      />
                      <div className={styles.smallHint}>
                        Ejemplo: <code>## Requisitos</code>, <code>- Item</code>, <code>**negritas**</code>
                      </div>
                    </div>

                    {/* Requisitos */}
                    <div className={styles.fieldWide}>
                      <div className={styles.fieldTop}>
                        <label className={styles.label}>Requisitos (Markdown)</label>
                      </div>
                      {mdToolbar("req")}
                      <textarea
                        className={styles.textarea}
                        value={selected.requirements}
                        onChange={(e) => updateSelectedLocal({ requirements: e.target.value })}
                        rows={6}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Correo de envío</label>
                      <input
                        className={styles.input}
                        value={selected.submissionEmail}
                        onChange={(e) => updateSelectedLocal({ submissionEmail: e.target.value })}
                        placeholder="recepcion@editorial.mx"
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Contacto</label>
                      <input
                        className={styles.input}
                        value={selected.contactInfo}
                        onChange={(e) => updateSelectedLocal({ contactInfo: e.target.value })}
                        placeholder="Tel / correo / horario"
                      />
                    </div>

                    {/* Notas */}
                    <div className={styles.fieldWide}>
                      <div className={styles.fieldTop}>
                        <label className={styles.label}>Notas (Markdown)</label>
                      </div>
                      {mdToolbar("notes")}
                      <textarea
                        className={styles.textarea}
                        value={selected.notes}
                        onChange={(e) => updateSelectedLocal({ notes: e.target.value })}
                        rows={4}
                      />
                    </div>

                    {/* Plantilla */}
                    <div className={styles.fieldWide}>
                      <div className={styles.pdfHeader}>
                        <label className={styles.label}>Plantilla PDF (formato)</label>

                        <button
                          className={styles.secondaryBtn}
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

                      <div className={styles.pdfBox}>
                        <div className={styles.pdfName}>
                          {selected.templatePdfName ? selected.templatePdfName : "Sin plantilla PDF"}
                        </div>
                        <div className={styles.pdfHint}>
                          {selected.templatePdfName ? "Plantilla guardada en servidor." : "Sube el formato base."}
                        </div>

                        {selected.templatePdfUrl ? (
                          <div style={{ marginTop: 10 }}>
                            <a href={selected.templatePdfUrl} target="_blank" rel="noreferrer" className={styles.link}>
                              Ver plantilla
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* PDF final */}
                    <div className={styles.fieldWide}>
                      <div className={styles.pdfHeader}>
                        <label className={styles.label}>PDF final (plantilla + datos)</label>

                        <button
                          className={styles.primaryBtn}
                          type="button"
                          onClick={generateFinal}
                          disabled={busy || !selected.templatePdfUrl}
                          title={!selected.templatePdfUrl ? "Primero sube la plantilla" : "Generar PDF final"}
                        >
                          {busy ? "Procesando..." : "Generar PDF final"}
                        </button>
                      </div>

                      <div className={styles.pdfBox}>
                        <div className={styles.pdfName}>{selected.finalPdfName ? selected.finalPdfName : "Aún no generado"}</div>
                        <div className={styles.pdfHint}>
                          {selected.finalPdfName ? "Listo para descargar y publicar." : "Genera el PDF final al terminar."}
                        </div>

                        {selected.finalPdfUrl ? (
                          <div style={{ marginTop: 10 }}>
                            <a href={selected.finalPdfUrl} target="_blank" rel="noreferrer" className={styles.link}>
                              Descargar / abrir PDF final
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className={styles.saveRow}>
                    <button className={styles.secondaryBtn} onClick={save} type="button" disabled={busy}>
                      {busy ? "Guardando..." : "Guardar datos"}
                    </button>
                    <div className={styles.muted}>Última actualización: {fmtDate(selected.updatedAt)}</div>
                  </div>

                  <div className={styles.note}>
                    <b>Tip:</b> Escribe con Markdown (títulos, listas y negritas). Lo mismo se verá en el PDF final.
                  </div>
                </div>

                {/* PREVIEW */}
                <div className={styles.previewCol}>
                  <div className={styles.previewTitle}>Vista previa (cómo se verá)</div>
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
  const needsNL = c.length > 0 && !c.endsWith("\n");
  return c + (needsNL ? "\n" : "") + snippet;
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}
