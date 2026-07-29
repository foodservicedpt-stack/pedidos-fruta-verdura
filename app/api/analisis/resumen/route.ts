export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-helpers';

export async function GET() {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    // Consultas independientes en paralelo para reducir viajes a la base de datos
    const [totalProductos, totalPedidos, pedidosBorrador, totalHistorico, topProductos, historicos] = await Promise.all([
      prisma.producto.count({ where: { activo: true } }),
      prisma.pedido.count(),
      prisma.pedido.count({ where: { estado: 'borrador' } }),
      prisma.historicoPedido.count(),
      // Top products by frequency
      prisma.historicoPedido.groupBy({
        by: ['productoId'],
        _count: { cantidad: true },
        _avg: { cantidad: true },
        orderBy: { _count: { cantidad: 'desc' } },
        take: 10,
      }),
      // Monthly consumption source data
      prisma.historicoPedido.findMany({
        select: { fecha: true, cantidad: true, producto: { select: { categoria: true } } },
      }),
    ]);

    const productoIds = topProductos?.map((t: any) => t?.productoId) ?? [];
    const productoNames = await prisma.producto.findMany({
      where: { id: { in: productoIds } },
      select: { id: true, nombre: true, categoria: true },
    });

    const nameMap: Record<number, any> = {};
    for (const p of (productoNames ?? [])) {
      nameMap[p?.id] = p;
    }

    const topList = (topProductos ?? []).map((t: any) => ({
      productoId: t?.productoId,
      nombre: nameMap[t?.productoId]?.nombre ?? 'Desconocido',
      categoria: nameMap[t?.productoId]?.categoria ?? '',
      frecuencia: t?._count?.cantidad ?? 0,
      promedioKg: Math.round((t?._avg?.cantidad ?? 0) * 10) / 10,
    }));

    const monthlyData: Record<string, Record<string, number>> = {};
    for (const h of (historicos ?? [])) {
      const date = new Date(h?.fecha);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { Verduras: 0, Frutas: 0, Ensaladas: 0 };
      const cat = h?.producto?.categoria ?? 'Otros';
      monthlyData[key][cat] = (monthlyData[key][cat] ?? 0) + (h?.cantidad ?? 0);
    }

    const monthlyChart = Object.entries(monthlyData ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, data]: [string, any]) => ({
        mes,
        Verduras: Math.round(data?.Verduras ?? 0),
        Frutas: Math.round(data?.Frutas ?? 0),
        Ensaladas: Math.round(data?.Ensaladas ?? 0),
      }));

    return NextResponse.json({
      totalProductos,
      totalPedidos,
      pedidosBorrador,
      totalHistorico,
      topProductos: topList,
      consumoMensual: monthlyChart,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
