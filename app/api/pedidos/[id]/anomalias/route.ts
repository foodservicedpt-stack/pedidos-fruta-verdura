export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, optionalAuth } from '@/lib/api-helpers';
import { detectAnomalies, countAnomalies } from '@/lib/ai/anomalies';
import { summarizeReception } from '@/lib/ai/summaries';
import { getClientIp, consumeAICredit } from '@/lib/ai/rate-limit';

/** Detecta anomalías entre pedido y recepción y genera un resumen legible. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await optionalAuth();
  void auth;

  try {
    const pedidoId = parseIntId(params?.id);
    if (pedidoId === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const recibidos: Record<number, number> = body?.recibidos ?? {};
    const extras: { productoId: number; nombre: string; cantidad: number; unidad: string }[] = body?.extras ?? [];
    const noRegistrados: { nombre: string; cantidad: number }[] = body?.noRegistrados ?? [];

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: { include: { producto: true } } },
    });
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const detalles = (pedido.detalles ?? []).map((d: any) => ({
      detalleId: d.id,
      productoId: d.productoId,
      nombre: d.producto?.nombre ?? 'Producto',
      unidad: d.producto?.unidad ?? '',
      cantidadSolicitada: d.cantidadSolicitada ?? 0,
      cantidadRecibida: recibidos[d.id] ?? d.cantidadRecibida ?? 0,
    }));

    const anomalias = detectAnomalies({ detalles, extras, noRegistrados });
    const resumen = await summarizeReception(anomalias, detalles.length);

    return NextResponse.json({ anomalias, resumen, counts: countAnomalies(anomalias) });
  } catch (error: any) {
    console.error('anomalias error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
