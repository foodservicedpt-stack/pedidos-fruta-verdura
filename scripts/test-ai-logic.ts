import { buildRecommendations, findSeasonAlternatives, buildSeasonSpotlight } from '../lib/ai/recommendations';
import { detectAnomalies, countAnomalies } from '../lib/ai/anomalies';
import { computeInsight } from '../lib/ai/insights';
import { getSeasonStatus } from '../lib/seasonality/engine';

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗ FAIL:', msg); } }

// Helper: builds ProductInsight-like input
function insight(productoId: number, nombre: string, categoria: string, unidad: string, historicos: number[], month?: number) {
  const temporada = getSeasonStatus(nombre, null, month);
  return computeInsight({
    productoId, nombre, categoria, unidad,
    historicos: historicos.map((cantidad, i) => ({ fecha: new Date(2024, i % 12, 1), cantidad })),
    temporada,
  });
}

console.log('== 1. Fresa fuera de temporada (sept) -> atencion ==');
const recs = buildRecommendations([insight(1, 'Fresa', 'Frutas', 'Kg', [20, 20, 20])], {});
assert(recs.some(r => r.nombre === 'Fresa' && r.tipo === 'atencion'), 'fresa sep -> atencion');
const fresaRec = recs.find(r => r.nombre === 'Fresa');
assert(Boolean(fresaRec && fresaRec.tone === 'warning'), 'fresa sep -> tono warning');

console.log('== 2. Tomate en temporada y sin pedido -> probar ==');
const recs2 = buildRecommendations([insight(2, 'Tomate', 'Verduras', 'Kg', [20, 20, 20], 7)], {});
assert(recs2.some(r => r.nombre === 'Tomate' && r.tipo === 'probar'), 'tomate jul -> probar');

console.log('== 3. Pedido por encima de media -> reducir/atencion ==');
const orden = { 2: 40 };
const recs3 = buildRecommendations([insight(2, 'Tomate', 'Verduras', 'Kg', [20, 20, 20], 7)], orden);
assert(recs3.some(r => r.nombre === 'Tomate' && r.tipo === 'reducir'), 'tomate 40 vs media 20 -> reducir');

console.log('== 4. Alternativas de temporada para un fuera-temporada ==');
const alts = findSeasonAlternatives('Fresa', 'Frutas', 4);
assert(Array.isArray(alts) && alts.length > 0, 'fresa sep -> alternativas en temporada (' + alts.length + ')');

console.log('== 5. Spot estacional no vacio en julio ==');
const spot = buildSeasonSpotlight('Frutas');
assert(spot.length > 0, 'spot julio frutas no vacio');

console.log('== 6. Anomalias: diferencia, no llego, extra, no registrado ==');
const anoms = detectAnomalies({
  detalles: [
    { detalleId: 1, productoId: 10, nombre: 'Tomate', unidad: 'Kg', cantidadSolicitada: 20, cantidadRecibida: 18 },
    { detalleId: 2, productoId: 11, nombre: 'Pepino', unidad: 'Kg', cantidadSolicitada: 5, cantidadRecibida: 0 },
    { detalleId: 3, productoId: 12, nombre: 'Cebolla', unidad: 'Kg', cantidadSolicitada: 10, cantidadRecibida: 10 },
  ],
  extras: [{ productoId: 99, nombre: 'Pimiento', cantidad: 3, unidad: 'Kg' }],
  noRegistrados: [{ nombre: 'Kale XXL', cantidad: 2 }],
});
assert(anoms.some(a => a.tipo === 'diferencia'), 'diferencia detectada');
assert(anoms.some(a => a.tipo === 'no_llego'), 'no_llego detectada');
assert(anoms.some(a => a.tipo === 'extra'), 'extra detectada');
assert(anoms.some(a => a.tipo === 'no_registrado'), 'no_registrado detectada');
assert(!anoms.some(a => a.detalle?.includes?.('Cebolla') ?? false), 'cebolla sin incidencia (ok)');
const cnt = countAnomalies(anoms);
assert(cnt.total === 4, 'total anomalias = 4 (got ' + cnt.total + ')');

console.log('== 7. Entrada grande (>50% mas) ==');
const big = detectAnomalies({ detalles: [{ detalleId: 9, productoId: 1, nombre: 'Aguacate', unidad: 'Ud', cantidadSolicitada: 10, cantidadRecibida: 20 }] });
assert(big.some(a => a.tipo === 'entrada_grande'), 'entrada +100% -> entrada_grande');

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
