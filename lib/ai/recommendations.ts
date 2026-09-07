/**
 * Motor de recomendaciones HÍBRIDO.
 *
 * Orden: DATOS ESTRUCTURADOS (temporada) → LÓGICA DE NEGOCIO (histórico) → IA.
 * Este módulo resuelve los dos primeros de forma determinista. La IA solo
 * añade narrativa/alternativas después (ver prompts.ts). NUNCA se bloquea ni se
 * oculta un producto: recomendar es ayudar, no impedir.
 */
import type { Recommendation } from './types';
import type { ProductInsight } from './types';
import { getSeasonStatus, getInSeasonProducts, SEASON_DATA } from '@/lib/seasonality/engine';
import type { ProductSeasonData } from '@/lib/seasonality/types';
import { fmtNumber } from '@/lib/status';

/** Encuentra alternativas en temporada (misma categoría, o cualquier categoría). */
export function findSeasonAlternatives(nombre: string, category?: string, limit = 4): { nombre: string; categoria: string; availability: string }[] {
  const current = getSeasonStatus(nombre, null);
  if (current.state !== 'fuera') return [];
  const cat = category as ProductSeasonData['category'] | undefined;
  return getInSeasonProducts(cat ?? null)
    .filter(p => p.key !== (nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .slice(0, limit)
    .map(p => ({ nombre: p.key, categoria: p.category, availability: p.availability }));
}

/**
 * Genera recomendaciones contextuales para un conjunto de productos.
 * @param insights Insights por producto (histórico + temporada).
 * @param currentCantidades Cantidades del pedido actual (productoId -> cantidad).
 */
export function buildRecommendations(insights: ProductInsight[], currentCantidades: Record<number, number> = {}): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const ins of insights) {
    const temp = ins.temporada;
    const current = currentCantidades[ins.productoId]; // may be undefined
    const hasCurrent = current != null && current > 0;

    // 1) Fuera de temporada -> atención (no bloquea).
    if (temp.state === 'fuera') {
      recs.push({
        productoId: ins.productoId,
        nombre: ins.nombre,
        categoria: ins.categoria,
        unidad: ins.unidad,
        tipo: 'atencion',
        prioridad: 'media',
        tone: 'warning',
        titulo: ins.nombre + ' — fuera de temporada',
        detalle: 'Disponible, pero actualmente fuera de su temporada habitual en España (' + temp.monthsLabel + ').',
        base: ['Temporada: ' + temp.monthsLabel, 'Fuente: calendario de temporada estructurado'],
      });
      continue;
    }

    // 2) Pedido con cantidad muy superior a la media -> aviso.
    if (hasCurrent && ins.promedio > 0 && current / ins.promedio > 1.3) {
      recs.push({
        productoId: ins.productoId,
        nombre: ins.nombre,
        categoria: ins.categoria,
        unidad: ins.unidad,
        tipo: 'reducir',
        prioridad: 'media',
        tone: 'warning',
        titulo: ins.nombre + ' por encima de tu media',
        detalle: 'Has pedido ' + fmtNumber(current) + ' ' + ins.unidad + ' y normalmente pides ' + fmtNumber(ins.promedio) + '.' + (ins.variacion != null ? ' Un ' + ins.variacion + '% sobre tu media.' : ''),
        base: ['Pedido actual: ' + fmtNumber(current), 'Media reciente: ' + fmtNumber(ins.promedio) + ' ' + ins.unidad],
      });
      continue;
    }

    // 3) En temporada + buena disponibilidad y sin pedido todavía -> probar.
    if (temp.state === 'optima' && temp.availability === 'alta' && !hasCurrent && ins.numPedidos > 0) {
      recs.push({
        productoId: ins.productoId,
        nombre: ins.nombre,
        categoria: ins.categoria,
        unidad: ins.unidad,
        tipo: 'probar',
        prioridad: 'alta',
        tone: 'success',
        titulo: 'Buen momento para ' + ins.nombre.toLowerCase(),
        detalle: 'Está en plena temporada (' + temp.monthsLabel + ') con buena disponibilidad.' + (ins.promedio > 0 ? ' Suele pedir ' + fmtNumber(ins.promedio) + ' ' + ins.unidad + '.' : ''),
        base: ['Temporada principal', 'Disponibilidad: alta', ins.promedio > 0 ? 'Histórico: ' + fmtNumber(ins.promedio) + ' ' + ins.unidad : ''],
        cantidadSugerida: ins.promedio > 0 ? ins.promedio : undefined,
      });
      continue;
    }

    // 4) Todo en orden -> mantener.
    recs.push({
      productoId: ins.productoId,
      nombre: ins.nombre,
      categoria: ins.categoria,
      unidad: ins.unidad,
      tipo: ins.tendencia === 'sube' ? 'aumentar' : 'mantener',
      prioridad: 'baja',
      tone: ins.tendencia === 'sube' ? 'info' : 'muted',
      titulo: ins.nombre + (ins.tendencia === 'sube' ? ' — en aumento' : ' — en orden'),
      detalle: ins.mensajes.slice(0, 2).join(' ') || 'Sin incidencias.',
      base: ins.mensajes.slice(0, 3),
    });
  }

  // Ordenar por prioridad (alta primero) y luego por tono crítico.
  const prio = { alta: 0, media: 1, baja: 2 };
  const tone = { danger: 0, warning: 1, info: 2, success: 3, muted: 4 };
  return recs.sort((a, b) => (prio[a.prioridad] - prio[b.prioridad]) || (tone[a.tone] - tone[b.tone]));
}

/** Recomendaciones "de temporada" independientes del histórico (para el dashboard). */
export function buildSeasonSpotlight(category?: string, limit = 6): Recommendation[] {
  return getInSeasonProducts((category as ProductSeasonData['category']) ?? null)
    .slice(0, limit)
    .map(p => ({
      productoId: 0,
      nombre: p.key,
      categoria: p.category,
      unidad: '',
      tipo: 'probar' as const,
      prioridad: 'alta' as const,
      tone: 'success' as const,
      titulo: p.key.charAt(0).toUpperCase() + p.key.slice(1) + ' en temporada',
      detalle: 'En plena temporada' + (p.origin ? ' (' + p.origin + ')' : '') + '.',
      base: ['Temporada principal', p.origin ? 'Origen: ' + p.origin : ''],
    }));
}
