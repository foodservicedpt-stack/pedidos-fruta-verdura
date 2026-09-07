'use client';

/**
 * Panel de recomendaciones contextuales.
 *
 * Cada elemento comunica QUÉ pasa y POR QUÉ (con la evidencia base), nunca de
 * forma vacía. El color acompaña a icono + texto.
 */
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Recommendation } from '@/lib/ai/types';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-viz';

const recIcon = (tipo: Recommendation['tipo']) =>
  tipo === 'aumentar' || tipo === 'probar' ? Sparkles : tipo === 'reducir' ? TrendingDown : tipo === 'atencion' ? AlertTriangle : tipo === 'mantener' ? CheckCircle2 : Minus;

function RecommendationItem({ rec }: { rec: Recommendation }) {
  const Icon = recIcon(rec.tipo);
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-3', rec.tone === 'success' ? 'border-success/30 bg-success-soft/60' : rec.tone === 'warning' ? 'border-warning/30 bg-warning-soft/60' : rec.tone === 'danger' ? 'border-danger/30 bg-danger-soft/60' : 'border-border bg-muted/30')}>
      <div className={cn('rounded-full p-1.5 shrink-0', rec.tone === 'success' ? 'bg-success/15 text-success' : rec.tone === 'warning' ? 'bg-warning/15 text-warning' : rec.tone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-muted text-muted-foreground')}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold leading-tight">{rec.titulo}</p>
          <StatusBadge tone={rec.tone as any} label={rec.prioridad} size="sm" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{rec.detalle}</p>
        {(rec.base?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {rec.base.slice(0, 2).map((b, i) => (
              <span key={i} className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{b}</span>
            ))}
          </div>
        )}
      </div>
      {rec.cantidadSugerida != null && (
        <span className="text-sm font-mono font-semibold text-primary shrink-0 pt-0.5">{rec.cantidadSugerida}</span>
      )}
    </div>
  );
}

export function RecommendationPanel({
  recomendaciones,
  spotlight,
  title = 'Recomendaciones',
  className,
}: {
  recomendaciones?: Recommendation[];
  spotlight?: Recommendation[];
  title?: string;
  className?: string;
}) {
  const list = recomendaciones ?? [];
  const spotlightList = spotlight ?? [];
  if (list.length === 0 && spotlightList.length === 0) return null;

  const outOfSeason = list.filter(r => r.tipo === 'atencion');
  const opportunities = list.filter(r => r.tipo === 'probar' || r.tipo === 'aumentar');
  const rest = list.filter(r => r.tipo !== 'atencion' && r.tipo !== 'probar' && r.tipo !== 'aumentar');

  return (
    <div className={cn('space-y-3', className)}>
      {(spotlightList.length > 0 || opportunities.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold">Buen momento para estos productos</h3>
          </div>
          <div className="space-y-2">
            {spotlightList.map((rec, i) => <RecommendationItem key={'s' + i} rec={rec} />)}
            {opportunities.map(rec => <RecommendationItem key={'op' + rec.productoId} rec={rec} />)}
          </div>
        </div>
      )}

      {outOfSeason.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">Fuera de su mejor temporada</h3>
          </div>
          <div className="space-y-2">
            {outOfSeason.map(rec => <RecommendationItem key={'oos' + rec.productoId} rec={rec} />)}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
          <div className="space-y-2">
            {rest.map(rec => <RecommendationItem key={'r' + rec.productoId} rec={rec} />)}
          </div>
        </div>
      )}
    </div>
  );
}
