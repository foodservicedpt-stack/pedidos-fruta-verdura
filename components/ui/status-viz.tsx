'use client';

/**
 * Componentes visuales de estado con propósito.
 *
 * Regla de oro (requisito del producto): el color NUNCA es la única señal.
 * Cada estado se comunica con forma + icono + texto + color, y respeta
 * prefer-reduced-motion. Tono 'muted' = neutro, 'info' = azul,
 * 'success' = verde, 'warning' = ámbar, 'danger' = rojo.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  MinusCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

export type StatusTone = 'muted' | 'info' | 'success' | 'warning' | 'danger';

/** Mapa tono → clases de texto/fondo/borde (sin acoplar a un color suelto). */
const toneDot: Record<StatusTone, string> = {
  muted: 'bg-muted-foreground/40',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};
const toneBadge: Record<StatusTone, string> = {
  muted: 'bg-muted text-muted-foreground border-border',
  info: 'bg-info-soft text-info border-info/30',
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
};

const toneIcon = (tone: StatusTone): LucideIcon =>
  tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : tone === 'danger' ? AlertCircle : tone === 'info' ? Info : MinusCircle;

/** Punto de estado: forma + color. */
export function StatusDot({ tone = 'muted', className, size = 'md' }: { tone?: StatusTone; className?: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block rounded-full shrink-0', toneDot[tone], size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5', className)}
    />
  );
}

/** Píldora de estado: icono + texto + color + borde. Nunca depende del color solo. */
export function StatusBadge({
  tone = 'muted',
  label,
  icon,
  className,
  size = 'md',
}: {
  tone?: StatusTone;
  label: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const Icon = icon ?? toneIcon(tone);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        toneBadge[tone],
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden />}
      {label}
    </span>
  );
}

/** Barra de progreso accesible. Rellena según 0-100 y muestra etiqueta opcional. */
export function ProgressBar({
  value,
  label,
  sublabel,
  tone = 'info',
  className,
  showLabel = true,
}: {
  value: number;
  label?: string;
  sublabel?: string;
  tone?: StatusTone;
  className?: string;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : tone === 'danger' ? 'bg-danger' : tone === 'muted' ? 'bg-muted-foreground/40' : 'bg-info';
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (label || sublabel) && (
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {sublabel ? <span className="text-xs text-muted-foreground">{sublabel}</span> : <span className="text-xs font-medium text-foreground">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={label ?? 'Progreso'}
        className="h-2.5 w-full rounded-full bg-muted overflow-hidden"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Anillo de progreso (SVG). Útil para porcentajes grandes y compactos. */
export function ProgressRing({
  value,
  size = 48,
  stroke = 5,
  tone = 'info',
  label,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: StatusTone;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = tone === 'success' ? 'stroke-success' : tone === 'warning' ? 'stroke-warning' : tone === 'danger' ? 'stroke-danger' : tone === 'muted' ? 'stroke-muted-foreground/40' : 'stroke-info';
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className={cn('transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none', fill)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold font-mono text-foreground" aria-hidden>
        {label ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

/**
 * Stepper horizontal de la vida de un pedido. Los pasos completados se pintan
 * con el tono indicado; el actual se marca con un anillo; los futuros, atenuados.
 */
export function OrderStepper({
  steps,
  currentIndex,
  tone = 'info',
  className,
}: {
  steps: { key: string; label: string }[];
  currentIndex: number;
  tone?: StatusTone;
  className?: string;
}) {
  const active = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : tone === 'danger' ? 'bg-danger' : 'bg-info';
  return (
    <ol className={cn('flex items-center w-full', className)} aria-label="Progreso del pedido">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <React.Fragment key={s.key}>
            <li className="flex items-center flex-col flex-1">
              <span
                className={cn(
                  'flex items-center justify-center rounded-full w-6 h-6 text-[11px] font-semibold border transition-colors motion-reduce:transition-none',
                  done ? cn('text-white border-transparent', active) : current ? 'border-current text-foreground' : 'text-muted-foreground/60 border-border',
                  current ? 'ring-2 ring-offset-2 ring-current/30' : '',
                )}
                aria-current={current ? 'step' : undefined}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={cn('mt-1.5 text-[11px] text-center leading-tight', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {s.label}
              </span>
            </li>
            {i < steps.length - 1 && (
              <li className="flex-1 h-0.5 rounded-full mb-5 bg-muted mx-1" aria-hidden>
                <div className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', done ? active : '')} style={{ width: done ? '100%' : '0%' }} />
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/** Indicador de carga con texto. */
export function Busy({
  label = 'Cargando',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)} role="status" aria-live="polite">
      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />
      {label}
    </div>
  );
}

/**
 * Compara pedido vs recibido con dos barras proporcionales (respuesta a:
 * "¿Cuánto de lo pedido hemos recibido?"). El color señala el estado, pero
 * siempre va acompañado de texto.
 */
export function CompareBar({
  ordered,
  received,
  unit = '',
  className,
}: {
  ordered: number;
  received: number;
  unit?: string;
  className?: string;
}) {
  const max = Math.max(ordered, received, 1);
  const recPct = Math.max(0, Math.min(100, (received / max) * 100));
  const ordPct = Math.max(0, Math.min(100, (ordered / max) * 100));
  const diff = received - ordered;
  const toneColor = diff === 0 ? 'bg-success' : diff > 0 ? 'bg-warning' : 'bg-danger';
  const toneText = diff === 0 ? 'text-success' : diff > 0 ? 'text-warning' : 'text-danger';
  return (
    <div className={cn('space-y-1 text-[10px]', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Pedido</span>
        <span className="font-mono text-foreground">{ordered}{unit ? ' ' + unit : ''}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: ordPct + '%' }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Recibido</span>
        <span className={cn('font-mono', toneText)}>{received}{unit ? ' ' + unit : ''}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', toneColor)} style={{ width: recPct + '%' }} />
      </div>
      {diff !== 0 && (
        <div className="flex items-center justify-center gap-1 pt-0.5">
          <span className={cn('font-semibold', toneText)}>{diff > 0 ? '▲ +' : '▼ '}{diff}</span>
          <span className="text-muted-foreground">diferencia</span>
        </div>
      )}
    </div>
  );
}
