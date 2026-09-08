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
  /** Mensaje por defecto cuando falla la llamada (contextual por caller). */
  defaultError?: string;
  /** Número de reintentos para errores transitorios (429/5xx/timeout). */
  retries?: number;
}

interface GeminiRawResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

async function callGeminiRaw(options: GeminiCallOptions): Promise<string> {
  const { prompt, image, maxTokens = 2000, temperature = 0.2, retries = 1 } = options;
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

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 700 * attempt));
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
        // Reintento en 429/5xx (transitorio); fallo definitivo en el resto.
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          lastError = new Error('Error del servicio de IA (' + res.status + ')');
          continue;
        }
        throw new Error('Error del servicio de IA (' + res.status + ')');
      }

      const result = (await res.json()) as GeminiRawResponse;
      const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        if (attempt < retries) { lastError = new Error('Respuesta vacía del servicio de IA.'); continue; }
        throw new Error('Respuesta vacía del servicio de IA.');
      }
      return content;
    } catch (e) {
      const err = e as Error;
      const transient = err?.name === 'AbortError' || /Error del servicio de IA/.test(err?.message || '');
      if (attempt < retries && (transient || /Respuesta vacía/.test(err?.message || ''))) {
        lastError = err;
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error('Error del servicio de IA');
}

/** Llama a Gemini pidiendo JSON y devuelve el dato tipado o un error amigable. */
export async function callGeminiJSON<T>(options: GeminiCallOptions): Promise<GeminiResult<T>> {
  try {
    const content = await callGeminiRaw(options);
    if (!content || !content.trim()) return { ok: false, error: 'No se pudo generar una respuesta.' };
    const trimmed = content.trim().replace(/^```json?/i, '').replace(/```\s*$/, '').trim();
    // Parseo tolerante: si el JSON envuelve texto extra, extraer la primera persona JSON.
    const parsed = tryParseJSON<T>(trimmed);
    if (parsed === null) return { ok: false, error: options.defaultError ?? 'No se ha podido generar la recomendación ahora mismo.' };
    return { ok: true, data: parsed };
  } catch (e) {
    console.error('[gemini] error:', (e as Error)?.message);
    return { ok: false, error: options.defaultError ?? 'No se ha podido generar la recomendación ahora mismo.' };
  }
}

/** Intenta JSON.parse directo; si falla, extrae la primera persona { ... } y la parsea. */
function tryParseJSON<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]) as T; } catch {}
  }
  return null;
}

/** Convierte un File/Blob servidor a payload de visión en base64. */
export async function toVisionPayload(file: { type: string; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<VisionPayload> {
  const buf = await file.arrayBuffer();
  const isPdf = file.type === 'application/pdf';
  return { mimeType: isPdf ? 'application/pdf' : file.type || 'image/jpeg', base64: Buffer.from(buf).toString('base64') };
}
