export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { optionalAuth } from '@/lib/api-helpers';
import { computeInsight } from '@/lib/ai/insights';
import { getSeasonStatus } from '@/lib/seasonality/engine';

/** Insights deterministas del histórico (dashboard + análisis). */
export async function GET(req: Request) {
  const auth = await optionalAuth();
  void auth;

  try {
    const url = new URL(req.url);
    const categoria = url.searchParams.get('categoria') ?? null;
    const productoIdRaw = url.searchParams.get('productoId');

    const where: any = { activo: true };
    if (categoria) where.categoria = categoria;
    if (productoIdRaw) where.id = parseInt(productoIdRaw);

    const productos = await prisma.producto.findMany({
      where,
      include: {
        historicos: { orderBy: { fecha: 'desc' }, take: 20, select: { fecha: true, cantidad: true } },
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

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error('insights error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
