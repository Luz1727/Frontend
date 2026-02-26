// libros.tsx (ADMIN) - COMPLETO
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

/**
 * ✅ ADMIN conectado a backend:
 * - GET  /api/admin/books                -> libros + autor + conteos
 * - GET  /api/admin/books/{id}/chapters  -> capítulos del libro
 *
 * ⚠️ Crear libro:
 * - Tu BD requiere books.author_id NOT NULL
 * - Este UI deja el botón "Crear libro" visible, pero lo desactiva (porque faltaría escoger autor).
 *   Si quieres que admin cree libros, se necesita un select de autor + POST /api/admin/books.
 */

type ChapterStatus =
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "EN_REVISION"
  | "CORRECCIONES"
  | "REENVIADO_POR_AUTOR"
  | "APROBADO"
  | "RECHAZADO";

type Chapter = {
  id: string;
  title: string;
  author: string; // "Nombre (correo)"
  updatedAt: string; // yyyy-mm-dd
  status: ChapterStatus;
};

type Book = {
  id: string;
  name: string;
  year: number;

  authorName: string;
  authorEmail: string;

  chapters: Chapter[];
};

// ---- API types (admin) ----
type AdminBookApi = {
  id: number;
  name: string;
  year: number;
  created_at: string;

  author: {
    id: number;
    name: string;
    email: string;
  };

  total_chapters: number;
  approved: number;
  corrections: number;
};

type AdminChapterApi = {
  id: number;
  title: string;
  author_name: string;
  author_email: string;
  status: ChapterStatus;
  updated_at: string;
};

