'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Package } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import { catIcons } from './pedido-detail-constants';

/**
 * Muestra las incidencias persistidas del albarán una vez el pedido está recibido:
 * productos que no llegaron, extras registrados y productos no dados de alta.
 * Es puramente de presentación (lee de `pedido.extrasAlbaran`).
 */
export function PedidoIncidencias({ extrasAlbaran }: { extrasAlbaran: any }) {
  const data = extrasAlbaran ?? {};
  const extras = data?.extras ?? [];
  const noRegistrados = data?.noRegistrados ?? [];
  const noLlegaron = data?.noLlegaron ?? [];
  if (extras.length === 0 && noRegistrados.length === 0 && noLlegaron.length === 0) return null;

  return (
    <FadeIn delay={0.2}>
      <Card className="border-amber-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Incidencias del albarán
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {noLlegaron.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Productos del pedido no detectados en albaranes (no llegaron)</p>
              {noLlegaron.map((nl: any, i: number) => {
                const CatIcon = catIcons[nl.categoria] ?? Package;
                return (
                  <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-900">{nl.nombre}</span>
                      <Badge variant="secondary" className="text-xs">{nl.categoria}</Badge>
                    </div>
                    <span className="text-sm font-mono text-red-600">
                      Pedido: {nl.cantidadSolicitada} {nl.unidad} → Recibido: 0
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {extras.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Productos registrados que llegaron sin pedirlos</p>
              {extras.map((ex: any, i: number) => {
                const CatIcon = catIcons[ex.categoria] ?? Package;
                return (
                  <div key={i} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">{ex.nombre}</span>
                      <Badge variant="secondary" className="text-xs">{ex.categoria}</Badge>
                    </div>
                    <span className="text-sm font-mono font-semibold text-amber-700">{ex.cantidad} {ex.unidad}</span>
                  </div>
                );
              })}
            </div>
          )}
          {noRegistrados.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Productos no dados de alta en el sistema</p>
              {noRegistrados.map((nr: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-800">{nr.nombre}</span>
                  </div>
                  <span className="text-sm font-mono text-red-600">{nr.cantidad}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
