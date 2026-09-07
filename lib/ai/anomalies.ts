/**
 * Detección de anomalías entre pedido y recepción. LÓGICA DETERMINISTA.
 *
 * La IA NO decide si hay una diferencia; la computa este módulo a partir de los
 * datos reales. La IA (opcional) puede después explicarla, nunca inventarla.
 */
import type { Anomaly } from './types';
import { fmtNumber } from '@/lib/status';

export interface RecepcionDetail {
  detalleId: number;
  productoId: number;
  nombre: string;
  unidad: string;
  cantidadSolicitada: number;
  cantidadRecibida: number | null | undefined;
  [key: string]: unknown;
}

export interface RecepcionExtras {
  productoId: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  [key: string]: unknown;
}

export interface DetectAnomaliesInput {
  detalles: RecepcionDetail[];
  extras?: RecepcionExtras[];
  noRegistrados?: { nombre: string; cantidad: number }[];
}

/** Umbral en % para considerar que entró "bastante más" de lo pedido. */
const BIG_DELTA_PCT = 0.5;

export function detectAnomalies({ detalles, extras = [], noRegistrados = [] }: DetectAnomaliesInput): Anomaly[] {
  const anomalias: Anomaly[] = [];

  for (const d of detalles) {
    const sol = d.cantidadSolicitada ?? 0;
    const rec = d.cantidadRecibida ?? 0;
    const diff = rec - sol;

    if (sol > 0 && rec === 0) {
      anomalias.push({
        id: 'nl-' + d.detalleId,
        tipo: 'no_llego',
        tono: 'danger',
        titulo: d.nombre + ' no llegó',
        detalle: 'Pedido ' + fmtNumber(sol) + ' ' + d.unidad + ' y la recepción es 0.',
        cantidad: 0,
      });
      continue;
    }

    if (diff !== 0) {
      if (rec > sol && diff / sol >= BIG_DELTA_PCT) {
        anomalias.push({
          id: 'gd-' + d.detalleId,
          tipo: 'entrada_grande',
          tono: 'warning',
          titulo: d.nombre + ': entró bastante más',
          detalle: 'Pedido ' + fmtNumber(sol) + ' y recibido ' + fmtNumber(rec) + ' ' + d.unidad + ' (+' + fmtNumber(diff) + ').',
          cantidad: diff,
        });
      } else {
        anomalias.push({
          id: 'df-' + d.detalleId,
          tipo: 'diferencia',
          tono: 'warning',
          titulo: d.nombre + ': diferencia con el pedido',
          detalle: 'Pedido ' + fmtNumber(sol) + ' y recibido ' + fmtNumber(rec) + ' ' + d.unidad + ' (' + (diff > 0 ? '+' : '') + fmtNumber(diff) + ').',
          cantidad: diff,
        });
      }
    }
  }

  for (const ex of extras) {
    anomalias.push({
      id: 'ex-' + ex.productoId,
      tipo: 'extra',
      tono: 'info',
      titulo: ex.nombre + ' sin pedir',
      detalle: 'Llegó sin estar en el pedido: ' + fmtNumber(ex.cantidad) + ' ' + ex.unidad + '.',
      cantidad: ex.cantidad,
    });
  }

  for (const nr of noRegistrados) {
    anomalias.push({
      id: 'nr-' + nr.nombre,
      tipo: 'no_registrado',
      tono: 'warning',
      titulo: nr.nombre + ' no está en el sistema',
      detalle: 'Producto del albarán sin dar de alta (' + fmtNumber(nr.cantidad) + ').',
      cantidad: nr.cantidad,
    });
  }

  return anomalias;
}

/** Resumen determinista para la UI (sin IA). */
export function countAnomalies(anomalias: Anomaly[]): { total: number; danger: number; warning: number; ok: number } {
  const total = anomalias.length;
  const danger = anomalias.filter(a => a.tono === 'danger').length;
  const warning = anomalias.filter(a => a.tono === 'warning').length;
  const ok = total - danger - warning;
  return { total, danger, warning, ok };
}
