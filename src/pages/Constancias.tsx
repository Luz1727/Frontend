import React, { useMemo, useState } from "react";
import styles from './Constancias.module.css';

type Role = "editorial" | "dictaminador" | "autor";
type User = { id: number | string; name: string; email: string; role: Role };

type ConstanciaStatus = "BORRADOR" | "EMITIDA";

type Constancia = {
  id: string;
  folio: string;
  dictamenFolio: string;
  evaluador: string;
  evaluadorId: string;
  institucion: string;
  cvaoSnii: string;
  libro: string;
  capitulo: string;
  email: string;
  issuedAt: string;
  pdfName: string;
  status: ConstanciaStatus;
  signaturePreview?: string | null;
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

// ✅ Función para obtener la clase del pill según el estado
function getPillClass(status: ConstanciaStatus): string {
  const baseClass = styles.pill;
  
  if (status === "EMITIDA") {
    return `${baseClass} ${styles.pillEmitida}`;
  }
  return `${baseClass} ${styles.pillBorrador}`;
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
    if (user?.role !== "editorial") {
      alert("Solo Editorial puede emitir constancias en este MVP.");
      return;
    }

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
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>Constancias</h2>
          <p className={styles.p}>Emisión y reenvío de constancias desde la plataforma. (demo)</p>
        </div>

        <button className={styles.primaryBtn} onClick={crearConstancia}>
          Nueva constancia
        </button>
      </div>

      {/* Filtros */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Buscar</label>
            <input
              className={styles.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Folio, evaluador, capítulo, correo..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Libro</label>
            <select className={styles.input} value={libro} onChange={(e) => setLibro(e.target.value)}>
              {libros.map((b) => (
                <option key={b} value={b}>
                  {b === "ALL" ? "Todos" : b}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Estatus</label>
            <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="ALL">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="EMITIDA">Emitida</option>
            </select>
          </div>
        </div>

        <div className={styles.resultsRow}>
          <span className={styles.muted}>
            Mostrando <b>{filtered.length}</b> de {items.length} constancias
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Folio</th>
              <th className={styles.th}>Dictamen</th>
              <th className={styles.th}>Evaluador</th>
              <th className={styles.th}>Libro</th>
              <th className={styles.th}>Capítulo</th>
              <th className={styles.th}>Correo</th>
              <th className={styles.th}>Estatus</th>
              <th className={styles.th}>Emitida</th>
              <th className={styles.th}>Firma</th>
              <th className={styles.th}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className={styles.td}>
                  <div className={styles.cellTitle}>{c.folio}</div>
                  <div className={styles.cellSub}>
                    {c.institucion ? c.institucion : "—"} • {c.cvaoSnii ? c.cvaoSnii : "—"}
                  </div>
                </td>

                <td className={styles.td}>{c.dictamenFolio}</td>
                <td className={styles.td}>{c.evaluador}</td>
                <td className={styles.td}>{c.libro}</td>

                <td className={styles.td}>
                  <div className={styles.cellTitle}>{c.capitulo}</div>
                  <div className={styles.cellSub}>{c.pdfName ? c.pdfName : "Sin PDF (demo)"}</div>
                </td>

                <td className={styles.td}>{c.email || "—"}</td>

                <td className={styles.td}>
                  <span className={getPillClass(c.status)}>
                    {c.status === "BORRADOR" ? "Borrador" : "Emitida"}
                  </span>
                </td>

                <td className={styles.td}>{c.issuedAt ? fmtDate(c.issuedAt) : "—"}</td>

                <td className={styles.td}>
                  {c.signaturePreview ? (
                    <img src={c.signaturePreview} alt="Firma" className={styles.signaturePreview} />
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>

                <td className={styles.td}>
                  <div className={styles.actionsRow}>
                    <button className={styles.linkBtn} onClick={() => viewPdf(c)} disabled={c.status === "BORRADOR"}>
                      Ver PDF
                    </button>

                    <button className={styles.linkBtn} onClick={() => downloadPdf(c)} disabled={c.status === "BORRADOR"}>
                      Descargar
                    </button>

                    <button className={styles.secondaryBtn} onClick={() => resendEmail(c)} disabled={c.status === "BORRADOR"}>
                      Reenviar
                    </button>

                    {c.status === "BORRADOR" ? (
                      <button className={styles.primaryBtnSmall} onClick={() => emitirConstancia(c)}>
                        Emitir (UI)
                      </button>
                    ) : (
                      <button className={styles.ghostBtn} onClick={() => revertirABorrador(c)}>
                        Revertir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className={styles.td} colSpan={10}>
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

function genFolio(prefix: "CON" | "DIC") {
  const now = new Date();
  const yy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const n = String(Math.floor(Math.random() * 900) + 100);
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
      signaturePreview: null,
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