'use client';

/**
 * Badge de temporada con los colores semánticos del design system.
 * Comunica con icono + texto + color (nunca solo color).
 */
import { getSeasonStatus } from '@/lib/seasonality/engine';
import { StatusBadge } from './status-viz';
import { Sparkles, AlertTriangle, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const toneToIcon: Record<string, LucideIcon> = {
  success: Sparkles,
  warning: AlertTriangle,
  danger: Ban,
  muted: Sparkles,
};

export function SeasonBadge({
  nombre,
  mesInicio,
  mesFin,
  size = 'sm',
}: {
  nombre: string;
  mesInicio?: number | null;
  mesFin?: number | null;
  size?: 'sm' | 'md';
}) {
  const status = getSeasonStatus(nombre, { mesInicio: mesInicio ?? null, mesFin: mesFin ?? null });
  const Icon = toneToIcon[status.tone] ?? Sparkles;
  return (
    <StatusBadge tone={status.tone as any} label={status.label} icon={Icon} size={size} />
  );
}
