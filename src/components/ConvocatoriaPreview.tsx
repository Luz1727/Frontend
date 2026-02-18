import React from "react";
import type { Convocatoria } from "../services/convocatoria";
import "./ConvocatoriaPreview.css";

export default function ConvocatoriaPreview({ c }: { c: Convocatoria }) {
  const reqLines = toCleanLines(c.requirements);
  const notesLines = toCleanLines(c.notes);

  return (
    <div className="cp-card">
      <div className="cp-top">
        <div className="cp-left">
          <div className="cp-h1">{c.title || "Título de la convocatoria"}</div>
          <div className="cp-sub">
            <span className="cp-chip cp-chip-blue">Año {c.year}</span>
            <span className="cp-chip cp-chip-soft">
              Vigencia: {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
            </span>
          </div>
        </div>

        <div className="cp-right">
          {c.templatePdfName ? (
            <span className="cp-chip cp-chip-ok">Plantilla OK</span>
          ) : (
            <span className="cp-chip cp-chip-warn">Sin plantilla</span>
          )}
          {c.finalPdfName ? (
            <span className="cp-chip cp-chip-ok">PDF final OK</span>
          ) : (
            <span className="cp-chip cp-chip-soft">Sin final</span>
          )}
        </div>
      </div>

      <div className="cp-grid">
        <Section title="Descripción / objetivo">
          <Paragraph text={c.description} placeholder="Agrega una descripción clara de la convocatoria." />
        </Section>

        <Section title="Requisitos">
          {reqLines.length ? (
            <ul className="cp-ul">
              {reqLines.map((x, i) => (
                <li key={i} className="cp-li">
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <Paragraph text="" placeholder="Escribe 1 requisito por línea para que se vea como lista." />
          )}
        </Section>

        <div className="cp-row2">
          <MiniField label="Correo de envío" value={c.submissionEmail} placeholder="recepcion@editorial.mx" />
          <MiniField label="Contacto" value={c.contactInfo} placeholder="Tel / correo / horario" />
        </div>

        <Section title="Notas">
          {notesLines.length ? (
            notesLines.map((x, i) => (
              <div key={i} className="cp-noteLine">
                {x}
              </div>
            ))
          ) : (
            <Paragraph text="" placeholder="Notas opcionales (p. ej. consideraciones especiales)." />
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cp-section">
      <div className="cp-sectionTitle">{title}</div>
      <div className="cp-sectionBody">{children}</div>
    </div>
  );
}

function MiniField({ label, value, placeholder }: { label: string; value: string; placeholder: string }) {
  const v = (value || "").trim();
  return (
    <div className="cp-mini">
      <div className="cp-miniLabel">{label}</div>
      <div className="cp-miniValue">{v ? v : <span className="cp-muted">{placeholder}</span>}</div>
    </div>
  );
}

function Paragraph({ text, placeholder }: { text: string; placeholder: string }) {
  const t = (text || "").trim();
  return <div className="cp-paragraph">{t ? t : <span className="cp-muted">{placeholder}</span>}</div>;
}

function toCleanLines(text: string) {
  return (text || "")
    .split("\n")
    .map((x) => x.replace(/^(\s*[-•*]\s*)/, "").trim())
    .filter(Boolean);
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}
