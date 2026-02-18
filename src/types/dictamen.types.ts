// src/types/dictamen.types.ts (crea este archivo)
export type Status = 
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "ENVIADO_A_DICTAMINADOR"
  | "EN_REVISION_DICTAMINADOR"
  | "CORRECCIONES_SOLICITADAS_A_AUTOR"
  | "REENVIADO_POR_AUTOR"
  | "REVISADO_POR_EDITORIAL"
  | "LISTO_PARA_FIRMA"
  | "FIRMADO"
  | "APROBADO"
  | "RECHAZADO";

export type DictamenStatus = 'BORRADOR' | 'GENERADO' | 'FIRMADO';
export type DictamenDecision = 'APROBADO' | 'CORRECCIONES' | 'RECHAZADO';
export type DictamenTipo = 'INVESTIGACION' | 'DOCENCIA';

export interface CriterioEvaluacion {
  id: string;
  nombre: string;
  puntaje: 1 | 2 | 3 | 4 | 5;
  criterio_key?: string; // Para la BD
}

export interface Dictamen {
  id: string;
  folio: string;
  chapter_id: string;
  evaluador_id: string;
  evaluador_nombre: string;
  evaluador_email: string;
  evaluador_cvu: string;
  tipo: DictamenTipo;
  decision: DictamenDecision;
  status: DictamenStatus;
  promedio: number;
  comentarios: string;
  conflicto_interes: string;
  criterios: CriterioEvaluacion[];
  pdf_path?: string;
  signed_pdf_path?: string;
  signed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Constancia {
  id: string;
  folio: string;
  dictamen_id: string;
  evaluador_id: string;
  evaluador_nombre: string;
  evaluador_cvu: string;
  institution?: string;
  pdf_path: string;
  issued_at: string;
}