/**
 * Motor de temporalidad. Lee los datos estructurados y calcula el estado actual.
 *
 * LÓGICA DETERMINISTA: decide aquí qué está en temporada, NO en la IA. La IA solo
 * interpreta el resultado. El motor nunca inventa: si no hay datos, devuelve
 * 'desconocida' en lugar de asumir.
 */
import { SEASON_DATA } from './data';
export { SEASON_DATA };
import type { MonthRange, ProductSeasonData, SeasonState, SeasonStatus, AvailabilityLevel, SeasonCategory } from './types';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const MESES_NOMBRES = MONTHS;

/** Normaliza un nombre para el matching: minúsculas y sin tildes. */
function normalize(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .trim();
}

function findDataProduct(nombre: string): ProductSeasonData | null {
  const key = normalize(nombre);
  if (!key) return null;
  // 1) match por key exacta o conteniendo la clave del producto
  const sorted = [...SEASON_DATA].sort((a, b) => b.key.length - a.key.length);
  for (const p of sorted) {
    if (key === p.key || key.includes(p.key) || p.key.includes(key)) return p;
  }
  return null;
}

/** Comprueba si un mes está dentro de un rango que puede cruzar fin de año. */
function inRange(month: number, range: MonthRange): boolean {
  const [start, end] = range;
  const s = ((start - 1 + 12) % 12) + 1;
  const e = ((end - 1 + 12) % 12) + 1;
  if (s <= e) return month >= s && month <= e;
  return month >= s || month <= e;
}

function rangeLabel(range: MonthRange | null): string {
  if (!range) return 'Sin datos';
  const [s, e] = range;
  if (s === 1 && e === 12) return 'Todo el año';
  return `${MONTHS_SHORT[s - 1]} – ${MONTHS_SHORT[e - 1]}`;
}

function stateForMonth(p: ProductSeasonData, month: number): { state: SeasonState; seasonLabel: string; range: MonthRange; tone: SeasonStatus['tone'] } {
  if (inRange(month, p.mainMonths)) {
    return { state: 'optima', seasonLabel: 'Temporada principal', range: p.mainMonths, tone: 'success' };
  }
  if (p.secondaryMonths && inRange(month, p.secondaryMonths)) {
    return { state: 'transicion', seasonLabel: 'Temporada secundaria', range: p.secondaryMonths, tone: 'warning' };
  }
  // Transición cerca de los bordes de la temporada principal
  if (nearBoundary(month, p.mainMonths)) {
    return { state: 'transicion', seasonLabel: 'Inicio/fin de temporada', range: p.mainMonths, tone: 'warning' };
  }
  return { state: 'fuera', seasonLabel: 'Fuera de temporada', range: p.mainMonths, tone: 'danger' };
}

function nearBoundary(month: number, range: MonthRange): boolean {
  const [s, e] = range;
  const ss = ((s - 1 + 12) % 12) + 1;
  const ee = ((e - 1 + 12) % 12) + 1;
  return month === ((ss - 1 + 12) % 12) + 1 || month === ((ss - 2 + 12) % 12) + 1 || month === ((ee - 1 + 12) % 12) + 1 || month === ((ee + 1 + 12) % 12) + 1;
}

function messageFor(state: SeasonState, seasonLabel: string, range: MonthRange, _availability: AvailabilityLevel): string {
  switch (state) {
    case 'optima':
      return range[0] === 1 && range[1] === 12
        ? 'Disponible todo el año (producción nacional habitual).'
        : `En plena temporada (${rangeLabel(range)}).`;
    case 'transicion':
      return `En ${seasonLabel.toLowerCase()} (${rangeLabel(range)}).`;
    case 'fuera':
      return `Fuera de su temporada habitual (${rangeLabel(range)}). Disponible, pero puede ser importado o de menor calidad.`;
  }
}

/**
 * Calcula el estado de temporada de un producto.
 * @param nombre Nombre del producto (puede ser comercial, p.ej. "Fresa extra").
 * @param customMonths Rango propio del producto si se definió en la BD.
 * @param monthOverride Mes (1-12) para testear; por defecto el mes actual.
 */
