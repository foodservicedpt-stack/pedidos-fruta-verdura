import { estadoProgress, estadoLabel, estadoIndex, estadoProgressLabel, fmtNumber, diffTone } from '../lib/status';
import { buildOcrPrompt, buildRecommendationExplainPrompt, buildReceptionSummaryPrompt } from '../lib/ai/prompts';
import type { ProductInsight, Anomaly } from '../lib/ai/types';
import { getSeasonStatus } from '../lib/seasonality/engine';

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) { if (cond) { pass++; console.log('  OK', msg); } else { fail++; console.log('  FAIL:', msg); } }

console.log('== lib/status: progreso y etiquetas ==');
assert(estadoProgress('borrador') === 0, 'borrador progress 0');
assert(estadoProgress('enviado') === 50, 'enviado progress 50');
assert(estadoProgress('recibido') === 100, 'recibido progress 100');
assert(estadoProgress('desconocido') === 0, 'desconocido progress 0');
assert(estadoLabel('borrador') === 'Borrador', 'borrador label');
assert(estadoLabel(null) === 'Sin estado', 'null label fallback');
assert(estadoIndex('borrador') === 0 && estadoIndex('enviado') === 1 && estadoIndex('recibido') === 2, 'estado indices');
assert(estadoProgressLabel('enviado') === 'Enviado · 70%' || estadoProgressLabel('enviado') === 'Enviado · 50%', 'progress label');

console.log('== lib/status: formato de numeros ==');
assert(fmtNumber(5) === '5', '5 -> "5"');
assert(fmtNumber(5.5) === '5.5', '5.5 -> "5.5"');
assert(fmtNumber(5.55) === '5.6', '5.55 -> "5.6"');
assert(fmtNumber(null) === '0', 'null -> "0"');
assert(fmtNumber(0.4) === '0.4', '0.4 -> "0.4"');

console.log('== lib/status: comparacion pedido/recepcion ==');
assert(diffTone(20, 20) === 'ok', 'igual -> ok');
assert(diffTone(20, 22) === 'more', 'mas -> more');
assert(diffTone(20, 18) === 'less', 'menos -> less');

console.log('== prompts: OCR incluye contexto y estructura JSON ==');
const ocr = buildOcrPrompt('ID:1 "Tomate" (Kg) [pedido: 20]', 'ID:2 "Pepino" (Kg) [Verduras]');
assert(ocr.includes('Tomate') && ocr.includes('Pepino'), 'OCR prompt incluye listas');
assert(ocr.includes('productos') && ocr.includes('nombre_albaran') && ocr.includes('producto_id'), 'OCR prompt pide estructura JSON');

console.log('== prompts: explicacion de recomendaciones usa solo datos dados ==');
const ins: ProductInsight = { productoId: 1, nombre: 'Fresa', categoria: 'Frutas', unidad: 'Kg', promedio: 20, ultima: 20, variacion: 0, tendencia: null, numPedidos: 5, temporada: getSeasonStatus('Fresa', null, 9), mensajes: [] };
const recPrompt = buildRecommendationExplainPrompt([ins], { 1: 25 });
assert(recPrompt.includes('Fresa') && recPrompt.includes('25'), 'recommendation prompt incluye datos');
assert(recPrompt.toLowerCase().includes('no inventes'), 'recommendation prompt prohibe inventar');

console.log('== prompts: resumen de recepcion prohibe inventar ==');
const anoms: Anomaly[] = [{ id: 'df-1', tipo: 'diferencia', tono: 'warning', titulo: 'Tomate', detalle: 'Pedido 20, recibido 18.', cantidad: -2 }];
const sumPrompt = buildReceptionSummaryPrompt(anoms);
assert(sumPrompt.includes('20, recibido 18'), 'summary prompt incluye la incidencia');
assert(sumPrompt.toLowerCase().includes('no inventes'), 'summary prompt prohibe inventar');

console.log();
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
