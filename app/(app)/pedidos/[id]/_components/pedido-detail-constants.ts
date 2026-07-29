import { Leaf, Apple, Salad } from 'lucide-react';
import { TIPO_PEDIDO_LABELS } from '@/lib/constants';

/** Etiquetas y colores de estado de un pedido. */
export const estadoLabel: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  recibido: 'Recibido',
};

export const estadoColor: Record<string, string> = {
  borrador: 'bg-amber-100 text-amber-700',
  enviado: 'bg-blue-100 text-blue-700',
  recibido: 'bg-green-100 text-green-700',
};

/** Alias local reutilizado en varias vistas del detalle de pedido. */
export const tipoLabel = TIPO_PEDIDO_LABELS;

/** Iconos por categoría de producto. */
export const catIcons: Record<string, any> = {
  Verduras: Leaf,
  Frutas: Apple,
  Ensaladas: Salad,
};

/** Estado de un archivo (albarán) durante el escaneo OCR en modo recepción. */
export type ScanFileEntry = {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  file: File;
  status: 'pending' | 'scanning' | 'done' | 'error';
  matched?: number;
  total?: number;
  notas?: string | null;
  error?: string;
  extras?: { productoId: number; nombre: string; cantidad: number; unidad: string; categoria: string }[];
  unknowns?: { nombre: string; cantidad: number }[];
};
