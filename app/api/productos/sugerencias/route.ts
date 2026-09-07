export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-helpers';

export async function GET() {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    // Calculate date 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Get average from last 3 months only
    const historicos = await prisma.historicoPedido.groupBy({
      by: ['productoId'],
      where: { fecha: { gte: threeMonthsAgo } },
      _avg: { cantidad: true },
      _count: { cantidad: true },
    });

    // Get last 5 orders for each product
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: {
        historicos: {
          orderBy: { fecha: 'desc' },
          take: 5,
          select: { fecha: true, cantidad: true },
        },
      },
    });

    const avgMap: Record<number, { avg: number; count: number }> = {};
    for (const h of (historicos ?? [])) {
      avgMap[h?.productoId] = {
        avg: Math.round((h?._avg?.cantidad ?? 0) * 10) / 10,
        count: h?._count?.cantidad ?? 0,
      };
    }

    const sugerencias = (productos ?? []).map((p: any) => ({
      productoId: p?.id,
      promedio: avgMap[p?.id]?.avg ?? 0,
      totalPedidos: avgMap[p?.id]?.count ?? 0,
      ultimaCantidad: p?.historicos?.[0]?.cantidad ?? null,
      ultimaFecha: p?.historicos?.[0]?.fecha ?? null,
      ultimosPedidos: (p?.historicos ?? []).map((h: any) => ({
        fecha: h?.fecha,
        cantidad: h?.cantidad,
      })),
    }));

    return NextResponse.json(sugerencias);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
