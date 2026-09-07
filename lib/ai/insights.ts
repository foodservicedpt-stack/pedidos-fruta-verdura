/**
 * Motor de insights deterministas.
 *
 * Convierte el histórico REAL en frases útiles ("normalmente pedís 20 kg",
 * "esta semana 32 kg (+18%)"). NO usa IA: es lógica de negocio pura y por tanto
 * barata, instantánea y fiable. La IA solo añade narrativa después.
 */
import type { ProductInsight } from './types';
import type { SeasonStatus } from '@/lib/seasonality/types';
import { fmtNumber } from '@/lib/status';

export interface HistoricPoint {
  fecha: Date;
  cantidad: number;
}

export interface InsightInput {
  productoId: number;
  nombre: string;
  categoria: string;
  unidad: string;
  historicos: HistoricPoint[];
  temporada: SeasonStatus;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Tendencia simple: compara la media de la 2ª mitad con la 1ª mitad. */
function trend(historicos: HistoricPoint[]): 'sube' | 'baja' | 'estable' | null {
  if (historicos.length < 4) return null;
  const half = Math.floor(historicos.length / 2);
  const first = avg(historicos.slice(0, half).map(h => h.cantidad));
  const second = avg(historicos.slice(half).map(h => h.cantidad));
  if (first === 0) return second > 0 ? 'sube' : null;
  const pct = ((second - first) / first) * 100;
  if (pct > 8) return 'sube';
  if (pct < -8) return 'baja';
  return 'estable';
}

export function computeInsight({ productoId, nombre, categoria, unidad, historicos, temporada }: InsightInput): ProductInsight {
  const sorted = [...historicos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  // Ventana: últimos 10 registros para el promedio.
  const windowData = sorted.slice(-10);
  const cantidades = windowData.map(h => h.cantidad);
  const promedio = Math.round(avg(cantidades) * 10) / 10;
  const ultima = sorted.length ? sorted[sorted.length - 1].cantidad : 0;
  const variacion = promedio > 0 ? Math.round(((ultima - promedio) / promedio) * 100) : null;
  const tendencia = trend(sorted);
  const numPedidos = sorted.length;

  const mensajes: string[] = [];
  if (promedio > 0) {
    mensajes.push('Normalmente pides ' + fmtNumber(promedio) + ' ' + unidad + '.');
  }
  if (numPedidos === 0) {
    mensajes.push('Sin historial de pedidos para este producto.');
  }
  if (variacion != null) {
    if (variacion > 15) mensajes.push('Último pedido un ' + variacion + '% por encima de tu media.');
    else if (variacion < -15) mensajes.push('Último pedido un ' + Math.abs(variacion) + '% por debajo de tu media.');
    else mensajes.push('Último pedido en línea con tu media.');
  }
  if (tendencia === 'sube') mensajes.push('Está aumentando en tus pedidos recientes.');
  else if (tendencia === 'baja') mensajes.push('Está bajando en tus pedidos recientes.');
  else if (tendencia === 'estable') mensajes.push('Se mantiene estable.');

  if (temporada.state === 'fuera') {
    mensajes.push('Fuera de su temporada habitual (' + temporada.monthsLabel + ').');
  } else if (temporada.state === 'optima' && temporada.availability === 'alta') {
    mensajes.push('En plena temporada, buena disponibilidad.');
  }

  return {
    productoId,
    nombre,
    categoria,
    unidad,
    promedio,
    ultima,
    variacion,
    tendencia,
    numPedidos,
    temporada,
    mensajes,
  };
}
