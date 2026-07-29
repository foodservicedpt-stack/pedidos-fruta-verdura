/**
 * Tipos de dominio compartidos.
 *
 * Antes este archivo contenía tipos de una plantilla de "gastos" (Expense) que
 * no se usaban en ninguna parte de la aplicación. Se han reemplazado por los
 * tipos reales del dominio de pedidos para tener una referencia central.
 */
import type { Categoria, TipoPedido } from '@/lib/constants';

export type { Categoria, TipoPedido };

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  activo: boolean;
}

export interface DetallePedido {
  id: number;
  pedidoId: number;
  productoId: number;
  cantidad: number;
  merma?: number | null;
  producto?: Producto;
}

export interface Pedido {
  id: number;
  tipoPedido: string;
  fechaPedido: string | Date;
  fechaEntrega?: string | Date | null;
  estado: string;
  observaciones?: string | null;
  detalles?: DetallePedido[];
}
