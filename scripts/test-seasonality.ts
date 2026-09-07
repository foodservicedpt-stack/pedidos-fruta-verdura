import { getSeasonStatus, getInSeasonProducts, getMesesTemporada, isInSeason } from '../lib/seasonality/engine';

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; console.log('  ✓', msg); }
  else { fail++; console.log('  ✗ FAIL:', msg); }
}

console.log('== Temporada: fresa en feb (debe ser optima) ==');
const fresaFeb = getSeasonStatus('Fresa extra', null, 2);
assert(fresaFeb.state === 'optima', 'fresa feb = optima (got ' + fresaFeb.state + ')');

console.log('== Temporada: fresa en sep (debe ser fuera) ==');
const fresaSep = getSeasonStatus('Fresa', null, 9);
assert(fresaSep.state === 'fuera', 'fresa sep = fuera (got ' + fresaSep.state + ')');

console.log('== Rango que cruza año: naranja en dic (optima) ==');
const naranjaDic = getSeasonStatus('Naranja', null, 12);
assert(naranjaDic.state === 'optima', 'naranja dic = optima (got ' + naranjaDic.state + ')');

console.log('== Naranja en jun (fuera) ==');
const naranjaJun = getSeasonStatus('Naranja', null, 6);
assert(naranjaJun.state === 'fuera', 'naranja jun = fuera (got ' + naranjaJun.state + ')');

console.log('== Solo frutas (optima todo el ano): platano ==');
assert(isInSeason('Plátano', 7) === true, 'platano jul en temporada');

console.log('== Producto sin datos -> Disponible, sin alucinar ==');
const sinDatos = getSeasonStatus('Pepinillo de la abuela', null, 4);
assert(sinDatos.state === 'optima' && sinDatos.availability === 'desconocida', 'sin datos -> Disponible/desconocida (got ' + sinDatos.state + '/' + sinDatos.availability + ')');

console.log('== Matching por nombre comercial ==');
const romana = getSeasonStatus('Lechuga romana', null, 6);
assert(romana.state === 'optima', 'lechuga romana jun optima (got ' + romana.state + ')');

console.log('== Rango custom de la BD gana al calendario ==');
const custom = getSeasonStatus('Cereza', { mesInicio: 1, mesFin: 12 }, 3);
assert(custom.state === 'optima', 'cereza custom todo-el-ano -> optima (got ' + custom.state + ')');

console.log('== In-season products (sin categoria) no vacio en enero ==');
const enEnero = getInSeasonProducts(null, 1);
assert(enEnero.length > 8, 'enero tiene suficientes productos en temporada (' + enEnero.length + ')');

console.log('== In-season por categoria ==');
const frutasIn = getInSeasonProducts('Frutas', 7);
assert(frutasIn.some(p => p.key === 'melocotón'), 'julio incluye melocotón en frutas');

console.log('== getMesesTemporada ==');
const meses = getMesesTemporada('Tomate');
assert(meses.mesInicio === 4 && meses.mesFin === 10, 'tomate meses 4-10 (got ' + meses.mesInicio + '-' + meses.mesFin + ')');

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
