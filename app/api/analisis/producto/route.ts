export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const url = new URL(req.url);
    const productoId = url.searchParams.get('productoId');
    const categoria = url.searchParams.get('categoria');

    if (productoId) {
      // Single product trend
      const historicos = await prisma.historicoPedido.findMany({
        where: { productoId: parseInt(productoId) },
        orderBy: { fecha: 'asc' },
        select: { fecha: true, cantidad: true },
      });

      // Group by week
      const weeklyData: Record<string, { total: number; count: number }> = {};
      for (const h of (historicos ?? [])) {
        const d = new Date(h.fecha);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay() + 1);
        const key = weekStart.toISOString().split('T')[0];
        if (!weeklyData[key]) weeklyData[key] = { total: 0, count: 0 };
        weeklyData[key].total += h.cantidad ?? 0;
        weeklyData[key].count += 1;
      }

      const trend = Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([semana, data]) => ({
          semana,
          cantidad: Math.round(data.total * 10) / 10,
          pedidos: data.count,
        }));

      const totalCantidad = historicos.reduce((sum, h) => sum + (h.cantidad ?? 0), 0);
      const promedio = historicos.length > 0 ? Math.round((totalCantidad / historicos.length) * 10) / 10 : 0;

      return NextResponse.json({ trend, promedio, totalRegistros: historicos.length, totalCantidad: Math.round(totalCantidad * 10) / 10 });
    }

    // All products summary for listing
    const where: any = {};
    if (categoria) where.producto = { categoria };

    const productos = await prisma.producto.findMany({
      where: { activo: true, ...(categoria ? { categoria } : {}) },
      select: { id: true, nombre: true, categoria: true, unidad: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });

    // Get aggregated stats for each product
    const stats = await prisma.historicoPedido.groupBy({
      by: ['productoId'],
      _avg: { cantidad: true },
      _count: { cantidad: true },
      _sum: { cantidad: true },
      _max: { fecha: true },
      _min: { fecha: true },
    });

    const statsMap: Record<number, any> = {};
    for (const s of (stats ?? [])) {
      statsMap[s.productoId] = {
        promedio: Math.round((s._avg?.cantidad ?? 0) * 10) / 10,
        totalPedidos: s._count?.cantidad ?? 0,
        totalCantidad: Math.round((s._sum?.cantidad ?? 0) * 10) / 10,
        ultimaFecha: s._max?.fecha,
        primeraFecha: s._min?.fecha,
      };
    }

    const result = productos.map(p => ({
      ...p,
      stats: statsMap[p.id] ?? { promedio: 0, totalPedidos: 0, totalCantidad: 0, ultimaFecha: null, primeraFecha: null },
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
