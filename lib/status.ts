/**
 * Modelo de estados de pedido y utilidades de estado compartidas.
 *
 * Fuente única de verdad para la secuencia de vida de un pedido y su progreso.
 * Las vistas visuales (status-viz.tsx) consumen estos datos, y las rutas API y
 * el motor de IA también pueden referenciar las etiquetas para no duplicar texto.
 */

export type PedidoEstado = 'borrador' | 'enviado' | 'recibido';

/**
 * Secuencia de la vida de un pedido. 'Cerrado' es un estado que puede existir
 * en el futuro sin cambiar el modelo: añadir aquí un paso nuevo es suficiente
 * para que steppers y progreso se recalibren.
 */
export const PEDIDO_ESTADOS: PedidoEstado[] = ['borrador', 'enviado', 'recibido'];

export interface EstadoMeta {
  label: string;
  /** Progreso 0-100 asociado a este estado (para la barra/los pasos). */
  progress: number;
  /** Tono semántico. */
  tone: 'muted' | 'info' | 'success' | 'warning' | 'danger';
}

export const PEDIDO_ESTADO_META: Record<PedidoEstado, EstadoMeta> = {
  borrador: { label: 'Borrador', progress: 0, tone: 'muted' },
  enviado: { label: 'Enviado', progress: 50, tone: 'info' },
  recibido: { label: 'Recibido', progress: 100, tone: 'success' },
};

/** Devuelve el progreso (%) del estado, siempre 0-100. */
export function estadoProgress(estado: string | null | undefined): number {
  const meta = PEDIDO_ESTADO_META[estado as PedidoEstado];
  if (!meta) return 0;
  return meta.progress;
}

/** Índice (0-based) de un estado dentro de la secuencia; -1 si es desconocido. */
export function estadoIndex(estado: string | null | undefined): number {
  const idx = PEDIDO_ESTADOS.indexOf(estado as PedidoEstado);
  return idx;
}

/** Etiqueta legible de un estado. */
export function estadoLabel(estado: string | null | undefined): string {
  return PEDIDO_ESTADO_META[estado as PedidoEstado]?.label ?? (estado || 'Sin estado');
}

/** Texto "Pedido preparado · 70%" a partir del progreso. */
export function estadoProgressLabel(estado: string | null | undefined): string {
  const pct = estadoProgress(estado);
  return `${estadoLabel(estado)} · ${pct}%`;
}

/** Compara si una cantidad recibida coincide con la solicitada (margen 0). */
export type DiffTone = 'ok' | 'less' | 'more';
export function diffTone(pedido: number, recibido: number): DiffTone {
  if (recibido > pedido) return 'more';
  if (recibido < pedido) return 'less';
  return 'ok';
}

/** Formatea un número evitando decimales al final (5 -> "5", 5.5 -> "5.5"). */
export function fmtNumber(n: number | null | undefined, maxDecimals = 1): string {
  if (n == null || Number.isNaN(n)) return '0';
  const r = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals;
  return Number.isInteger(r) ? String(r) : r.toFixed(maxDecimals).replace(/\.?0+$/, '');
}
