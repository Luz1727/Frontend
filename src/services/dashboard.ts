import { api } from "./api";

export type DashboardSummary = {
  capitulos_recibidos_hoy: number;
  en_revision: number;
  correcciones: number;
  aprobados: number;
  constancias_pendientes: number;
};

export async function getDashboardSummary() {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary");
  return data;
}
