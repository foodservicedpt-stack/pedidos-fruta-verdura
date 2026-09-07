export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, requireAuth } from '@/lib/api-helpers';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  const id = parseIntId(params?.id);
  if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        detalles: {
          include: { producto: true },
          orderBy: { producto: { nombre: 'asc' } },
        },
      },
    });
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    return NextResponse.json(pedido);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { estado, detalles, notas, tipoPedido, fechaEntrega, extrasAlbaran } = body ?? {};
    const pedidoId = parseIntId(params?.id);
    if (pedidoId === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const updateData: any = {};
    if (estado) updateData.estado = estado;
    if (notas !== undefined) updateData.notas = notas;
    if (tipoPedido !== undefined) updateData.tipoPedido = tipoPedido;
    if (fechaEntrega !== undefined) updateData.fechaEntrega = fechaEntrega ? new Date(fechaEntrega) : null;
    if (extrasAlbaran !== undefined) updateData.extrasAlbaran = extrasAlbaran;

    if (detalles) {
      // Delete existing and recreate
      await prisma.detallePedido.deleteMany({ where: { pedidoId } });
      await prisma.detallePedido.createMany({
        data: (detalles ?? []).filter((d: any) => d?.cantidadSolicitada > 0).map((d: any) => ({
          pedidoId,
          productoId: d?.productoId,
          cantidadSolicitada: d?.cantidadSolicitada ?? 0,
          cantidadRecibida: d?.cantidadRecibida ?? null,
          comentario: d?.comentario ?? null,
        })),
      });
    }

    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: updateData,
      include: {
        detalles: { include: { producto: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // Update HistoricoPedido when receiving or editing a sent order
    if (estado === 'recibido' || (detalles && (pedido?.estado === 'enviado' || pedido?.estado === 'recibido'))) {
      const fechaHistorico = pedido?.fechaEntrega ?? pedido?.fechaPedido ?? new Date();
      for (const det of (pedido?.detalles ?? [])) {
        const cantidad = det?.cantidadRecibida ?? det?.cantidadSolicitada ?? 0;
        if (cantidad > 0) {
          try {
            await prisma.historicoPedido.upsert({
              where: {
                productoId_fecha: {
                  productoId: det?.productoId,
                  fecha: new Date(fechaHistorico),
                },
              },
              update: { cantidad },
              create: {
                productoId: det?.productoId,
                fecha: new Date(fechaHistorico),
                cantidad,
              },
            });
          } catch (e: any) {
            console.error('Error updating historico:', e?.message);
          }
        }
      }
    }

    return NextResponse.json(pedido);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const pedidoId = parseIntId(params?.id);
    if (pedidoId === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    // If order was sent/received, clean up HistoricoPedido records
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: true },
    });
    if (pedido && (pedido.estado === 'enviado' || pedido.estado === 'recibido')) {
      const fechaHistorico = pedido?.fechaEntrega ?? pedido?.fechaPedido;
      if (fechaHistorico) {
        for (const det of (pedido?.detalles ?? [])) {
          try {
            await prisma.historicoPedido.deleteMany({
              where: {
                productoId: det?.productoId,
                fecha: new Date(fechaHistorico),
              },
            });
          } catch (e: any) {
            console.error('Error cleaning historico:', e?.message);
          }
        }
      }
    }

    await prisma.pedido.delete({ where: { id: pedidoId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error al eliminar' }, { status: 500 });
  }
}
