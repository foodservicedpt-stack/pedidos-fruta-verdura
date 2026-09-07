export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const url = new URL(req.url);
    const estado = url.searchParams.get('estado');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');

    const where: any = {};
    if (estado) where.estado = estado;

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        detalles: {
          include: { producto: true },
          orderBy: { producto: { nombre: 'asc' } },
        },
      },
      orderBy: { fechaPedido: 'desc' },
      take: limit,
    });

    return NextResponse.json(pedidos ?? []);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { tipoPedido, fechaEntrega, notas, detalles, estado } = body ?? {};
    const userId = auth.user.id;

    if (!userId) return NextResponse.json({ error: 'Usuario no válido' }, { status: 400 });

    const pedido = await prisma.pedido.create({
      data: {
        tipoPedido: tipoPedido ?? null,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
        estado: estado ?? 'borrador',
        notas: notas ?? null,
        creadoPor: userId,
        detalles: {
          create: (detalles ?? []).filter((d: any) => d?.cantidadSolicitada > 0).map((d: any) => ({
            productoId: d?.productoId,
            cantidadSolicitada: d?.cantidadSolicitada ?? 0,
            comentario: d?.comentario ?? null,
          })),
        },
      },
      include: {
        detalles: { include: { producto: true } },
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(pedido);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error al crear pedido' }, { status: 500 });
  }
}
