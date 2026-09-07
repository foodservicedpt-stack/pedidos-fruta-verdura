export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, requireAuth } from '@/lib/api-helpers';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const pedidoId = parseIntId(params?.id);
    if (pedidoId === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        detalles: {
          include: { producto: true },
        },
      },
    });

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    // Get ALL active products from DB
    const allProducts = await prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, unidad: true, categoria: true },
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No se ha adjuntado ningún archivo' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Formato no soportado. Usa PDF o imagen (JPG, PNG).' }, { status: 400 });
    }

    // Build the order product list
    const orderProductList = (pedido.detalles ?? []).map((d: any) =>
      `  ID:${d.productoId} "${d.producto?.nombre}" (${d.producto?.unidad}) [pedido: ${d.cantidadSolicitada}]`
    ).join('\n');

    // Build the FULL product catalog
    const orderProductIds = new Set((pedido.detalles ?? []).map((d: any) => d.productoId));
    const otherProducts = allProducts.filter(p => !orderProductIds.has(p.id));
    const otherProductList = otherProducts.map(p =>
      `  ID:${p.id} "${p.nombre}" (${p.unidad}) [${p.categoria}]`
    ).join('\n');

    const promptText = `Eres un asistente experto en lectura de albaranes de proveedores de fruta y verdura para hostelería.

Analiza este albarán y extrae TODOS los productos y cantidades.

IMPORTANTE: Los proveedores usan nombres comerciales que pueden diferir de los nombres registrados en nuestro sistema. Debes hacer coincidir cada producto del albarán con el producto más probable de nuestro catálogo. Ejemplos:
- "Patata lavada" → "Patata blanca" (es el mismo producto)
- "Papayón estándar" → "Papaya" (variante del mismo producto)
- "Tomate daniela" → "Tomate" (variante)
- "Lechuga romana" → "Lechuga romana" o "Lechuga" (el más cercano)
- "Fresa extra" → "Fresa" o "Fresón"

USA TU CONOCIMIENTO del sector para hacer las equivalencias.

=== PRODUCTOS DEL PEDIDO (prioridad alta de matching) ===
${orderProductList}

=== OTROS PRODUCTOS REGISTRADOS EN NUESTRO SISTEMA ===
${otherProductList}

Para cada producto del albarán:
1. Primero intenta encontrarlo entre los PRODUCTOS DEL PEDIDO
2. Si no está en el pedido, búscalo en OTROS PRODUCTOS REGISTRADOS
3. Solo si NO encuentras ninguna coincidencia razonable, márcalo como "no_registrado"

Responde SOLO con JSON válido (sin markdown), con esta estructura:
{
  "productos": [
    {
      "nombre_albaran": "Nombre tal como aparece en el albarán",
      "producto_id": 123,
      "cantidad": 5.0,
      "tipo": "pedido"
    }
  ],
  "notas": "Observaciones del albarán"
}

Donde "tipo" puede ser:
- "pedido" = el producto estaba en el pedido
- "extra" = el producto está registrado pero NO estaba en este pedido
- "no_registrado" = el producto NO está en ninguna lista del sistema

Para "no_registrado", pon producto_id: null.
Los números pueden estar escritos a mano. Las unidades pueden ser Kg, Ud, Bolsa, Bandeja, Manojo.`;

    // --- Google Gemini API (vision) ---
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return NextResponse.json({ error: 'API de Gemini no configurada. Añade GEMINI_API_KEY en la configuración.' }, { status: 500 });

    // Gemini supports images natively; for PDFs we send as inline_data with application/pdf mime
    const mimeType = isImage ? file.type : 'application/pdf';

    const geminiBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: base64String } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 3000,
      },
    };

    const geminiModel = 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return NextResponse.json({ error: 'Error al procesar el documento con IA (Gemini)' }, { status: 500 });
    }

    const result = await response.json();
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return NextResponse.json({ error: 'No se pudo extraer información del documento' }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e: any) {
      console.error('JSON parse error:', content);
      return NextResponse.json({ error: 'Error al interpretar la respuesta de IA' }, { status: 500 });
    }

    // Process LLM results
    const matches: Record<number, number> = {}; // productoId -> cantidad (products in order)
    const extras: { productoId: number; nombre: string; cantidad: number; unidad: string; categoria: string }[] = [];
    const unknowns: { nombre: string; cantidad: number }[] = [];

    const extractedProducts = parsed?.productos ?? [];
    const allProductMap = new Map(allProducts.map(p => [p.id, p]));

    for (const item of extractedProducts) {
      const cantidad = parseFloat(item?.cantidad ?? 0);
      if (isNaN(cantidad) || cantidad <= 0) continue;

      const tipo = item?.tipo ?? 'no_registrado';
      const productoId = item?.producto_id;

      if (tipo === 'no_registrado' || productoId == null) {
        unknowns.push({
          nombre: item?.nombre_albaran ?? 'Desconocido',
          cantidad,
        });
        continue;
      }

      // Verify the product actually exists in our DB
      const dbProduct = allProductMap.get(productoId);
      if (!dbProduct) {
        unknowns.push({
          nombre: item?.nombre_albaran ?? 'Desconocido',
          cantidad,
        });
        continue;
      }

      if (tipo === 'pedido' && orderProductIds.has(productoId)) {
        matches[productoId] = cantidad;
      } else if (tipo === 'extra' || !orderProductIds.has(productoId)) {
        // Product exists in DB but not in this order
        if (!orderProductIds.has(productoId)) {
          extras.push({
            productoId: dbProduct.id,
            nombre: dbProduct.nombre,
            cantidad,
            unidad: dbProduct.unidad ?? '',
            categoria: dbProduct.categoria ?? 'Otros',
          });
        } else {
          // LLM said extra but it's actually in the order
          matches[productoId] = cantidad;
        }
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