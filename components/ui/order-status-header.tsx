'use client';

/**
 * Cabecera de estado de un pedido: stepper de la vida del pedido + barra de
 * progreso + metadatos clave. Comunica "¿en qué estado está este pedido?" en
 * un vistazo y respeta prefers-reduced-motion.
 */
import { OrderStepper, ProgressBar } from '@/components/ui/status-viz';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Package, Clock } from 'lucide-react';
import { PEDIDO_ESTADOS, PEDIDO_ESTADO_META, estadoProgress, estadoIndex } from '@/lib/status';
import { TIPO_PEDIDO_LABELS } from '@/lib/constants';

const stateTone = (estado: string) => PEDIDO_ESTADO_META[estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'muted';

export function OrderStatusHeader({ pedido }: { pedido: any }) {
  const estado = pedido?.estado ?? 'borrador';
  const idx = estadoIndex(estado);
  const progress = estadoProgress(estado);
  const steps = PEDIDO_ESTADOS.map(s => ({ key: s, label: PEDIDO_ESTADO_META[s].label }));
  const tone = stateTone(estado);

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Pedido</span>
          <span className="font-mono font-semibold text-sm">#{pedido?.id}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pedido?.tipoPedido && <Badge variant="outline" className="text-xs">{TIPO_PEDIDO_LABELS[pedido.tipoPedido] ?? pedido.tipoPedido}</Badge>}
          <Badge variant="secondary" className="text-xs gap-1"><Package className="w-3 h-3" /> {(pedido?.detalles ?? []).length} productos</Badge>
        </div>
      </div>

      <OrderStepper steps={steps} currentIndex={idx} tone={tone as any} />

      <ProgressBar value={progress} label={PEDIDO_ESTADO_META[estado as keyof typeof PEDIDO_ESTADO_META]?.label ?? estado} sublabel={progress + '%'} tone={tone as any} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Meta icon={User} label="Creado por" value={pedido?.user?.name ?? 'Equipo'} />
        <Meta icon={Calendar} label="Fecha pedido" value={pedido?.fechaPedido ? new Date(pedido.fechaPedido).toLocaleDateString('es-ES') : '—'} />
        <Meta icon={Clock} label="Entrega" value={pedido?.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString('es-ES') : '—'} />
        <Meta icon={Package} label="Progreso" value={progress + '%'} />
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium truncate text-foreground">{value}</p>
      </div>
    </div>
  );
}
