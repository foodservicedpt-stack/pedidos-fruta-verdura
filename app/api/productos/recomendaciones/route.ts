export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { optionalAuth } from '@/lib/api-helpers';
import { buildRecommendations, buildSeasonSpotlight } from '@/lib/ai/recommendations';
import { computeInsight } from '@/lib/ai/insights';
import { getSeasonStatus } from '@/lib/seasonality/engine';

/** Recomendaciones contextuales para el catálogo (pedido nuevo / dashboard). */
export async function GET(req: Request) {
  const auth = await optionalAuth();
  void auth;

  try {
    const url = new URL(req.url);
    const categoria = url.searchParams.get('categoria') ?? null;

    const productos = await prisma.producto.findMany({
      where: { activo: true, ...(categoria ? { categoria } : {}) },
      include: {
        historicos: {
          orderBy: { fecha: 'desc' },
          take: 12,
          select: { fecha: true, cantidad: true },
        },
      },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });

    const insights = (productos ?? []).map((p: any) =>
      computeInsight({
        productoId: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        unidad: p.unidad,
        historicos: (p.historicos ?? []).map((h: any) => ({ fecha: new Date(h.fecha), cantidad: h.cantidad })).reverse(),
        temporada: getSeasonStatus(p.nombre, { mesInicio: p.mesInicioTemp, mesFin: p.mesFinTemp }),
      })
    );

    const recomendaciones = buildRecommendations(insights);
    const spotlight = buildSeasonSpotlight(categoria ?? undefined);

    return NextResponse.json({ recomendaciones, spotlight, insights });
  } catch (error: any) {
    console.error('recomendaciones error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