export default function Libros() {
  const nav = useNavigate();

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");

  // filtros UI
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChapterStatus | "TODOS">("TODOS");

  // modales (crear libro queda deshabilitado por ahora)
  const [openCreateBook, setOpenCreateBook] = useState(false);
  const [openAddChapter, setOpenAddChapter] = useState(false); // no se usa; queda por estructura

  // (no se usa para crear realmente, pero lo dejo porque lo traías)
  const [newBook, setNewBook] = useState({ name: "Libro", year: new Date().getFullYear() });
  const [newChapter, setNewChapter] = useState({
    title: "",
    author: "",
    status: "RECIBIDO" as ChapterStatus,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ cargar libros (admin)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data } = await api.get<AdminBookApi[]>("/admin/books");

        const mapped: Book[] = (data ?? []).map((b) => ({
          id: String(b.id),
          name: b.name,
          year: b.year,
          authorName: b.author?.name ?? "—",
          authorEmail: b.author?.email ?? "—",
          chapters: [],
        }));

        if (!alive) return;

        setBooks(mapped);

        // seleccionar el primero si no hay seleccionado
        if (mapped.length && !selectedBookId) {
          setSelectedBookId(String(mapped[0].id));
        }
      } catch (err: any) {
        if (!alive) return;
        const msg =
          err?.response?.data?.detail ??
          "No se pudieron cargar los libros (admin). Revisa que el backend esté corriendo y tu token sea válido (rol editorial).";
        setErrorMsg(msg);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ si borran el seleccionado o cambió la lista
  useEffect(() => {
    if (!books.length) {
      setSelectedBookId("");
      return;
    }
    const exists = books.some((b) => b.id === selectedBookId);
    if (!exists) setSelectedBookId(books[0].id);
  }, [books, selectedBookId]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId) ?? null,
    [books, selectedBookId]
  );

  // ✅ cargar capítulos del libro seleccionado (admin)
  useEffect(() => {
    let alive = true;

    const loadChapters = async () => {
      if (!selectedBookId) return;

      try {
        const { data } = await api.get<AdminChapterApi[]>(
          `/admin/books/${Number(selectedBookId)}/chapters`
        );

        const chapters: Chapter[] = (data ?? []).map((c) => ({
          id: String(c.id),
          title: c.title,
          author: `${c.author_name} (${c.author_email})`,
          status: c.status,
          updatedAt: (c.updated_at || "").slice(0, 10), // yyyy-mm-dd
        }));

        if (!alive) return;

        setBooks((prev) =>
          prev.map((b) => (b.id === selectedBookId ? { ...b, chapters } : b))
        );
      } catch (err) {
        // si falla, dejamos capítulos vacíos
        if (!alive) return;
        setBooks((prev) =>
          prev.map((b) => (b.id === selectedBookId ? { ...b, chapters: [] } : b))
        );
      }
    };

    loadChapters();
    return () => {
      alive = false;
    };
  }, [selectedBookId]);

  const filteredChapters = useMemo(() => {
    if (!selectedBook) return [];
    const base = selectedBook.chapters.slice();

    const qNorm = q.trim().toLowerCase();
    const byText = (c: Chapter) => {
      if (!qNorm) return true;
      return (
        c.title.toLowerCase().includes(qNorm) ||
        c.author.toLowerCase().includes(qNorm) ||
        c.id.toLowerCase().includes(qNorm)
      );
    };

    const byStatus = (c: Chapter) => {
      if (statusFilter === "TODOS") return true;
      return c.status === statusFilter;
    };

    base.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return base.filter((c) => byText(c) && byStatus(c));
  }, [selectedBook, q, statusFilter]);

  const countsSelected = useMemo(() => {
    if (!selectedBook) return countStatuses([]);
    return countStatuses(selectedBook.chapters);
  }, [selectedBook]);

  // ⚠️ Crear libro (admin): deshabilitado por author_id requerido
  const createBook = () => {
    alert(
      "Tu BD requiere author_id. Para que admin cree libro necesitas: selector de autor + POST /api/admin/books."
    );
    setOpenCreateBook(false);
  };

  const confirmCreateBook = async () => {
    // se deja por estructura; no se usa
    alert("Deshabilitado: falta seleccionar autor (author_id).");
  };

  const openAddChapterModal = () => {
    // 🔒 admin ya ve capítulos; agregar capítulo en admin no aplica (lo sube el autor)
    alert("En admin solo se visualiza. Los capítulos los sube el autor.");
    setOpenAddChapter(false);
  };

  const confirmAddChapter = () => {
    alert("Deshabilitado.");
  };

  const goToChapter = (id: string) => {
    nav(`/capitulos/${id}`);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div>
          <h2 style={styles.h2}>Libros (Admin)</h2>
          <p style={styles.p}>
            Lista de libros con su autor y capítulos desde backend.
          </p>
        </div>

        <button style={styles.primaryBtn} onClick={createBook} type="button" disabled={saving}>
          {saving ? "Creando..." : "Crear libro"}
        </button>
      </div>

      {loading ? (
        <div style={styles.empty}>Cargando libros...</div>
      ) : errorMsg ? (
        <div style={styles.errorBox}>{errorMsg}</div>
      ) : (
        <div style={styles.grid}>
          {/* Lista de libros */}
          <div style={styles.leftCard}>
            <div style={styles.leftHeader}>
              <div style={styles.leftTitle}>Libros de autores</div>
              <div style={styles.leftHint}>{books.length} libros</div>
            </div>

            <div style={styles.bookList}>
              {books
                .slice()
                .sort((a, b) => b.year - a.year)
                .map((b) => {
                  const active = b.id === selectedBookId;
                  const counts = countStatuses(b.chapters);

                  return (
                    <button
                      key={b.id}
                      style={{ ...styles.bookRow, ...(active ? styles.bookRowActive : null) }}
                      onClick={() => setSelectedBookId(b.id)}
                      type="button"
                    >
                      <div style={styles.bookRowMain}>
                        <div style={styles.bookTitle}>
                          {b.name} <span style={styles.bookYear}>({b.year})</span>
                        </div>

                        <div style={styles.bookMeta}>
                          Autor: <b>{b.authorName}</b> ({b.authorEmail})
                        </div>

                        <div style={styles.bookMeta}>
                          {b.chapters.length} capítulos • {counts.APROBADO} aprobados •{" "}
                          {counts.CORRECCIONES} con corrección
                        </div>
                      </div>

                      <span style={styles.bookChip}>{b.chapters.length}/12</span>
                    </button>
                  );
                })}

              {books.length === 0 && (
                <div style={{ padding: 12, color: "#6B7280", fontSize: 13 }}>
                  No hay libros todavía.
                </div>
              )}
            </div>
          </div>

          {/* Detalle del libro */}
          <div style={styles.rightCard}>
            {!selectedBook ? (
              <div style={styles.empty}>Selecciona un libro</div>
            ) : (
              <>
                <div style={styles.bookHeader}>
                  <div>
                    <div style={styles.bookHeaderTitle}>{selectedBook.name}</div>
                    <div style={styles.bookHeaderSub}>
                      Año {selectedBook.year} • {selectedBook.chapters.length} capítulos • Autor:{" "}
                      <b>{selectedBook.authorName}</b> ({selectedBook.authorEmail})
                    </div>

                    {/* mini resumen */}
                    <div style={styles.statsRow}>
                      <span style={{ ...styles.pill, ...pillTone("RECIBIDO") }}>
                        Recibidos: {countsSelected.RECIBIDO}
                      </span>
                      <span style={{ ...styles.pill, ...pillTone("ASIGNADO_A_DICTAMINADOR") }}>
                        Asignados: {countsSelected.ASIGNADO_A_DICTAMINADOR}
                      </span>
                      <span style={{ ...styles.pill, ...pillTone("EN_REVISION") }}>
                        En revisión: {countsSelected.EN_REVISION}
                      </span>
                      <span style={{ ...styles.pill, ...pillTone("CORRECCIONES") }}>
                        Correcciones: {countsSelected.CORRECCIONES}
                      </span>
                      <span style={{ ...styles.pill, ...pillTone("REENVIADO_POR_AUTOR") }}>
                        Reenviados: {countsSelected.REENVIADO_POR_AUTOR}
                      </span>
                      <span style={{ ...styles.pill, ...pillTone("APROBADO") }}>
                        Aprobados: {countsSelected.APROBADO}
                      </span>
                      <span style={{ ...styles.pill, ...pillTone("RECHAZADO") }}>
                        Rechazados: {countsSelected.RECHAZADO}
                      </span>
                    </div>
                  </div>

                  <div style={styles.bookHeaderRight}>
                    <button
                      style={styles.secondaryBtn}
                      onClick={openAddChapterModal}
                      type="button"
                      title="En admin solo se visualiza"
                    >
                      Agregar capítulo
                    </button>
                  </div>
                </div>

                {/* filtros */}
                <div style={styles.filters}>
                  <div style={styles.filterField}>
                    <label style={styles.filterLabel}>Buscar</label>
                    <input
                      style={styles.filterInput}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Título, autor, ID..."
                    />
                  </div>

                  <div style={styles.filterField}>
                    <label style={styles.filterLabel}>Estado</label>
                    <select
                      style={styles.filterSelect}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="TODOS">Todos</option>
                      <option value="RECIBIDO">Recibido</option>
                      <option value="ASIGNADO_A_DICTAMINADOR">Asignado a dictaminador</option>
                      <option value="EN_REVISION">En revisión</option>
                      <option value="CORRECCIONES">Correcciones</option>
                      <option value="REENVIADO_POR_AUTOR">Reenviado por autor</option>
                      <option value="APROBADO">Aprobado</option>
                      <option value="RECHAZADO">Rechazado</option>
                    </select>
                  </div>

                  <div style={styles.filterRight}>
                    <span style={styles.muted}>{filteredChapters.length} resultados</span>
                  </div>
                </div>

                {/* Tabla de capítulos */}
                <div style={styles.tableCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Capítulo</th>
                        <th style={styles.th}>Autor</th>
                        <th style={styles.th}>Estado</th>
                        <th style={styles.th}>Actualizado</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredChapters.map((c, idx) => (
                        <tr key={c.id}>
                          <td style={styles.td}>{idx + 1}</td>
                          <td style={styles.td}>
                            <div style={styles.cellTitle}>{c.title}</div>
                            <div style={styles.cellSub}>ID: {c.id}</div>
                          </td>
                          <td style={styles.td}>{c.author}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.pill, ...pillTone(c.status) }}>
                              {statusLabel(c.status)}
                            </span>
                          </td>
                          <td style={styles.td}>{fmtDate(c.updatedAt)}</td>
                          <td style={styles.td}>
                            <button
                              style={styles.linkBtn}
                              onClick={() => goToChapter(c.id)}
                              type="button"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredChapters.length === 0 && (
                        <tr>
                          <td style={styles.td} colSpan={6}>
                            Este libro aún no tiene capítulos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={styles.hintRow}>
                  <span style={styles.muted}>Límite recomendado: 10–12 capítulos por libro.</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: crear libro (se queda, pero se deshabilita) */}
      {openCreateBook && (
        <div style={styles.modalOverlay} onClick={() => setOpenCreateBook(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Crear libro</div>

            <div style={styles.errorBox}>
              Este modal está deshabilitado porque tu BD requiere <b>author_id</b>.
              Necesitas selector de autor + endpoint POST /api/admin/books.
            </div>

            <label style={styles.modalLabel}>Nombre</label>
            <input
              style={styles.modalInput}
              value={newBook.name}
              onChange={(e) => setNewBook((s) => ({ ...s, name: e.target.value }))}
              placeholder="Ej: Libro 3"
              disabled
            />

            <label style={styles.modalLabel}>Año</label>
            <input
              style={styles.modalInput}
              type="number"
              value={newBook.year}
              onChange={(e) => setNewBook((s) => ({ ...s, year: Number(e.target.value) }))}
              placeholder="2026"
              disabled
            />

            <div style={styles.modalActions}>
              <button
                style={styles.secondaryBtn}
                type="button"
                onClick={() => setOpenCreateBook(false)}
              >
                Cerrar
              </button>
              <button style={styles.primaryBtn} type="button" onClick={confirmCreateBook} disabled>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: agregar capítulo (no se usa) */}
      {openAddChapter && (
        <div style={styles.modalOverlay} onClick={() => setOpenAddChapter(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Agregar capítulo</div>

            <label style={styles.modalLabel}>Título</label>
            <input
              style={styles.modalInput}
              value={newChapter.title}
              onChange={(e) => setNewChapter((s) => ({ ...s, title: e.target.value }))}
              placeholder="Ej: Educación y talento"
            />

            <label style={styles.modalLabel}>Autor</label>
            <input
              style={styles.modalInput}
              value={newChapter.author}
              onChange={(e) => setNewChapter((s) => ({ ...s, author: e.target.value }))}
              placeholder="Ej: María López"
            />

            <label style={styles.modalLabel}>Estado</label>
            <select
              style={styles.modalInput}
              value={newChapter.status}
              onChange={(e) =>
                setNewChapter((s) => ({ ...s, status: e.target.value as ChapterStatus }))
              }
            >
              <option value="RECIBIDO">Recibido</option>
              <option value="ASIGNADO_A_DICTAMINADOR">Asignado a dictaminador</option>
              <option value="EN_REVISION">En revisión</option>
              <option value="CORRECCIONES">Correcciones</option>
              <option value="REENVIADO_POR_AUTOR">Reenviado por autor</option>
              <option value="APROBADO">Aprobado</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} type="button" onClick={() => setOpenAddChapter(false)}>
                Cancelar
              </button>
              <button style={styles.primaryBtn} type="button" onClick={confirmAddChapter}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: ChapterStatus) {
  if (s === "RECIBIDO") return "Recibido";
  if (s === "ASIGNADO_A_DICTAMINADOR") return "Asignado";
  if (s === "EN_REVISION") return "En revisión";
  if (s === "CORRECCIONES") return "Correcciones";
  if (s === "REENVIADO_POR_AUTOR") return "Reenviado";
  if (s === "APROBADO") return "Aprobado";
  return "Rechazado";
}

function pillTone(s: ChapterStatus): React.CSSProperties {
  if (s === "APROBADO") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  if (s === "CORRECCIONES") return { background: "#FFF6E5", color: "#9A5B00", borderColor: "#FFE0A3" };
  if (s === "EN_REVISION") return { background: "#E9F2FF", color: "#1447B2", borderColor: "#C9DDFF" };
  if (s === "ASIGNADO_A_DICTAMINADOR") return { background: "#EEF2FF", color: "#3730A3", borderColor: "#C7D2FE" };
  if (s === "REENVIADO_POR_AUTOR") return { background: "#ECFDF5", color: "#065F46", borderColor: "#A7F3D0" };
  if (s === "RECHAZADO") return { background: "#FEECEC", color: "#B42318", borderColor: "#F9CACA" };
  return { background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}

function countStatuses(chapters: Chapter[]) {
  const out = {
    RECIBIDO: 0,
    ASIGNADO_A_DICTAMINADOR: 0,
    EN_REVISION: 0,
    CORRECCIONES: 0,
    REENVIADO_POR_AUTOR: 0,
    APROBADO: 0,
    RECHAZADO: 0,
  };
  for (const c of chapters) out[c.status] += 1;
  return out;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },

  top: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

  grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, alignItems: "start" },

  leftCard: {
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    overflow: "hidden",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  leftHeader: {
    padding: 12,
    borderBottom: "1px solid #E7EAF0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#F9FAFB",
  },
  leftTitle: { fontWeight: 900, color: "#111827" },
  leftHint: { fontSize: 12, color: "#6B7280" },

  bookList: { padding: 12, display: "flex", flexDirection: "column", gap: 10 },

  bookRow: {
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
  bookRowActive: { borderColor: "#0F3D3E", boxShadow: "0 10px 30px rgba(15,61,62,0.12)" },
  bookRowMain: { minWidth: 0 },
  bookTitle: { fontWeight: 1000, color: "#111827", fontSize: 14 },
  bookYear: { fontWeight: 800, color: "#6B7280" },
  bookMeta: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  bookChip: {
    fontSize: 12,
    color: "#374151",
    background: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: 999,
    padding: "4px 10px",
    whiteSpace: "nowrap",
    fontWeight: 900,
  },

  rightCard: {
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  empty: { padding: 20, color: "#6B7280" },

  errorBox: {
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#991B1B",
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 800,
  },

  bookHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  bookHeaderTitle: { fontWeight: 1000, color: "#111827", fontSize: 16 },
  bookHeaderSub: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  bookHeaderRight: { display: "flex", gap: 10, alignItems: "center" },

  statsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },

  filters: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr 280px auto",
    gap: 12,
    alignItems: "end",
  },
  filterField: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: 900, color: "#374151" },
  filterInput: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    outline: "none",
    fontSize: 14,
  },
  filterSelect: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  filterRight: { display: "flex", justifyContent: "flex-end" },

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
    fontWeight: 900,
  },

  tableCard: { marginTop: 12, borderRadius: 14, border: "1px solid #E7EAF0", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 12,
    padding: "10px 12px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E7EAF0",
    color: "#374151",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #F1F5F9",
    fontSize: 13,
    color: "#111827",
    verticalAlign: "top",
  },

  cellTitle: { fontWeight: 900 },
  cellSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  pill: {
    display: "inline-block",
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  linkBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #D8DEE9",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },

  hintRow: { marginTop: 10, display: "flex", justifyContent: "space-between" },
  muted: { color: "#6B7280", fontSize: 12 },

  // Modales
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17,24,39,0.35)",
    display: "grid",
    placeItems: "center",
    padding: 16,
    zIndex: 999,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    border: "1px solid #E7EAF0",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
  },
  modalTitle: { fontWeight: 1000, color: "#111827", fontSize: 16, marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: 900, color: "#374151", marginTop: 10, display: "block" },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D8DEE9",
    outline: "none",
    fontSize: 14,
    marginTop: 6,
    background: "#fff",
  },
  modalActions: { marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 },
};