/**
 * Resúmenes legibles. La IA genera la frase; si falla, hay fallback determinista
 * para que la app NUNCA se rompa ni se quede en blanco.
 */
import type { Anomaly, ReceptionSummary } from './types';
import { callGeminiJSON } from './gemini';
import { buildReceptionSummaryPrompt } from './prompts';

export async function summarizeReception(anomalies: Anomaly[], totalProductos: number): Promise<ReceptionSummary> {
  const diff = anomalies.filter(a => a.tono === 'danger' || a.tono === 'warning').length;

  const deterministic: ReceptionSummary = {
    totalProductos,
    totalDiferencias: diff,
    resumen: diff === 0
      ? 'Todo llegó correctamente. Sin incidencias en la recepción.'
      : 'Esta recepción tiene ' + diff + ' incidencia' + (diff !== 1 ? 's' : '') + ' a revisar.',
  };

  if (anomalies.length > 0) {
    const ai = await callGeminiJSON<{ resumen: string }>({ prompt: buildReceptionSummaryPrompt(anomalies), maxTokens: 400, temperature: 0.2 });
    if (ai.ok && ai.data?.resumen) {
      return { ...deterministic, resumen: ai.data.resumen };
    }
  }

  return deterministic;
}
