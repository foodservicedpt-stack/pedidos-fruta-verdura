export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, optionalAuth } from '@/lib/api-helpers';
import { callGeminiJSON, toVisionPayload } from '@/lib/ai/gemini';
import { buildOcrPrompt } from '@/lib/ai/prompts';
import { getClientIp, consumeAICredit } from '@/lib/ai/rate-limit';

/** Límite de tamaño de archivo subido (8 MB) para proteger el endpoint. */
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await optionalAuth();
  void auth; // la ruta es de acceso público; el coste lo limita el rate limiter

  try {
    // Protección básica frente a abuso: pocas llamadas por IP por minuto.
    if (!consumeAICredit(getClientIp(req), 20, 60_000)) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento y prueba de nuevo.' }, { status: 429 });
    }

    const pedidoId = parseIntId(params?.id);
    if (pedidoId === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: { include: { producto: true } } },
    });
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const allProducts = await prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, unidad: true, categoria: true },
    });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No se ha adjuntado ningún archivo' }, { status: 400 });

    // Validación de archivo: tipo y tamaño.
    const isImage = (file.type ?? '').startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Formato no soportado. Usa PDF o imagen (JPG, PNG).' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el tamaño máximo permitido (8 MB).' }, { status: 413 });
    }

    const orderProductList = (pedido.detalles ?? []).map((d: any) =>
      `  ID:${d.productoId} "${d.producto?.nombre}" (${d.producto?.unidad}) [pedido: ${d.cantidadSolicitada}]`
    ).join('\n');

    const orderProductIds = new Set((pedido.detalles ?? []).map((d: any) => d.productoId));
    const otherProducts = allProducts.filter(p => !orderProductIds.has(p.id));
    const otherProductList = otherProducts.map(p =>
      `  ID:${p.id} "${p.nombre}" (${p.unidad}) [${p.categoria}]`
    ).join('\n');

    const vision = await toVisionPayload(file as unknown as { type: string; arrayBuffer: () => Promise<ArrayBuffer> });

    const result = await callGeminiJSON<{
      productos?: { nombre_albaran?: string; producto_id?: number | null; cantidad?: number; tipo?: string }[];
      notas?: string | null;
    }>({
      prompt: buildOcrPrompt(orderProductList, otherProductList),
      image: vision,
      maxTokens: 3000,
      temperature: 0.1,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const parsed = result.data;
    const matches: Record<number, number> = {};
    const extras: { productoId: number; nombre: string; cantidad: number; unidad: string; categoria: string }[] = [];
    const unknowns: { nombre: string; cantidad: number }[] = [];

    const extractedProducts = parsed?.productos ?? [];
    const allProductMap = new Map(allProducts.map(p => [p.id, p]));

    for (const item of extractedProducts) {
      const cantidad = parseFloat(String(item?.cantidad ?? 0));
      if (isNaN(cantidad) || cantidad <= 0) continue;

      const tipo = item?.tipo ?? 'no_registrado';
      const productoId = item?.producto_id;

      if (tipo === 'no_registrado' || productoId == null) {
        unknowns.push({ nombre: item?.nombre_albaran ?? 'Desconocido', cantidad });
        continue;
      }

      const dbProduct = allProductMap.get(productoId);
      if (!dbProduct) {
        unknowns.push({ nombre: item?.nombre_albaran ?? 'Desconocido', cantidad });
        continue;
      }

      if (tipo === 'pedido' && orderProductIds.has(productoId)) {
        matches[productoId] = cantidad;
      } else if (!orderProductIds.has(productoId)) {
        extras.push({ productoId: dbProduct.id, nombre: dbProduct.nombre, cantidad, unidad: dbProduct.unidad ?? '', categoria: dbProduct.categoria ?? 'Otros' });
      } else {
        matches[productoId] = cantidad;
      }
    }

    return NextResponse.json({
      matches,
      extras,
      unknowns,
      totalExtracted: extractedProducts.length,
      totalMatched: Object.keys(matches).length,
      notas: parsed?.notas ?? null,
    });
  } catch (error: any) {
    console.error('OCR error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error al procesar el albarán' }, { status: 500 });
  }
}