export function getSeasonStatus(nombre: string, customMonths?: { mesInicio: number | null; mesFin: number | null } | null, monthOverride?: number): SeasonStatus {
  const month = monthOverride ?? (new Date().getMonth() + 1);
  const data = findDataProduct(nombre);

  // Prioridad: datos custom de la BD, luego el calendario estructurado.
  if (customMonths?.mesInicio != null && customMonths?.mesFin != null) {
    const range: MonthRange = [customMonths.mesInicio, customMonths.mesFin];
    const { state, seasonLabel, tone } = stateForMonth({ ...({} as ProductSeasonData), mainMonths: range, availability: 'desconocida', key: normalize(nombre), category: data?.category ?? 'Verduras' }, month);
    return {
      state, label: stateLabel(state), seasonLabel, tone, range,
      monthsLabel: rangeLabel(range),
      message: messageFor(state, seasonLabel, range, 'desconocida'),
      availability: 'desconocida',
    };
  }

  if (!data) {
    return {
      state: 'optima',
      label: 'Disponible',
      seasonLabel: 'Sin datos de temporada',
      tone: 'muted',
      range: null,
      monthsLabel: 'Sin datos',
      message: 'No hay datos de temporada registrados para este producto.',
      availability: 'desconocida',
    };
  }

  const { state, seasonLabel, range, tone } = stateForMonth(data, month);
  return {
    state,
    label: stateLabel(state),
    seasonLabel,
    tone,
    range,
    monthsLabel: rangeLabel(range),
    message: messageFor(state, seasonLabel, range, data.availability),
    availability: data.availability,
    origin: data.origin,
    national: data.national,
    imported: data.imported,
    notes: data.notes,
  };
}

function stateLabel(state: SeasonState): string {
  return state === 'optima' ? 'En temporada' : state === 'transicion' ? 'Inicio/fin temporada' : 'Fuera de temporada';
}

/** Compatibilidad con la API antigua de lib/temporada. */
export function getTemporadaInfo(nombre: string, mesInicioCustom?: number | null, mesFinCustom?: number | null) {
  const status = getSeasonStatus(nombre, { mesInicio: mesInicioCustom ?? null, mesFin: mesFinCustom ?? null });
  const colorMap = { success: 'text-success', warning: 'text-warning', danger: 'text-danger', muted: 'text-muted-foreground' } as const;
  const bgMap = { success: 'bg-success-soft', warning: 'bg-warning-soft', danger: 'bg-danger-soft', muted: 'bg-muted' } as const;
  const borderMap = { success: 'border-success/30', warning: 'border-warning/30', danger: 'border-danger/30', muted: 'border-border' } as const;
  return {
    estado: status.tone === 'muted' ? 'optima' : status.state,
    label: status.label,
    color: colorMap[status.tone],
    bgColor: bgMap[status.tone],
    borderColor: borderMap[status.tone],
  };
}

export function getMesesTemporada(nombre: string): { mesInicio: number | null; mesFin: number | null } {
  const data = findDataProduct(nombre);
  if (data) return { mesInicio: data.mainMonths[0], mesFin: data.mainMonths[1] };
  return { mesInicio: null, mesFin: null };
}

/** Lista los productos actualmente en temporada, ordenados por disponibilidad. */
export function getInSeasonProducts(category?: SeasonCategory | null, monthOverride?: number): ProductSeasonData[] {
  const month = monthOverride ?? (new Date().getMonth() + 1);
  return SEASON_DATA
    .filter(p => !category || p.category === category)
    .filter(p => inRange(month, p.mainMonths))
    .sort((a, b) => {
      const av = { alta: 0, media: 1, baja: 2, desconocida: 3 };
      return av[a.availability] - av[b.availability];
    });
}

/** ¿Está actualmente en temporada principal? */
export function isInSeason(nombre: string, monthOverride?: number): boolean {
  const status = getSeasonStatus(nombre, null, monthOverride);
  return status.state === 'optima';
}

export const SEASON_CATEGORIES: SeasonCategory[] = ['Verduras', 'Frutas', 'Ensaladas'];
