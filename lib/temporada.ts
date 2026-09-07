/**
 * Compatibilidad: re-exporta la API antigua desde el nuevo motor de temporalidad.
 * Mantener este archivo evita romper importaciones existentes
 * (nuevo-pedido-client, productos-client) mientras se migra a lib/seasonality.
 */
export {
  getTemporadaInfo,
  getMesesTemporada,
  MESES_NOMBRES,
  getSeasonStatus,
  getInSeasonProducts,
  isInSeason,
} from '@/lib/seasonality/engine';

export type { SeasonStatus, ProductSeasonData, AvailabilityLevel } from '@/lib/seasonality/types';

export interface TemporadaInfo {
  estado: 'optima' | 'transicion' | 'fuera';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}
