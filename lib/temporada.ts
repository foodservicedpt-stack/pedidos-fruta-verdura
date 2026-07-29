// Datos de temporada para frutas y verduras en España
// Fuente: calendario de temporada habitual del mercado español

export interface TemporadaInfo {
  estado: 'optima' | 'transicion' | 'fuera';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Meses de temporada por producto (nombre en minúsculas como clave)
// [mesInicio, mesFin] donde 1=enero, 12=diciembre
// Solo frutas - datos de temporada óptima en España
// Fuente: Ministerio de Agricultura / OCU
const TEMPORADAS: Record<string, [number, number]> = {
  'naranja': [10, 5],
  'mandarina': [10, 3],
  'limón': [11, 5],
  'plátano': [1, 12],
  'fresón': [2, 5],
  'fresa': [2, 5],
  'níspero': [4, 5],
  'albaricoque': [5, 8],
  'cereza': [5, 7],
  'melocotón': [5, 9],
  'nectarina': [5, 9],
  'sandía': [6, 8],
  'melón': [6, 9],
  'higo': [7, 9],
  'ciruela': [6, 9],
  'manzana': [8, 1],
  'pera': [7, 11],
  'uva': [9, 12],
  'caqui': [10, 1],
  'persimon': [10, 1],
  'chirimoya': [10, 1],
  'granada': [9, 11],
  'kiwi': [10, 3],
  'aguacate': [11, 5],
};

export function getTemporadaInfo(nombreProducto: string, mesInicioCustom?: number | null, mesFinCustom?: number | null): TemporadaInfo {
  const mesActual = new Date().getMonth() + 1; // 1-12

  // Usar datos custom si los tiene, si no buscar en la tabla
  let mesInicio = mesInicioCustom;
  let mesFin = mesFinCustom;

  if (mesInicio == null || mesFin == null) {
    const temporada = findTemporada(nombreProducto);
    if (temporada) {
      mesInicio = temporada[0];
      mesFin = temporada[1];
    }
  }

  if (mesInicio == null || mesFin == null) {
    // Sin datos de temporada -> siempre disponible
    return {
      estado: 'optima',
      label: 'Disponible',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    };
  }

  // Calcular si estamos en temporada, transición o fuera
  const enTemporada = estaEnRango(mesActual, mesInicio, mesFin);
  const enTransicion = estaEnRango(mesActual, mesInicio - 1, mesInicio) || estaEnRango(mesActual, mesFin, mesFin + 1);

  if (enTemporada) {
    return {
      estado: 'optima',
      label: 'En temporada',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
    };
  }

  if (enTransicion) {
    return {
      estado: 'transicion',
      label: 'Inicio/fin temporada',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
    };
  }

  return {
    estado: 'fuera',
    label: 'Fuera de temporada',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  };
}

// Busca temporada por nombre exacto o parcial
// "Fresa extra" -> match "fresa", "Melocotón de Calanda" -> match "melocotón"
function findTemporada(nombre: string): [number, number] | null {
  const key = nombre.toLowerCase().trim();
  // Exact match first
  if (TEMPORADAS[key]) return TEMPORADAS[key];
  // Check if any TEMPORADA key is contained in the product name
  // Sort by longest key first to prefer more specific matches
  const sortedKeys = Object.keys(TEMPORADAS).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (key.includes(k)) return TEMPORADAS[k];
  }
  return null;
}

function estaEnRango(mes: number, inicio: number, fin: number): boolean {
  // Normalizar meses (0 -> 12, 13 -> 1)
  const i = ((inicio - 1 + 12) % 12) + 1;
  const f = ((fin - 1 + 12) % 12) + 1;

  if (i <= f) {
    return mes >= i && mes <= f;
  } else {
    // Rango cruza fin de año (ej: Oct-Mar = 10-3)
    return mes >= i || mes <= f;
  }
}

export function getMesesTemporada(nombreProducto: string): { mesInicio: number | null; mesFin: number | null } {
  const temporada = findTemporada(nombreProducto);
  if (temporada) {
    return { mesInicio: temporada[0], mesFin: temporada[1] };
  }
  return { mesInicio: null, mesFin: null };
}

export const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
