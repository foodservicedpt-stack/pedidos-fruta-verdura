export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, optionalAuth } from '@/lib/api-helpers';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await optionalAuth();

  try {
    const pedidoId = parseIntId(params?.id);
    if (pedidoId === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    
    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: 'enviado' },
      include: {
        detalles: { include: { producto: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // Create HistoricoPedido records from the order details
    const fechaHistorico = pedido?.fechaEntrega ?? pedido?.fechaPedido ?? new Date();
    for (const det of (pedido?.detalles ?? [])) {
      if ((det?.cantidadSolicitada ?? 0) > 0) {
        try {
          await prisma.historicoPedido.upsert({
            where: {
              productoId_fecha: {
                productoId: det?.productoId,
                fecha: new Date(fechaHistorico),
              },
            },
            update: { cantidad: det?.cantidadSolicitada ?? 0 },
            create: {
              productoId: det?.productoId,
              fecha: new Date(fechaHistorico),
              cantidad: det?.cantidadSolicitada ?? 0,
            },
          });
        } catch (e: any) {
          console.error('Error creating historico:', e?.message);
        }
      }
    }

    // Try to send Teams notification
    try {
      const config = await prisma.configuracionTeams.findFirst({ where: { activo: true } });
      if (config?.webhookUrl) {
        const items = (pedido?.detalles ?? []).map((d: any) =>
          `- ${d?.producto?.nombre ?? 'Producto'}: ${d?.cantidadSolicitada ?? 0} ${d?.producto?.unidad ?? ''}`
        ).join('\n');

        const message = {
          '@type': 'MessageCard',
          themeColor: '4CAF50',
          summary: 'Nuevo pedido enviado',
          sections: [{
            activityTitle: `🥦 Nuevo Pedido #${pedido?.id}`,
            activitySubtitle: `Creado por ${pedido?.user?.name ?? 'Usuario'}`,
            facts: [
              { name: 'Tipo', value: pedido?.tipoPedido ?? 'Sin especificar' },
              { name: 'Fecha entrega', value: pedido?.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString('es-ES') : 'Sin fecha' },
              { name: 'Productos', value: `${(pedido?.detalles ?? []).length} items` },
            ],
            text: items,
          }],
        };

        await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
      }
    } catch (teamsError: any) {
      console.error('Teams notification error:', teamsError?.message);
    }

    return NextResponse.json(pedido);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error al enviar' }, { status: 500 });
  }
}
