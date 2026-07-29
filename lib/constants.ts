/**
 * Constantes de dominio compartidas.
 *
 * Centraliza los mapas de "tipo de pedido" y días de la semana que antes estaban
 * duplicados en ~7 archivos (clientes, rutas de documentos y recomendaciones).
 * Tener una única fuente de verdad evita inconsistencias cuando cambian las
 * etiquetas o el calendario de entregas.
 */

// Nombres de los días indexados por getDay() (0 = domingo ... 6 = sábado)
export const DIAS_SEMANA = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
] as const;

// Identificadores de tipo de pedido usados en toda la app
export type TipoPedido = 'lunes-miercoles' | 'miercoles-viernes' | 'jueves-lunes';

// Etiqueta larga (vistas de detalle, documentos)
export const TIPO_PEDIDO_LABELS: Record<string, string> = {
  'lunes-miercoles': 'Lunes → Miércoles',
  'miercoles-viernes': 'Miércoles → Viernes',
  'jueves-lunes': 'Jueves → Lunes',
};

// Etiqueta corta (listados, calendario)
export const TIPO_PEDIDO_LABELS_SHORT: Record<string, string> = {
  'lunes-miercoles': 'L→Mi',
  'miercoles-viernes': 'Mi→V',
  'jueves-lunes': 'J→L',
};

// Día de la semana (getDay()) en que se ENTREGA cada tipo de pedido
export const TIPO_PEDIDO_TO_DELIVERY_DOW: Record<string, number> = {
  'lunes-miercoles': 3, // entrega miércoles
  'miercoles-viernes': 5, // entrega viernes
  'jueves-lunes': 1, // entrega lunes
};

// Opciones para el formulario de nuevo pedido
export const TIPO_PEDIDO_OPTIONS = [
  { value: 'lunes-miercoles', label: 'Lunes → Miércoles', desc: 'Pides lunes, llega miércoles' },
  { value: 'miercoles-viernes', label: 'Miércoles → Viernes', desc: 'Pides miércoles, llega viernes' },
  { value: 'jueves-lunes', label: 'Jueves → Lunes', desc: 'Pides jueves, llega lunes' },
] as const;

// Categorías de producto
export const CATEGORIAS = ['Verduras', 'Frutas', 'Ensaladas'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/**
 * Deriva el día de entrega (getDay()) a partir de una fecha de entrega explícita
 * o, en su defecto, del tipo de pedido. Devuelve null si no puede determinarse.
 */
export function resolveDeliveryDayOfWeek(
  fechaEntrega: string | null | undefined,
  tipoPedido: string | null | undefined,
): number | null {
  if (fechaEntrega) {
    const d = new Date(fechaEntrega);
    if (!isNaN(d.getTime())) return d.getDay();
  }
  if (tipoPedido) return TIPO_PEDIDO_TO_DELIVERY_DOW[tipoPedido] ?? null;
  return null;
}
