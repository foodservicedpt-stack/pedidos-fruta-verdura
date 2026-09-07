/**
 * Tipos compartidos por la capa de IA.
 *
 * IMPORTANTE: la IA es interpretación + recomendación. Los datos estructurados
 * (temporada, histórico, pedido/recepción) son la fuente de verdad. Estos tipos
 * reflejan esa separación.
 */
import type { SeasonStatus } from '@/lib/seasonality/types';

/** Insight de un producto basado en el histórico (determinista). */
export interface ProductInsight {
  productoId: number;
  nombre: string;
  categoria: string;
  unidad: string;
  /** Media de los últimos N pedidos. */
  promedio: number;
  /** Última cantidad pedida en la ventana. */
  ultima: number;
  /** Variación % de la última cantidad respecto a la media. */
  variacion: number | null;
  /** Tendencia de la ventana: 'sube' | 'baja' | 'estable' | null (sin datos). */
  tendencia: 'sube' | 'baja' | 'estable' | null;
  /** Número de pedidos en la ventana. */
  numPedidos: number;
  /** Estado de temporada actual (dato estructurado). */
  temporada: SeasonStatus;
  /** Frases de insight ya razonadas en local (sin IA). */
  mensajes: string[];
}

/** Recomendación contextual para un pedido. */
export interface Recommendation {
  productoId: number;
  nombre: string;
  categoria: string;
  unidad: string;
  /** Acción/recomendación: 'mantener' | 'aumentar' | 'reducir' | 'probar' | 'atencion'. */
  tipo: 'mantener' | 'aumentar' | 'reducir' | 'probar' | 'atencion';
  /** Nivel de recomendación. */
  prioridad: 'alta' | 'media' | 'baja';
  /** Tono semántico. */
  tone: 'info' | 'success' | 'warning' | 'danger' | 'muted';
  /** Título corto. */
  titulo: string;
  /** Explicación breve, basada en datos REALES. */
  detalle: string;
  /** Evidencia usada (para que el usuario vea de dónde sale). */
  base: string[];
  /** Valor sugerido, si procede. */
  cantidadSugerida?: number;
}

/** Anomalía detectada entre pedido y recepción (determinista). */
export interface Anomaly {
  id: string;
  tipo: 'diferencia' | 'no_llego' | 'extra' | 'no_registrado' | 'entrada_grande' | 'entrada_cero';
  tono: 'info' | 'warning' | 'danger';
  titulo: string;
  detalle: string;
  cantidad?: number;
}

/** Resumen legible de una recepción (IA). */
export interface ReceptionSummary {
  totalProductos: number;
  totalDiferencias: number;
  resumen: string;
}

export type GeminiResult<T> = { ok: true; data: T } | { ok: false; error: string };
