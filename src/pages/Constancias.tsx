import React, { useMemo, useState } from "react";

type Role = "editorial" | "dictaminador" | "autor";
type User = { id: number | string; name: string; email: string; role: Role };

type ConstanciaStatus = "BORRADOR" | "EMITIDA";

type Constancia = {
  id: string;
  folio: string;
  dictamenFolio: string;
  evaluador: string;
  evaluadorId: string; // ✅ para relacionar firma guardada (dictaminador)
  institucion: string;
  cvaoSnii: string;
  libro: string;
  capitulo: string;
  email: string;
  issuedAt: string; // yyyy-mm-dd
  pdfName: string;
  status: ConstanciaStatus;
  signaturePreview?: string | null; // ✅ firma usada (demo)
};

function safeParseUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
function signatureKeyForUser(userId: string) {
  return `signature:${userId}`;
}

export default function Constancias() {
  const user = useMemo(() => safeParseUser(), []);
  const allSeed = useMemo(() => seedConstancias(), []);

  const [items, setItems] = useState<Constancia[]>(allSeed);

  const [q, setQ] = useState("");
  const [libro, setLibro] = useState<string>("ALL");
  const [status, setStatus] = useState<"ALL" | ConstanciaStatus>("ALL");

  const libros = useMemo(() => {
    const set = new Set(items.map((x) => x.libro));
    return ["ALL", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((x) => {
      if (libro !== "ALL" && x.libro !== libro) return false;
      if (status !== "ALL" && x.status !== status) return false;

      if (!qq) return true;
      const blob = `${x.folio} ${x.dictamenFolio} ${x.evaluador} ${x.institucion} ${x.capitulo} ${x.email}`.toLowerCase();
      return blob.includes(qq);
    });
  }, [items, q, libro, status]);

  const downloadPdf = (c: Constancia) => {
    alert(`Después: descargar PDF real\n\n${c.pdfName}`);
  };

  const viewPdf = (c: Constancia) => {
    alert(`Después: visor PDF real embebido\n\n${c.pdfName}`);
  };

  const resendEmail = (c: Constancia) => {
    const subject = `Constancia de dictamen — ${c.folio}`;
    const body =
      `Hola ${c.evaluador},\n\n` +
      `Te compartimos tu constancia de dictamen.\n\n` +
      `Folio constancia: ${c.folio}\n` +
      `Folio dictamen: ${c.dictamenFolio}\n` +
      `Libro: ${c.libro}\n` +
      `Capítulo: ${c.capitulo}\n\n` +
      `Saludos.\nEditorial`;

    navigator.clipboard?.writeText(`Para: ${c.email}\nAsunto: ${subject}\n\n${body}`);
    alert("Plantilla de reenvío copiada al portapapeles (demo).");
  };

  const emitirConstancia = (c: Constancia) => {
    // ✅ Regla (puedes cambiarla):
    // Editorial emite la constancia (y se “firma” con la firma del dictaminador ya guardada)
    if (user?.role !== "editorial") {
      alert("Solo Editorial puede emitir constancias en este MVP.");
      return;
    }

    // “Buscar” firma del evaluador (dictaminador) desde localStorage
    const signature = localStorage.getItem(signatureKeyForUser(c.evaluadorId));

    if (!signature) {
      alert(
        `No se encontró firma guardada del dictaminador (${c.evaluador}).\n\n` +
          `Inicia sesión como dictaminador y guarda su firma (en DictamenDetalle), ` +
          `luego vuelve aquí a emitir la constancia.`
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    setItems((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              status: "EMITIDA",
              issuedAt: today,
              signaturePreview: signature,
              pdfName: `constancia_${c.folio}.pdf`,
            }
          : x
      )
    );

    alert(
      `Constancia emitida (demo)\n\n` +
        `Folio: ${c.folio}\n` +
        `Se usó la firma guardada del dictaminador.\n` +
        `Después: aquí generaremos el PDF real y lo guardaremos en storage.`
    );
  };

  const revertirABorrador = (c: Constancia) => {
    if (user?.role !== "editorial") {
      alert("Solo Editorial puede revertir constancias en este MVP.");
      return;
    }
    setItems((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? { ...x, status: "BORRADOR", signaturePreview: null, issuedAt: "", pdfName: "" }
          : x
      )
    );
    alert("Revertida a borrador (demo).");
  };

  const crearConstancia = () => {
    if (user?.role !== "editorial") {
      alert("Solo Editorial puede crear constancias en este MVP.");
      return;
    }
    const newItem: Constancia = {
      id: `con-${Date.now()}`,
      folio: genFolio("CON"),
      dictamenFolio: "DIC-AAAA-MM-XXX",
      evaluador: "Nombre Evaluador",
      evaluadorId: "dic-1",
      institucion: "",
      cvaoSnii: "",
      libro: "Libro 1",
      capitulo: "Nuevo capítulo",
      email: "",
      issuedAt: "",
      pdfName: "",
      status: "BORRADOR",
      signaturePreview: null,
    };
    setItems((prev) => [newItem, ...prev]);
    alert("Constancia en borrador creada (demo). Edita los campos cuando conectemos backend.");
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div>
          <h2 style={styles.h2}>Constancias</h2>
          <p style={styles.p}>Emisión y reenvío de constancias desde la plataforma. (demo)</p>
        </div>

        <button style={styles.primaryBtn} onClick={crearConstancia}>
          Nueva constancia
        </button>
      </div>

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Buscar</label>
            <input
              style={styles.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Folio, evaluador, capítulo, correo..."
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Libro</label>
            <select style={styles.input} value={libro} onChange={(e) => setLibro(e.target.value)}>
              {libros.map((b) => (
                <option key={b} value={b}>
                  {b === "ALL" ? "Todos" : b}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Estatus</label>
            <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="ALL">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="EMITIDA">Emitida</option>
            </select>
          </div>
        </div>

        <div style={styles.resultsRow}>
          <span style={styles.muted}>
            Mostrando <b>{filtered.length}</b> de {items.length} constancias
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Folio</th>
              <th style={styles.th}>Dictamen</th>
              <th style={styles.th}>Evaluador</th>
              <th style={styles.th}>Libro</th>
              <th style={styles.th}>Capítulo</th>
              <th style={styles.th}>Correo</th>
              <th style={styles.th}>Estatus</th>
              <th style={styles.th}>Emitida</th>
              <th style={styles.th}>Firma</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={styles.td}>
                  <div style={styles.cellTitle}>{c.folio}</div>
                  <div style={styles.cellSub}>
                    {c.institucion ? c.institucion : "—"} • {c.cvaoSnii ? c.cvaoSnii : "—"}
                  </div>
                </td>

                <td style={styles.td}>{c.dictamenFolio}</td>
                <td style={styles.td}>{c.evaluador}</td>
                <td style={styles.td}>{c.libro}</td>

                <td style={styles.td}>
                  <div style={styles.cellTitle}>{c.capitulo}</div>
                  <div style={styles.cellSub}>{c.pdfName ? c.pdfName : "Sin PDF (demo)"}</div>
                </td>

                <td style={styles.td}>{c.email || "—"}</td>

                <td style={styles.td}>
                  <span style={{ ...styles.pill, ...statusTone(c.status) }}>
                    {c.status === "BORRADOR" ? "Borrador" : "Emitida"}
                  </span>
                </td>

                <td style={styles.td}>{c.issuedAt ? fmtDate(c.issuedAt) : "—"}</td>

                <td style={styles.td}>
                  {c.signaturePreview ? (
                    <img src={c.signaturePreview} alt="Firma" style={styles.signaturePreview} />
                  ) : (
                    <span style={styles.muted}>—</span>
                  )}
                </td>

                <td style={styles.td}>
                  <div style={styles.actionsRow}>
                    <button style={styles.linkBtn} onClick={() => viewPdf(c)} disabled={c.status === "BORRADOR"}>
                      Ver PDF
                    </button>

                    <button style={styles.linkBtn} onClick={() => downloadPdf(c)} disabled={c.status === "BORRADOR"}>
                      Descargar
                    </button>

                    <button style={styles.secondaryBtn} onClick={() => resendEmail(c)} disabled={c.status === "BORRADOR"}>
                      Reenviar
                    </button>

                    {c.status === "BORRADOR" ? (
                      <button style={styles.primaryBtnSmall} onClick={() => emitirConstancia(c)}>
                        Emitir (UI)
                      </button>
                    ) : (
                      <button style={styles.ghostBtn} onClick={() => revertirABorrador(c)}>
                        Revertir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={10}>
                  No hay resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}

function statusTone(s: ConstanciaStatus): React.CSSProperties {
  if (s === "EMITIDA") return { background: "#E8F7EE", color: "#0A7A35", borderColor: "#BFE9CF" };
  return { background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
}

function genFolio(prefix: "CON" | "DIC") {
  const now = new Date();
  const yy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const n = String(Math.floor(Math.random() * 900) + 100); // demo
  return `${prefix}-${yy}-${mm}-${n}`;
}

function seedConstancias(): Constancia[] {
  return [
    {
      id: "con-001",
      folio: "CON-2026-02-001",
      dictamenFolio: "DIC-2026-02-002",
      evaluador: "Dr. Luis Gómez",
      evaluadorId: "dic-2",
      institucion: "Universidad X",
      cvaoSnii: "CVU: 123456 / SNII: I",
      libro: "Libro 1",
      capitulo: "Desarrollo económico",
      email: "luis.gomez@universidadx.mx",
      issuedAt: "2026-02-02",
      pdfName: "constancia_CON-2026-02-001.pdf",
      status: "EMITIDA",
      signaturePreview: null, // demo (se llenará al emitir con firma)
    },
    {
      id: "con-002",
      folio: "CON-2026-02-002",
      dictamenFolio: "DIC-2026-02-001",
      evaluador: "Dra. Carmen Rivera",
      evaluadorId: "dic-1",
      institucion: "Instituto Y",
      cvaoSnii: "CVU: 987654 / SNII: II",
      libro: "Libro 1",
      capitulo: "Educación y talento",
      email: "carmen.rivera@institutoy.mx",
      issuedAt: "",
      pdfName: "",
      status: "BORRADOR",
      signaturePreview: null,
    },
    {
      id: "con-101",
      folio: "CON-2025-04-007",
      dictamenFolio: "DIC-2025-04-007",
      evaluador: "Dra. Ana Ríos",
      evaluadorId: "dic-3",
      institucion: "Universidad Z",
      cvaoSnii: "CVU: 555888 / SNII: C",
      libro: "Libro 2",
      capitulo: "Docencia y práctica",
      email: "ana.rios@universidadz.mx",
      issuedAt: "2025-04-23",
      pdfName: "constancia_CON-2025-04-007.pdf",
      status: "EMITIDA",
      signaturePreview: null,
    },
  ];
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 14, fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  top: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" },
  h2: { margin: 0, fontSize: 18, color: "#111827" },
  p: { margin: "6px 0 0 0", fontSize: 13, color: "#6B7280" },

  filtersCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, padding: 12 },
  filtersGrid: { display: "grid", gridTemplateColumns: "1fr 240px 220px", gap: 10, alignItems: "end" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 900, color: "#374151" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8DEE9", outline: "none", fontSize: 14, background: "#fff" },

  resultsRow: { marginTop: 10, display: "flex", justifyContent: "space-between" },
  muted: { color: "#6B7280", fontSize: 12 },

  tableCard: { background: "#fff", border: "1px solid #E7EAF0", borderRadius: 16, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, padding: "10px 12px", background: "#F9FAFB", borderBottom: "1px solid #E7EAF0", color: "#374151" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F5F9", fontSize: 13, color: "#111827", verticalAlign: "top" },

  cellTitle: { fontWeight: 900 },
  cellSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  pill: { display: "inline-block", fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid", fontWeight: 900, whiteSpace: "nowrap" },

  signaturePreview: {
    width: 140,
    height: 44,
    objectFit: "contain",
    border: "1px solid #E7EAF0",
    borderRadius: 10,
    background: "#fff",
  },

  actionsRow: { display: "flex", gap: 8, flexWrap: "wrap" },

  linkBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },
  secondaryBtn: { padding: "8px 10px", borderRadius: 10, border: "none", background: "#0F3D3E", color: "#fff", cursor: "pointer", fontWeight: 900 },

  primaryBtn: { padding: "10px 12px", borderRadius: 12, border: "none", background: "#0F3D3E", color: "#fff", cursor: "pointer", fontWeight: 900 },
  primaryBtnSmall: { padding: "8px 10px", borderRadius: 10, border: "none", background: "#0F3D3E", color: "#fff", cursor: "pointer", fontWeight: 900 },

  ghostBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #D8DEE9", background: "#fff", cursor: "pointer", fontWeight: 900 },
};
