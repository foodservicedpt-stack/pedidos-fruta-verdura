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
    const desde = url.searchParams.get('desde');
    const hasta = url.searchParams.get('hasta');

    const where: any = {};
    if (productoId) where.productoId = parseInt(productoId);
    if (categoria) where.producto = { categoria };
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }

    const historicos = await prisma.historicoPedido.findMany({
      where,
      include: { producto: { select: { nombre: true, categoria: true, unidad: true } } },
      orderBy: { fecha: 'desc' },
      take: 5000,
    });

    return NextResponse.json(historicos ?? []);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
