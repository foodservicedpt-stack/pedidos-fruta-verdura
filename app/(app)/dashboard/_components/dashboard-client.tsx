'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle, Package, ClipboardList, TrendingUp, ArrowRight, Clock, AlertTriangle, Sparkles, CheckCircle2, ScanLine, Boxes,
} from 'lucide-react';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { ProgressRing, StatusBadge, ProgressBar } from '@/components/ui/status-viz';
import { RecommendationPanel } from '@/components/recommendation-panel';
import { PEDIDO_ESTADO_META, estadoProgress } from '@/lib/status';
import type { Recommendation } from '@/lib/ai/types';
import { getSession } from 'next-auth/react';

interface Resumen {
  totalProductos: number; totalPedidos: number; pedidosBorrador: number; totalHistorico: number;
  topProductos: { productoId: number; nombre: string; categoria: string; frecuencia: number; promedioKg: number }[];
  consumoMensual: { mes: string; Verduras: number; Frutas: number; Ensaladas: number }[];
}
interface Insight { productoId: number; nombre: string; categoria: string; unidad: string; promedio: number; ultima: number; variacion: number | null; tendencia: 'sube' | 'baja' | 'estable' | null; numPedidos: number; mensajes: string[]; }

export function DashboardClient() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<Recommendation[]>([]);
  const [spotlight, setSpotlight] = useState<Recommendation[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    getSession().then(s => setNombre((s?.user as any)?.name ?? ''));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, pedRes, recRes, insRes] = await Promise.all([
          fetch('/api/analisis/resumen'),
          fetch('/api/pedidos?limit=6'),
          fetch('/api/productos/recomendaciones'),
          fetch('/api/analisis/insights'),
        ]);
        if (resRes.ok) setResumen(await resRes.json());
        if (pedRes.ok) setRecent(await pedRes.json());
        if (recRes.ok) { const r = await recRes.json(); setRecomendaciones(r?.recomendaciones ?? []); setSpotlight(r?.spotlight ?? []); }
        if (insRes.ok) setInsights(await insRes.json());
      } catch (e) { console.error('dashboard', e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Foco de la semana: el pedido abierto más reciente (borrador/enviado)
  const openOrder = (recent ?? []).find((p: any) => p?.estado === 'borrador' || p?.estado === 'enviado');
  const lastReceived = (recent ?? []).find((p: any) => p?.estado === 'recibido');
  const trendUp = (insights ?? []).filter(i => i.tendencia === 'sube' && i.numPedidos > 0).slice(0, 3);
  const trendDown = (insights ?? []).filter(i => i.tendencia === 'baja' && i.numPedidos > 0).slice(0, 3);

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Buenos días{nombre ? ', ' + nombre : ''} 👋</h1>
            <p className="text-muted-foreground mt-1">Esto es lo que está pasando ahora mismo en tu fruta y verdura.</p>
          </div>
          <Link href="/pedidos/nuevo"><Button size="lg" className="gap-2"><PlusCircle className="w-5 h-5" /> Nuevo pedido</Button></Link>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Estado de la semana */}
        <FadeIn delay={0.05} className="lg:col-span-2">
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-start gap-5">
                {openOrder ? (
                  <ProgressRing value={estadoProgress(openOrder.estado)} size={72} stroke={6} tone={(PEDIDO_ESTADO_META[openOrder.estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'info') as any} label={String(estadoProgress(openOrder.estado)) + '%'} />
                ) : (
                  <ProgressRing value={0} size={72} stroke={6} tone="muted" label="0%" />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold">Estado de la semana</h2>
                  </div>
                  {openOrder ? (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Pedido #{openOrder.id}</span> · {PEDIDO_ESTADO_META[openOrder.estado as keyof typeof PEDIDO_ESTADO_META]?.label ?? openOrder.estado}
                      </p>
                      <div className="max-w-[260px]">
                        <ProgressBar value={estadoProgress(openOrder.estado)} tone={(PEDIDO_ESTADO_META[openOrder.estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'info') as any} label="Progreso" />
                      </div>
                      {openOrder?.fechaEntrega && <p className="text-xs text-muted-foreground mt-1">Próxima entrega · {new Date(openOrder.fechaEntrega).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aún no tienes un pedido abierto. Crea uno para empezar.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Acciones rápidas */}
        <FadeIn delay={0.1}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <h2 className="text-base font-semibold mb-3">Acciones</h2>
              <div className="grid grid-cols-2 gap-2">
                <QuickAction icon={PlusCircle} label="Nuevo pedido" href="/pedidos/nuevo" variant="default" />
                <QuickAction icon={Boxes} label="Recibir" href="/pedidos" variant="outline" />
                <QuickAction icon={ScanLine} label="Escanear" href="/pedidos" variant="outline" />
                <QuickAction icon={BarChartIcon} label="Análisis" href="/analisis" variant="outline" />
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Spotlight de temporada */}
      {(spotlight.length > 0 || recomendaciones.length > 0) && (
        <FadeIn delay={0.15}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }} className="border-success/15">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-success" /> Buen momento para estos productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecommendationPanel recomendaciones={recomendaciones} spotlight={spotlight} />
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights de consumo */}
        <FadeIn delay={0.2}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Tendencia de consumo</CardTitle>
                <Link href="/analisis"><Button variant="ghost" size="sm" className="gap-1 text-xs">Ver <ArrowRight className="w-3 h-3" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (trendUp.length === 0 && trendDown.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aún no hay suficientes datos para detectar tendencias.</p>
              ) : (
                <>
                  {trendUp.map(i => (
                    <div key={'u' + i.productoId} className="flex items-center justify-between p-2 rounded-lg bg-success-soft/50">
                      <span className="text-sm font-medium">{i.nombre}</span>
                      <span className="text-xs text-success font-semibold">▲ En aumento</span>
                    </div>
                  ))}
                  {trendDown.map(i => (
                    <div key={'d' + i.productoId} className="flex items-center justify-between p-2 rounded-lg bg-danger-soft/50">
                      <span className="text-sm font-medium">{i.nombre}</span>
                      <span className="text-xs text-danger font-semibold">▼ En descenso</span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Pedidos recientes */}
        <FadeIn delay={0.25}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display">Pedidos recientes</CardTitle>
                <Link href="/pedidos"><Button variant="ghost" size="sm" className="gap-1 text-xs">Ver todos <ArrowRight className="w-3 h-3" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (recent ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay pedidos aún</p>
                </div>
              ) : (recent ?? []).map((p: any) => (
                <Link key={p?.id} href={'/pedidos/' + p?.id}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                    <div>
                      <p className="text-sm font-medium">Pedido #{p?.id}</p>
                      <p className="text-xs text-muted-foreground">{p?.fechaPedido ? new Date(p.fechaPedido).toLocaleDateString('es-ES') : ''} · {(p?.detalles ?? []).length} productos</p>
                    </div>
                    <StatusBadge tone={(PEDIDO_ESTADO_META[p?.estado as keyof typeof PEDIDO_ESTADO_META]?.tone ?? 'muted') as any} label={PEDIDO_ESTADO_META[p?.estado as keyof typeof PEDIDO_ESTADO_META]?.label ?? p?.estado} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Resumen de productos */}
      <FadeIn delay={0.3}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Productos más pedidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (resumen?.topProductos ?? []).slice(0, 6).map((p: any, i: number) => (
              <div key={p?.productoId ?? i} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                  <div><p className="text-sm font-medium">{p?.nombre ?? ''}</p><p className="text-xs text-muted-foreground">{p?.categoria ?? ''}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{p?.promedioKg ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{p?.frecuencia ?? 0} pedidos</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, variant }: { icon: any; label: string; href: string; variant: 'default' | 'outline' }) {
  return (
    <Link href={href}>
      <Button variant={variant} size="sm" className="w-full gap-1.5 justify-start"><Icon className="w-4 h-4" /> {label}</Button>
    </Link>
  );
}

function BarChartIcon(props: any) { return <TrendingUp {...props} />; }
