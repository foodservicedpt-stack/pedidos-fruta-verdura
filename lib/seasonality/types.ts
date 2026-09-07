/**
 * Tipos del motor de temporalidad (seasonality).
 *
 * La temporalidad es DATOS ESTRUCTURADOS (fuente de verdad). Gemini puede
 * razonar sobre ella, pero nunca inventar meses ni orígenes: se le entrega
 * este modelo de datos y se le pide que lo interprete.
 */

export type SeasonState = 'optima' | 'transicion' | 'fuera';

export type AvailabilityLevel = 'alta' | 'media' | 'baja' | 'desconocida';

export type SeasonCategory = 'Verduras' | 'Frutas' | 'Ensaladas';

/** Rango de meses [inicio, fin], 1-12, puede cruzar fin de año (Oct-Mar = [10,3]). */
export type MonthRange = [number, number];

export interface ProductSeasonData {
  /** Clave normalizada para el matching (minúsculas, sin tildes). */
  key: string;
  category: SeasonCategory;
  /** Temporada principal. */
  mainMonths: MonthRange;
  /** Temporada secundaria (pico menor, opcional). */
  secondaryMonths?: MonthRange;
  /** Origen habitual en el mercado español. */
  origin?: string;
  /** ¿Suele haber producción nacional? */
  national?: boolean;
  /** ¿Suele venir de importación? */
  imported?: boolean;
  /** Nivel de disponibilidad en temporada. */
  availability: AvailabilityLevel;
  /** Notas del producto. */
  notes?: string;
}

/** Estado calculado para un momento concreto. */
export interface SeasonStatus {
  state: SeasonState;
  /** Etiqueta corta: 'En temporada', 'Inicio/fin temporada', 'Fuera de temporada'. */
  label: string;
  /** Etiqueta del producto (p.ej. 'Temporada principal'). */
  seasonLabel: string;
  /** Tono semántico para la UI. */
  tone: 'success' | 'warning' | 'danger' | 'muted';
  /** Rango de meses legible, p.ej. 'Marzo – Junio'. */
  monthsLabel: string;
  /** Rango numérico calculado. */
  range: MonthRange | null;
  /** Mensaje humano preparado (sin datos inventados). */
  message: string;
  /** Disponibilidad en temporada. */
  availability: AvailabilityLevel;
  origin?: string;
  national?: boolean;
  imported?: boolean;
  notes?: string;
}
