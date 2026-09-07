/**
 * Cliente de Google Gemini.
 *
 * UNIFICADO: antes la única integración vivía dentro de la ruta de OCR y se
 * llamaba con fetch duplicado. Ahora es la ÚNICA forma de hablar con Gemini
 * (OCR, recomendaciones, anomalías, insight, resúmenes).
 *
 * Seguridad/coste:
 *  - La API key SOLO se lee en el servidor y nunca se devuelve al cliente.
 *  - El timeout evita colgar la petición si Gemini no responde.
 *  - Cualquier fallo devuelve { ok:false, error } y NUNCA rompe la app.
 *  - No se inventan datos: si la respuesta no es JSON válido, se descarta.
 */
import type { GeminiResult } from './types';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface VisionPayload {
  mimeType: string;
  base64: string;
}

export interface GeminiCallOptions {
  prompt: string;
  /** Adjunto visual opcional (imagen o PDF en base64). */
  image?: VisionPayload | null;
  maxTokens?: number;
  temperature?: number;
}

interface GeminiRawResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

async function callGeminiRaw({ prompt, image, maxTokens = 2000, temperature = 0.2 }: GeminiCallOptions): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(`${GEMINI_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[gemini] HTTP error', res.status, text.slice(0, 300));
      throw new Error('Error del servicio de IA (' + res.status + ')');
    }

    const result = (await res.json()) as GeminiRawResponse;
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Respuesta vacía del servicio de IA.');
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/** Llama a Gemini pidiendo JSON y devuelve el dato tipado o un error amigable. */
export async function callGeminiJSON<T>(options: GeminiCallOptions): Promise<GeminiResult<T>> {
  try {
    const content = await callGeminiRaw(options);
    if (!content || !content.trim()) return { ok: false, error: 'No se pudo generar una respuesta.' };
    const trimmed = content.trim();
    const cleaned = trimmed.replace(/^```json?/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned) as T;
    return { ok: true, data: parsed };
  } catch (e) {
    console.error('[gemini] error:', (e as Error)?.message);
    return { ok: false, error: 'No se ha podido generar la recomendación ahora mismo.' };
  }
}

/** Convierte un File/Blob servidor a payload de visión en base64. */
export async function toVisionPayload(file: { type: string; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<VisionPayload> {
  const buf = await file.arrayBuffer();
  const isPdf = file.type === 'application/pdf';
  return { mimeType: isPdf ? 'application/pdf' : file.type || 'image/jpeg', base64: Buffer.from(buf).toString('base64') };
}
