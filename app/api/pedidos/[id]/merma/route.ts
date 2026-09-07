export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, requireAuth } from '@/lib/api-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const pedidoId = parseIntId(params.id);
    if (pedidoId === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const body = await request.json();
    const { mermas } = body; // Record<detalleId, mermaValue>

    // Verify the order exists and is 'recibido'
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: true },
    });

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (pedido.estado !== 'recibido') return NextResponse.json({ error: 'Solo se puede registrar merma en pedidos recibidos' }, { status: 400 });

    // Update merma for each detail
    const updates = [];
    for (const detalle of pedido.detalles) {
      const mermaValue = mermas?.[detalle.id] ?? null;
      updates.push(
        prisma.detallePedido.update({
          where: { id: detalle.id },
          data: { merma: mermaValue && mermaValue > 0 ? mermaValue : null },
        })
      );
    }

    await Promise.all(updates);

    // Return updated order
    const updatedPedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        user: { select: { name: true, email: true } },
        detalles: {
          include: { producto: true },
          orderBy: { producto: { nombre: 'asc' } },
        },
      },
    });

    return NextResponse.json(updatedPedido);
  } catch (error: any) {
    console.error('Error saving merma:', error);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
