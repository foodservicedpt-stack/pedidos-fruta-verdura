/**
 * Constructores de prompts para Gemini.
 *
 * REGLA ANTI-ALUCINACIÓN: todo prompt entrega el contexto REAL (temporada,
 * histórico, pedido/recepción) y pide explícitamente remitirse a ÉL. Si no hay
 * datos suficientes, la respuesta debe ser "No tengo suficiente información".
 */
import type { ProductInsight } from './types';
import type { Anomaly } from './types';

/** Prompt de OCR de albaranes (heredado de la ruta original). */
export function buildOcrPrompt(orderProductList: string, otherProductList: string): string {
  return `Eres un asistente experto en lectura de albaranes de proveedores de fruta y verdura para hostelería.

Analiza este albarán y extrae TODOS los productos y cantidades.

IMPORTANTE: Los proveedores usan nombres comerciales que pueden diferir de los nombres registrados en nuestro sistema. Debes hacer coincidir cada producto del albarán con el producto más probable de nuestro catálogo. Ejemplos:
- "Patata lavada" → "Patata blanca"
- "Tomate daniela" → "Tomate"
- "Lechuga romana" → "Lechuga" (el más cercano)
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
    { "nombre_albaran": "Nombre tal como aparece", "producto_id": 123, "cantidad": 5.0, "tipo": "pedido" }
  ],
  "notas": "Observaciones del albarán"
}

Donde "tipo" puede ser:
- "pedido" = el producto estaba en el pedido
- "extra" = el producto está registrado pero NO estaba en este pedido
- "no_registrado" = el producto NO está en ninguna lista del sistema

Para "no_registrado", pon producto_id: null.`;
}

/** Prompt para una explicación breve de recomendaciones (solo interpreta datos dados). */
export function buildRecommendationExplainPrompt(insights: ProductInsight[], currentOrder: Record<number, number>): string {
  const items = insights.map(i => {
    const cur = currentOrder[i.productoId] ?? null;
    return `- ${i.nombre} (${i.categoria}, ${i.unidad}): media=${i.promedio}, últimos pedidos=${i.numPedidos}, tendencia=${i.tendencia ?? 'sin datos'}, temporada=${i.temporada.state} (${i.temporada.monthsLabel}), pedido actual=${cur}`;
  }).join('\n');
  return `Eres un copiloto operativo de una cocina/hostelería. A partir de los DATOS REALES que te doy, explica en 1-2 frases qué está pasando y qué conviene hacer.

DATOS:
${items}

REGLAS:
- Usa SOLO estos datos. No inventes precios, porcentajes ni temporadas.
- Si no hay datos suficientes para un producto, di "No tengo suficiente información".
- No bloquees ni prohíbas comprar nada.

Responde SOLO con JSON:
{ "explicaciones": [ { "productoId": 1, "explicacion": "frase corta" } ] }`;
}

/** Prompt para el resumen de una recepción (solo sobre anomalías reales). */
export function buildReceptionSummaryPrompt(anomalies: Anomaly[]): string {
  const lines = anomalies.map(a => `- [${a.tono}] ${a.titulo}: ${a.detalle}`).join('\n');
  return `Resume en una frase natural la recepción de un pedido de fruta y verdura.

INCIDENCIAS DETECTADAS (solo datos reales):
${lines || '- Sin incidencias, todo correcto.'}

Reglas: usa SOLO estas incidencias. No inventes productos ni cantidades. Si no hay incidencias, di que todo llegó correctamente.

Responde SOLO con JSON:
{ "resumen": "frase" }`;
}
