'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle, ArrowRight, AlertTriangle, TrendingUp, Sparkles, ClipboardList, Calendar, Package, ChevronRight,
} from 'lucide-react';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { ProgressRing, StatusBadge, ProgressBar } from '@/components/ui/status-viz';
import { PEDIDO_ESTADO_META, estadoProgress } from '@/lib/status';

interface Insight { productoId: number; nombre: string; unidad: string; prom: number; variacion: number | null; tendencia: 'sube' | 'baja' | 'estable' | null; }

export function DashboardClient() {
  const [recent, setRecent] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [seasonCount, setSeasonCount] = useState(0);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [ses, pedRes, insRes, recRes] = await Promise.all([
          fetch('/api/auth/session').then(r => r.json()).catch(() => null),
          fetch('/api/pedidos?limit=8'),
          fetch('/api/analisis/insights'),
          fetch('/api/productos/recomendaciones'),
        ]);
        if (!mounted) return;
        if (ses?.user?.name) setNombre(ses.user.name);
        if (pedRes.ok) setRecent(await pedRes.json());
        if (insRes.ok) setInsights(await insRes.json());
        if (recRes.ok) { const r = await recRes.json(); setSeasonCount((r?.spotlight ?? []).length); }
      } catch (e) { console.error('dashboard', e); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Pedido abierto (borrador/enviado)
  const openOrder = (recent ?? []).find((p: any) => p?.estado === 'borrador' || p?.estado === 'enviado');
  // Incidencias a revisar: recepciones con extrasAlbaran no vacío
  const toReview = (recent ?? []).filter((p: any) => {
    const ex = p?.extrasAlbaran;
    const n = ex ? ((ex?.extras?.length ?? 0) + (ex?.noRegistrados?.length ?? 0) + (ex?.noLlegaron?.length ?? 0)) : 0;
    return p?.estado === 'recibido' && n > 0;
  });
  const topInsight = (insights ?? []).find(i => i.tendencia === 'sube');
  const downInsight = (insights ?? []).find(i => i.tendencia === 'baja');
  const insight = topInsight ?? downInsight;

  return (
    <div className="mx-auto max-w-[1100px] p-4 lg:p-8 space-y-4">
      <FadeIn>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold tracking-tight">Buenos días{nombre ? ', ' + nombre : ''} 👋</h1>
            <p className="text-sm text-muted-foreground">¿Qué quieres hacer hoy?</p>
          </div>
          <Link href="/pedidos/nuevo"><Button size="lg" className="gap-2 shadow-md"><PlusCircle className="w-5 h-5" /> Nuevo pedido</Button></Link>
        </div>
      </FadeIn>

      {/* PEDIDO ACTUAL — compacto y accionable */}
      <FadeIn delay={0.05}>
        <Link href={openOrder ? '/pedidos/' + openOrder.id : '/pedidos/nuevo'}>
          <Card className="hover:translate-y-[-1px] transition-transform" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> Pedido actual</p>
                  {openOrder ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">Pedido #{openOrder.id}</span>
                        <StatusBadge tone={(PEDIDO_ESTADO_META[openOrder.estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'info') as any} label={PEDIDO_ESTADO_META[openOrder.estado as keyof typeof PEDIDO_ESTADO_META]?.label ?? openOrder.estado} />
                      </div>
                      <div className="mt-2"><ProgressBar value={estadoProgress(openOrder.estado)} tone={(PEDIDO_ESTADO_META[openOrder.estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'info') as any} label="Progreso" /></div>
                      {openOrder?.fechaEntrega && <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Entrega · {new Date(openOrder.fechaEntrega).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aún no hay un pedido abierto. Toca para crear el primero.</p>
                  )}
                </div>
                <ProgressRing value={openOrder ? estadoProgress(openOrder.estado) : 0} size={64} stroke={6} tone={(openOrder ? PEDIDO_ESTADO_META[openOrder.estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'info' : 'muted') as any} label={String(openOrder ? estadoProgress(openOrder.estado) : 0) + '%'} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </FadeIn>

      {/* Micrométricas horizontales */}
      <FadeIn delay={0.08}>
        <div className="grid grid-cols-3 gap-2">
          <MetricChip label="Pedidos" value={loading ? '–' : (recent ?? []).length > 0 ? String((recent ?? []).filter(p => p?.estado !== 'borrador').length) : '0'} />
          <MetricChip label="En temporada" value={loading ? '–' : String(seasonCount)} accent="text-success" />
          <MetricChip label="Para revisar" value={loading ? '–' : String(toReview.length)} accent={toReview.length > 0 ? 'text-warning' : undefined} />
        </div>
      </FadeIn>

      {/* PARA REVISAR — progressive disclosure */}
      {toReview.length > 0 && (
        <FadeIn delay={0.1}>
          <Link href="/pedidos">
            <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning-soft/50 p-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg bg-warning/15 text-warning flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></span>
                <div>
                  <p className="text-sm font-semibold">{toReview.length} recepción{toReview.length !== 1 ? 'es' : ''} con incidencias</p>
                  <p className="text-xs text-muted-foreground">Diferencias entre lo pedido y lo recibido</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        </FadeIn>
      )}

      {/* INSIGHT */}
      {insight && (
        <FadeIn delay={0.12}>
          <Link href="/analisis">
            <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/5 p-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><TrendingUp className="w-5 h-5" /></span>
                <div>
                  <p className="text-sm font-semibold">{insight.nombre} {insight.tendencia === 'sube' ? 'está aumentando' : 'está bajando'}</p>
                  <p className="text-xs text-muted-foreground">{insight.variacion != null && insight.variacion !== 0 ? (insight.variacion > 0 ? '+' : '') + insight.variacion + '%' : 'en tus pedidos recientes'} · Ver análisis</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        </FadeIn>
      )}

      {/* EN TEMPORADA — indicador contextual, no lista */}
      {seasonCount > 0 && (
        <FadeIn delay={0.14}>
          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-lg bg-success/15 text-success flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
              <p className="text-sm"><span className="font-semibold text-success">{seasonCount} productos</span> están en temporada ahora</p>
            </div>
            <Link href="/pedidos/nuevo"><Button variant="outline" size="sm" className="gap-1">Ver en pedido <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </div>
        </FadeIn>
      )}

      {/* PEDIDOS RECIENTES — compactos */}
      <FadeIn delay={0.16}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-sm font-semibold">Pedidos recientes</p>
              <Link href="/pedidos" className="text-xs text-primary flex items-center gap-0.5">Ver todos <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {loading ? <p className="text-xs text-muted-foreground px-1 py-2">Cargando...</p> : (recent ?? []).length === 0 ? <p className="text-xs text-muted-foreground px-1 py-2">No hay pedidos aún</p> : (
              <div className="divide-y">
                {(recent ?? []).slice(0, 4).map((p: any) => (
                  <Link key={p?.id} href={'/pedidos/' + p?.id} className="flex items-center justify-between py-2 px-1 rounded hover:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm">Pedido #{p?.id}</span>
                      <span className="text-xs text-muted-foreground truncate">{p?.fechaPedido ? new Date(p.fechaPedido).toLocaleDateString('es-ES') : ''}</span>
                    </div>
                    <StatusBadge tone={(PEDIDO_ESTADO_META[p?.estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'muted') as any} label={PEDIDO_ESTADO_META[p?.estado as keyof typeof PEDIDO_ESTADO_META]?.label ?? p?.estado} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function MetricChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <p className={'text-xl font-bold font-mono leading-none ' + (accent ?? 'text-foreground')}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
    </div>
  );
}
