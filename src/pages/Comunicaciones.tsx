// src/pages/Comunicaciones.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

/**
 * ✅ Comunicaciones (EDITORIAL) — 100% listo para conectar a TU backend real (sin mocks, sin data “metida”)
 *
 * RUTAS (según TU backend actual):
 * - Templates:
 *    GET    /admin/templates
 *    POST   /admin/templates           (multipart: name, file)
 *    DELETE /admin/templates/{id}
 *    POST   /admin/templates/{id}/generate  (JSON) -> ZIP (blob)
 *
 * - Books:
 *    GET    /admin/books               (ya lo tienes)
 *
 * - Users (autores):
 *    GET    /admin/users?role=autor&q=...   (agrega q en tu admin_users.py como te indiqué)
 *
 * ⚠️ IMPORTANTE:
 * - Ya NO hay mocks en este archivo.
 * - Si el backend falla, mostramos el error (no inventamos datos).
 * - Al entrar en modo "Selección", se carga la lista de autores automáticamente.
 */

type Role = "editorial" | "dictaminador" | "autor";

type TemplateRow = {
  id: number;
  name: string;
  original_filename: string;
  created_at: string;
};

type BookRow = {
  id: number;
  name: string;
  year?: number;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

type GenerateMode = "ALL" | "BOOK" | "SELECTED";

function safeFileName(name: string) {
  return (name || "archivo")
    .replace(/[^\w\-\.]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function humanAxiosError(err: any) {
  // Axios-like
  const status = err?.response?.status;
  const detail =
    err?.response?.data?.detail ??
    err?.response?.data?.message ??
    (typeof err?.response?.data === "string" ? err.response.data : null);

  if (status && detail) return `${status}: ${detail}`;
  if (status) return `Error ${status}`;
  if (err?.message) return err.message;
  return "Error desconocido";
}

export default function Comunicaciones() {
  const [tab, setTab] = useState<"plantillas" | "correo">("plantillas");

  // ---------- Templates ----------
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);

  // ---------- Books ----------
  const [books, setBooks] = useState<BookRow[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  const [mode, setMode] = useState<GenerateMode>("ALL");
  const [bookId, setBookId] = useState<number | "">("");

  // ---------- Authors (selection mode) ----------
  const [q, setQ] = useState("");
  const [authors, setAuthors] = useState<UserRow[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorsError, setAuthorsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  // ---------- Generation ----------
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [genErr, setGenErr] = useState<string | null>(null);

  // =========================
  // Initial load: templates + books
  // =========================
  useEffect(() => {
    void loadTemplates();
    void loadBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // When mode changes:
  // - If SELECTED: load authors immediately
  // - Reset selection when leaving SELECTED
  // =========================
  useEffect(() => {
    if (mode === "SELECTED") {
      // carga autores inicial (sin filtro) para que “aparezcan de la BD”
      void searchAuthors("");
    } else {
      setQ("");
      setAuthors([]);
      setSelectedIds({});
      setAuthorsError(null);
      setAuthorsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // =========================
  // Debounced author search
  // =========================
  useEffect(() => {
    if (mode !== "SELECTED") return;

    const t = window.setTimeout(() => {
      void searchAuthors(q);
    }, 350);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mode]);

  // =========================
  // API Calls (REAL)
  // =========================
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);

    try {
      const res = await api.get("/admin/templates");
      const data = res.data as TemplateRow[];

      const rows = Array.isArray(data) ? data : [];
      setTemplates(rows);

      // auto-select first template
      setSelectedTemplateId((prev) => {
        if (prev && rows.some((t) => t.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      setTemplates([]);
      setSelectedTemplateId(null);
      setTemplatesError(humanAxiosError(err));
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadBooks = async () => {
    setBooksLoading(true);
    setBooksError(null);

    try {
      // TU endpoint devuelve AdminBookOut[]; aquí solo usamos id/name/year
      const res = await api.get("/admin/books");
      const data = res.data as any[];

      const rows: BookRow[] = Array.isArray(data)
        ? data.map((b) => ({
            id: Number(b.id),
            name: String(b.name ?? ""),
            year: b.year ? Number(b.year) : undefined,
          }))
        : [];

      setBooks(rows);

      setBookId((prev) => {
        // si ya hay uno seleccionado y existe, mantenerlo
        if (typeof prev === "number" && rows.some((r) => r.id === prev)) return prev;
        // si no, seleccionar primero
        return rows[0]?.id ?? "";
      });
    } catch (err) {
      setBooks([]);
      setBookId("");
      setBooksError(humanAxiosError(err));
    } finally {
      setBooksLoading(false);
    }
  };

  const searchAuthors = async (query: string) => {
    setAuthorsLoading(true);
    setAuthorsError(null);

    try {
      // ✅ usa TU endpoint existente (admin_users.py) con q agregado
      const res = await api.get("/admin/users", { params: { role: "autor", q: query || "" } });

      // Tu response_model es AdminUserOut (tiene más campos), aquí mapeamos solo lo que ocupamos
      const data = res.data as any[];

      const rows: UserRow[] = Array.isArray(data)
        ? data.map((u) => ({
            id: Number(u.id),
            name: String(u.name ?? ""),
            email: String(u.email ?? ""),
            role: (u.role as Role) ?? "autor",
          }))
        : [];

      setAuthors(rows);
    } catch (err) {
      setAuthors([]);
      setAuthorsError(humanAxiosError(err));
    } finally {
      setAuthorsLoading(false);
    }
  };

  // =========================
  // Upload template
  // =========================
  const onPickFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];

    if (!/\.docx$/i.test(f.name)) {
      alert("Solo se permite .docx");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setGenMsg(null);
    setGenErr(null);

    try {
      const form = new FormData();
      form.append("file", f);
      form.append("name", uploadName.trim() || f.name.replace(/\.docx$/i, ""));

      await api.post("/admin/templates", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadName("");
      await loadTemplates();
      alert("Plantilla subida.");
    } catch (err) {
      alert(`No se pudo subir: ${humanAxiosError(err)}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // =========================
  // Delete template
  // =========================
  const deleteTemplate = async (id: number) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;

    try {
      await api.delete(`/admin/templates/${id}`);
      await loadTemplates();
    } catch (err) {
      alert(`No se pudo eliminar: ${humanAxiosError(err)}`);
    }
  };

  // =========================
  // Generate docs (download)
  // =========================
  const canGenerate = useMemo(() => {
    if (!selectedTemplateId) return false;
    if (mode === "ALL") return true;
    if (mode === "BOOK") return typeof bookId === "number" && !!bookId;
    if (mode === "SELECTED") return selectedCount > 0;
    return false;
  }, [selectedTemplateId, mode, bookId, selectedCount]);

  const generate = async () => {
    if (!canGenerate || !selectedTemplateId) return;

    setGenerating(true);
    setGenMsg(null);
    setGenErr(null);

    try {
      const payload: any = { mode };

      if (mode === "BOOK") payload.book_id = Number(bookId);
      if (mode === "SELECTED") {
        payload.user_ids = Object.entries(selectedIds)
          .filter(([, v]) => v)
          .map(([k]) => Number(k));
      }

      const res = await api.post(`/admin/templates/${selectedTemplateId}/generate`, payload, {
        responseType: "blob",
      });

      // intenta detectar nombre del archivo por Content-Disposition
      const cd = res.headers?.["content-disposition"] as string | undefined;
      const contentType = res.headers?.["content-type"] || "";

      let filename = "";
      if (cd) {
        const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
        filename = decodeURIComponent(m?.[1] || m?.[2] || "");
      }

      if (!filename) {
        const ext = contentType.includes("zip") ? "zip" : "docx";
        const tpl = templates.find((t) => t.id === selectedTemplateId);
        const base = safeFileName(tpl?.name || "documentos_generados");
        filename = `${base}.${ext}`;
      }

      downloadBlob(res.data, filename);
      setGenMsg("Generación completada. Descarga iniciada.");
    } catch (err) {
      setGenErr(humanAxiosError(err));
    } finally {
      setGenerating(false);
    }
  };

  // =========================
  // UI
  // =========================
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  return (
    <div style={styles.shell} className="cm2-shell">
      <style>{CSS}</style>

      {/* Top */}
      <div style={styles.top} className="cm2-top">
        <div style={{ minWidth: 0 }}>
          <div style={styles.title}>Comunicaciones</div>
          <div style={styles.sub}>
            Genera documentos desde <b>plantillas Word (.docx)</b> con placeholders y descarga masiva (ZIP).
          </div>
        </div>

        <div style={styles.tabs} className="cm2-tabs">
          <button
            type="button"
            onClick={() => setTab("plantillas")}
            className={`cm2-tab ${tab === "plantillas" ? "is-on" : ""}`}
          >
            Plantillas Word
          </button>
          <button
            type="button"
            onClick={() => setTab("correo")}
            className={`cm2-tab ${tab === "correo" ? "is-on" : ""}`}
            title="(Opcional) después conectamos envío por correo"
          >
            Envío por correo
          </button>
        </div>
      </div>

      {tab === "correo" ? (
        <div style={styles.card} className="cm2-card">
          <div style={styles.cardTitle}>Envío por correo (siguiente fase)</div>
          <div style={styles.muted}>
            Aquí luego conectamos: campañas, adjuntos, reintentos, historial por destinatario, etc.
          </div>
        </div>
      ) : (
        <div style={styles.grid} className="cm2-grid">
          {/* Left: templates */}
          <section style={styles.card} className="cm2-card">
            <div style={styles.cardHead} className="cm2-cardHead">
              <div>
                <div style={styles.cardTitle}>Plantillas</div>
                <div style={styles.muted}>
                  Placeholders sugeridos: <b>{"{{nombre}}"}</b>, <b>{"{{email}}"}</b>, <b>{"{{folio}}"}</b>,{" "}
                  <b>{"{{titulo_capitulo}}"}</b>, <b>{"{{libro}}"}</b>, <b>{"{{fecha}}"}</b>
                </div>
              </div>

              <button type="button" style={styles.ghostBtn} className="cm2-btn" onClick={() => void loadTemplates()}>
                Recargar
              </button>
            </div>

            {templatesError && <div style={styles.warn}>Error templates: {templatesError}</div>}

            <div style={styles.uploadBox} className="cm2-uploadBox">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Nombre de plantilla (opcional)"
                  style={styles.input}
                />

                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx"
                  style={{ display: "none" }}
                  onChange={(e) => void onPickFile(e.target.files)}
                />

                <button
                  type="button"
                  style={{ ...styles.primaryBtn, ...(uploading ? styles.btnDisabled : {}) }}
                  className="cm2-btn cm2-primary"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Subiendo..." : "Subir .docx"}
                </button>
              </div>

              <div style={styles.smallHint}>
                Tip: En Word, usa exactamente llaves dobles tipo <b>{"{{nombre}}"}</b>.
              </div>
            </div>

            <div style={styles.list} className="cm2-list">
              {templatesLoading ? (
                <div style={styles.muted}>Cargando plantillas…</div>
              ) : templates.length === 0 ? (
                <div style={styles.muted}>No hay plantillas todavía.</div>
              ) : (
                templates.map((t) => {
                  const on = t.id === selectedTemplateId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
                      style={{ ...styles.listItem, ...(on ? styles.listItemOn : {}) }}
                      className={`cm2-item ${on ? "is-on" : ""}`}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.itemTitle} title={t.name}>
                          {t.name}
                        </div>
                        <div style={styles.itemMeta}>
                          {t.original_filename} • {fmtDate(t.created_at)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteTemplate(t.id);
                        }}
                        style={styles.trashBtn}
                        className="cm2-trash"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Right: generate */}
          <section style={styles.card} className="cm2-card">
            <div style={styles.cardTitle}>Generar documentos</div>
            <div style={styles.muted}>
              Plantilla seleccionada:{" "}
              <b>{selectedTemplate ? selectedTemplate.name : "— (selecciona una plantilla)"}</b>
            </div>

            <div style={styles.block} className="cm2-block">
              <div style={styles.blockTitle}>Modo</div>

              <div style={styles.modeGrid} className="cm2-modeGrid">
                <ModeButton on={mode === "ALL"} label="Todos los autores" hint="Genera un ZIP." onClick={() => setMode("ALL")} />
                <ModeButton on={mode === "BOOK"} label="Por libro" hint="Genera para autores de un libro." onClick={() => setMode("BOOK")} />
                <ModeButton on={mode === "SELECTED"} label="Selección" hint="Busca autores y marca a quién generar." onClick={() => setMode("SELECTED")} />
              </div>

              {mode === "BOOK" && (
                <div style={{ marginTop: 12 }}>
                  <label style={styles.label}>
                    Libro
                    <select
                      value={bookId}
                      onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : "")}
                      style={styles.select}
                      disabled={booksLoading}
                    >
                      <option value="">— Selecciona —</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.year ? `(${b.year})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {booksError && <div style={styles.warn}>Error books: {booksError}</div>}
                </div>
              )}

              {mode === "SELECTED" && (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.searchRow} className="cm2-searchRow">
                    <div style={styles.searchWrap} className="cm2-searchWrap">
                      <span style={{ opacity: 0.75 }}>🔎</span>
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar autor por nombre o correo…"
                        style={styles.searchInput}
                      />
                    </div>

                    <div style={styles.pill} className="cm2-pill">
                      Seleccionados: <b style={{ marginLeft: 6 }}>{selectedCount}</b>
                    </div>
                  </div>

                  {authorsError && <div style={styles.warn}>Error autores: {authorsError}</div>}

                  <div style={styles.authList} className="cm2-authList">
                    {authorsLoading ? (
                      <div style={styles.muted}>Cargando autores…</div>
                    ) : authors.length === 0 ? (
                      <div style={styles.muted}>Sin resultados.</div>
                    ) : (
                      authors.map((a) => {
                        const checked = !!selectedIds[a.id];
                        return (
                          <label key={a.id} style={styles.authRow} className="cm2-authRow">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setSelectedIds((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={styles.authName} title={a.name}>
                                {a.name}
                              </div>
                              <div style={styles.authEmail} title={a.email}>
                                {a.email}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div style={styles.actionsRow}>
                    <button type="button" style={styles.ghostBtn} className="cm2-btn" onClick={() => setSelectedIds({})} disabled={selectedCount === 0}>
                      Limpiar selección
                    </button>
                    <button type="button" style={styles.ghostBtn} className="cm2-btn" onClick={() => void searchAuthors(q)} disabled={authorsLoading}>
                      Recargar autores
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.block} className="cm2-block">
              <div style={styles.blockTitle}>Generación</div>

              <div style={styles.muted}>
                Salida: <b>ZIP</b> con 1 DOCX por autor.
              </div>

              {genMsg && <div style={styles.ok}>{genMsg}</div>}
              {genErr && <div style={styles.warn}>Error generación: {genErr}</div>}

              <div style={styles.actionsRow} className="cm2-actionsRow">
                <button
                  type="button"
                  style={{ ...styles.primaryBtn, ...(canGenerate && !generating ? {} : styles.btnDisabled) }}
                  className="cm2-btn cm2-primary"
                  onClick={() => void generate()}
                  disabled={!canGenerate || generating}
                  title={!canGenerate ? "Selecciona plantilla y define destinatarios." : "Generar y descargar"}
                >
                  {generating ? "Generando..." : "Generar y descargar"}
                </button>

                <button
                  type="button"
                  style={styles.ghostBtn}
                  className="cm2-btn"
                  onClick={() =>
                    alert(
                      `Checklist plantilla:\n- Placeholders correctos (ej: {{nombre}})\n- ¿Hay autores en users.role='autor'?\n- ¿La plantilla es .docx?\n- Prueba primero con 1 autor (modo Selección).`
                    )
                  }
                >
                  Checklist
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ModeButton({ on, label, hint, onClick }: { on: boolean; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...styles.modeBtn, ...(on ? styles.modeBtnOn : {}) }}
      className={`cm2-modeBtn ${on ? "is-on" : ""}`}
    >
      <div style={styles.modeLabel}>{label}</div>
      <div style={styles.modeHint}>{hint}</div>
    </button>
  );
}

/* =========================
   Styles (match Luxe/Glass)
========================= */
const styles: Record<string, React.CSSProperties> = {
  shell: { display: "flex", flexDirection: "column", gap: 14 },

  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    padding: 12,
    borderRadius: 18,
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.10)",
    backdropFilter: "blur(10px)",
  },
  title: { fontSize: 18, fontWeight: 950, color: "rgba(255,255,255,.92)" },
  sub: { marginTop: 6, fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.45 },

  tabs: { display: "flex", gap: 8, flexWrap: "wrap" },

  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 14,
    alignItems: "start",
  },

  card: {
    borderRadius: 22,
    padding: 14,
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.10)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 28px 90px rgba(0,0,0,.30)",
    minWidth: 0,
  },

  cardHead: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" },
  cardTitle: { fontWeight: 950, color: "rgba(255,255,255,.92)" },
  muted: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,.62)", lineHeight: 1.45 },

  warn: {
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    border: "1px solid rgba(212,175,55,.25)",
    background: "rgba(212,175,55,.10)",
    color: "rgba(242,231,160,.95)",
    fontSize: 12,
    lineHeight: 1.45,
  },
  ok: {
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    border: "1px solid rgba(34,211,238,.25)",
    background: "rgba(34,211,238,.10)",
    color: "rgba(255,255,255,.90)",
    fontSize: 12,
    lineHeight: 1.45,
  },

  uploadBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    background: "rgba(0,0,0,.16)",
    border: "1px solid rgba(255,255,255,.10)",
  },
  input: {
    height: 44,
    width: 320,
    maxWidth: "78vw",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.18)",
    outline: "none",
    color: "rgba(255,255,255,.92)",
    padding: "0 12px",
    fontWeight: 800,
  },
  smallHint: { marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.62)", lineHeight: 1.45 },

  list: { marginTop: 12, display: "flex", flexDirection: "column", gap: 10 },
  listItem: {
    width: "100%",
    textAlign: "left",
    padding: 12,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.14)",
    cursor: "pointer",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
    color: "rgba(255,255,255,.90)",
  },
  listItemOn: {
    borderColor: "rgba(34,211,238,.28)",
    background: "rgba(34,211,238,.08)",
  },
  itemTitle: { fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 420 },
  itemMeta: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,.62)" },

  trashBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.18)",
    color: "rgba(255,255,255,.88)",
    cursor: "pointer",
    fontWeight: 950,
    flex: "0 0 auto",
  },

  block: {
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    background: "rgba(0,0,0,.16)",
    border: "1px solid rgba(255,255,255,.10)",
  },
  blockTitle: { fontWeight: 950, color: "rgba(255,255,255,.92)" },

  modeGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
  },
  modeBtn: {
    padding: 12,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    cursor: "pointer",
    color: "rgba(255,255,255,.90)",
    textAlign: "left",
  },
  modeBtnOn: {
    borderColor: "rgba(59,130,246,.35)",
    background: "rgba(59,130,246,.12)",
  },
  modeLabel: { fontWeight: 950 },
  modeHint: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,.62)", lineHeight: 1.45 },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
    color: "rgba(255,255,255,.80)",
    fontSize: 12,
    fontWeight: 900,
  },
  select: {
    height: 42,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.18)",
    outline: "none",
    color: "rgba(255,255,255,.92)",
    padding: "0 10px",
    fontWeight: 900,
  },

  searchRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" },
  searchWrap: {
    flex: 1,
    minWidth: 240,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.18)",
  },
  searchInput: { flex: 1, border: "none", outline: "none", background: "transparent", color: "rgba(255,255,255,.92)", fontWeight: 800 },

  pill: {
    fontSize: 12,
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(0,0,0,.18)",
    border: "1px solid rgba(255,255,255,.10)",
    color: "rgba(255,255,255,.75)",
  },

  authList: {
    marginTop: 10,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.02)",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 260,
    overflow: "auto",
  },
  authRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "10px 10px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.14)",
    cursor: "pointer",
  },
  authName: { fontWeight: 950, color: "rgba(255,255,255,.92)" },
  authEmail: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,.62)" },

  actionsRow: { marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },

  primaryBtn: {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(34,211,238,.28)",
    background: "rgba(34,211,238,.12)",
    color: "rgba(255,255,255,.92)",
    fontWeight: 950,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ghostBtn: {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.16)",
    color: "rgba(255,255,255,.88)",
    fontWeight: 950,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    borderColor: "rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
  },
};

const CSS = `
.cm2-shell *{ box-sizing:border-box; }
.cm2-shell ::selection{ background: rgba(34,211,238,.22); }

.cm2-tab{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.16);
  color: rgba(255,255,255,.82);
  cursor: pointer;
  font-weight: 950;
  transition: transform .14s ease, border-color .18s ease, background .18s ease;
}
.cm2-tab:hover{ transform: translateY(-1px); border-color: rgba(34,211,238,.28); }
.cm2-tab.is-on{
  background: rgba(59,130,246,.14);
  border-color: rgba(59,130,246,.35);
  color: rgba(255,255,255,.92);
}

.cm2-btn{
  transition: transform .14s ease, border-color .18s ease, background .18s ease, filter .18s ease;
}
.cm2-btn:hover{
  transform: translateY(-1px);
  border-color: rgba(34,211,238,.28);
  filter: saturate(1.05);
}
.cm2-primary:disabled:hover{ transform:none; filter:none; }
.cm2-trash:hover{ border-color: rgba(248,113,113,.35) !important; }
.cm2-modeBtn:hover{ transform: translateY(-1px); border-color: rgba(34,211,238,.22); }

@media (max-width: 1100px){
  .cm2-grid{ grid-template-columns: 1fr !important; }
  .cm2-modeGrid{ grid-template-columns: 1fr !important; }
}
`;