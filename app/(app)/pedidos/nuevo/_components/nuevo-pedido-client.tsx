'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeasonBadge } from '@/components/ui/season-badge';
import { ProgressBar } from '@/components/ui/status-viz';
import { Search, Send, Save, Leaf, Apple, Salad, TrendingUp, Copy, CalendarDays, Minus, Plus, Sparkles, Check, X, Package, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';
import { cn } from '@/lib/utils';
import { TIPO_PEDIDO_OPTIONS, CATEGORIAS } from '@/lib/constants';
import { getSeasonStatus } from '@/lib/seasonality/engine';

interface Producto { id: number; nombre: string; categoria: string; unidad: string; enTemporada: boolean; activo: boolean; notas: string | null; ordenSeccion: number; mesInicioTemp: number | null; mesFinTemp: number | null; }
interface Sugerencia { productoId: number; promedio: number; totalPedidos: number; ultimaCantidad: number | null; ultimaFecha: string | null; ultimosPedidos: { fecha: string; cantidad: number }[]; }
interface LineaPedido { productoId: number; cantidadSolicitada: number; comentario: string; }

const TIPOS_PEDIDO = TIPO_PEDIDO_OPTIONS;
const catIcons: Record<string, any> = { Verduras: Leaf, Frutas: Apple, Ensaladas: Salad };

export function NuevoPedidoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCat = searchParams?.get?.('categoria') ?? 'Verduras';
  const fromPedido = searchParams?.get?.('copiar');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [sugerencias, setSugerencias] = useState<Record<number, Sugerencia>>({});
  const [lineas, setLineas] = useState<Record<number, LineaPedido>>({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(initialCat);
  const [tipoPedido, setTipoPedido] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOnlyFilled, setShowOnlyFilled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, sugRes] = await Promise.all([fetch('/api/productos'), fetch('/api/productos/sugerencias')]);
        if (prodRes.ok) setProductos(await prodRes.json());
        if (sugRes.ok) { const sugs = await sugRes.json(); const m: Record<number, Sugerencia> = {}; for (const s of (sugs ?? [])) m[s?.productoId] = s; setSugerencias(m); }
        if (fromPedido) {
          const pedRes = await fetch('/api/pedidos/' + fromPedido);
          if (pedRes.ok) { const ped = await pedRes.json(); const nl: Record<number, LineaPedido> = {}; for (const d of (ped?.detalles ?? [])) nl[d?.productoId] = { productoId: d?.productoId, cantidadSolicitada: d?.cantidadSolicitada ?? 0, comentario: d?.comentario ?? '' }; setLineas(nl); toast.success('Pedido anterior copiado como plantilla'); }
        }
      } catch (err: any) { console.error(err?.message); toast.error('Error cargando productos'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [fromPedido]);

  // Autosave borrador
  useEffect(() => {
    const filled = Object.values(lineas ?? {}).filter((l: any) => (l?.cantidadSolicitada ?? 0) > 0);
    if (filled.length > 0) { try { localStorage?.setItem?.('pedido-borrador', JSON.stringify({ lineas, tipoPedido, fechaEntrega, notas })); } catch (e) {} }
  }, [lineas, tipoPedido, fechaEntrega, notas]);

  useEffect(() => {
    if (fromPedido) return;
    try { const saved = localStorage?.getItem?.('pedido-borrador'); if (saved) { const data = JSON.parse(saved); if (data?.lineas && Object.keys(data.lineas ?? {}).length > 0) { setLineas(data.lineas); if (data?.tipoPedido) setTipoPedido(data.tipoPedido); if (data?.fechaEntrega) setFechaEntrega(data.fechaEntrega); if (data?.notas) setNotas(data.notas); toast.info('Borrador recuperado'); } } } catch (e) {}
  }, [fromPedido]);

  const updateCantidad = useCallback((productoId: number, cantidad: number) => {
    setLineas((prev: any) => { const n = { ...(prev ?? {}) }; if (cantidad <= 0) delete n[productoId]; else n[productoId] = { productoId, cantidadSolicitada: cantidad, comentario: n[productoId]?.comentario ?? '' }; return n; });
  }, []);
  const useSuggestion = useCallback((productoId: number, value: number) => { if (value > 0) updateCantidad(productoId, value); }, [updateCantidad]);

  const filteredProducts = (productos ?? []).filter((p: Producto) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || ((p.nombre ?? '').toLowerCase().includes(q));
    const matchTab = p.categoria === activeTab;
    const matchFilled = !showOnlyFilled || (lineas[p.id]?.cantidadSolicitada ?? 0) > 0;
    return matchSearch && matchTab && matchFilled;
  });

  const totalItems = Object.values(lineas ?? {}).filter((l: any) => (l?.cantidadSolicitada ?? 0) > 0).length;
  const totalInCat = (productos ?? []).filter(p => p.categoria === activeTab).length;
  const progress = totalInCat > 0 ? Math.round((totalItems / totalInCat) * 100) : 0;

  const cartItems = Object.values(lineas ?? {}).filter((l: any) => (l?.cantidadSolicitada ?? 0) > 0).map((l: any) => ({ ...l, producto: (productos ?? []).find(p => p.id === l.productoId) }));

  // En temporada: real names from the catalog (just-in-time hint)
  const inSeason = (productos ?? []).filter(p => getSeasonStatus(p.nombre, { mesInicio: p.mesInicioTemp, mesFin: p.mesFinTemp }).state === 'optima').sort((a, b) => (sugerencias[b.id]?.promedio ?? 0) - (sugerencias[a.id]?.promedio ?? 0)).slice(0, 8);

  const handleSave = async (estado: string) => {
    const isSending = estado === 'enviado';
    if (isSending) setSending(true); else setSaving(true);
    try {
      const detalles = Object.values(lineas ?? {}).filter((l: any) => (l?.cantidadSolicitada ?? 0) > 0);
      if ((detalles?.length ?? 0) === 0) { toast.error('Añade al menos un producto'); return; }
      const res = await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipoPedido: tipoPedido || null, fechaEntrega: fechaEntrega || null, notas: notas || null, estado, detalles }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error ?? 'Error al guardar'); }
      const pedido = await res.json();
      if (estado === 'enviado') { try { await fetch('/api/pedidos/' + pedido?.id + '/enviar', { method: 'POST' }); } catch (e) {} }
      try { localStorage?.removeItem?.('pedido-borrador'); } catch (e) {}
      toast.success(estado === 'enviado' ? 'Pedido enviado correctamente' : 'Borrador guardado');
      router.replace('/pedidos/' + pedido?.id);
    } catch (err: any) { toast.error(err?.message ?? 'Error al guardar'); }
    finally { setSaving(false); setSending(false); setCartOpen(false); }
  };

  if (loading) { return <div className="mx-auto max-w-[1100px] p-4"><div className="animate-pulse space-y-3"><div className="h-8 bg-muted rounded w-48" /><div className="h-12 bg-muted rounded" /><div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded" />)}</div></div></div>; }

  return (
    <div className="mx-auto max-w-[1100px] p-4 lg:p-8 space-y-4">
      <FadeIn>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Nuevo pedido</h1>
            <p className="text-sm text-muted-foreground">Busca y añade cantidades. Te avisamos de la temporada.</p>
          </div>
          {totalItems > 0 && <Badge variant="secondary" className="text-sm gap-1 shrink-0"><Package className="w-3.5 h-3.5" /> {totalItems}</Badge>}
        </div>
      </FadeIn>

      {/* Config compacta */}
      <FadeIn delay={0.04}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <Label className="flex items-center gap-1.5 text-[11px]"><CalendarDays className="w-3 h-3" /> Tipo</Label>
                <select value={tipoPedido} onChange={(e: any) => setTipoPedido(e?.target?.value ?? '')} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="">Seleccionar...</option>{TIPOS_PEDIDO.map((t: any) => <option key={t?.value} value={t?.value}>{t?.label}</option>)}</select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Entrega</Label>
                <Input type="date" value={fechaEntrega} onChange={(e: any) => setFechaEntrega(e?.target?.value ?? '')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[11px]">Notas</Label>
                <Input placeholder="Notas del pedido..." value={notas} onChange={(e: any) => setNotas(e?.target?.value ?? '')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Smart hints de temporada (compactas) */}
      {inSeason.length > 0 && (
        <FadeIn delay={0.08}>
          <div className="rounded-xl border border-success/20 bg-success-soft/40 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success mb-1.5 px-1"><Sparkles className="w-3.5 h-3.5" /> Ahora en temporada</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-0.5 px-0.5">
              {inSeason.map(p => (
                <button key={p.id} onClick={() => setSearch(p.nombre)} className="shrink-0 flex items-center gap-1 rounded-full bg-card border border-success/25 px-2.5 py-1 text-xs text-success active:scale-95 transition-transform motion-reduce:transition-none"><Check className="w-3 h-3" /> {p.nombre}</button>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Búsqueda + filtro */}
      <FadeIn delay={0.1}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar producto..." value={search} onChange={(e: any) => setSearch(e?.target?.value ?? '')} className="pl-10" />
          </div>
          <Button variant={showOnlyFilled ? 'default' : 'outline'} size="sm" onClick={() => setShowOnlyFilled(!showOnlyFilled)} className="gap-1 shrink-0"><Check className="w-3.5 h-3.5" /> Con cantidad</Button>
        </div>
      </FadeIn>

      {/* Categorías */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {CATEGORIAS.map((cat: string) => {
            const Icon = catIcons[cat] ?? Leaf;
            const catCount = Object.entries(lineas ?? {}).filter(([key]: [string, any]) => { const prod = (productos ?? []).find((p: Producto) => p?.id === parseInt(key)); return prod?.categoria === cat && (lineas[parseInt(key)]?.cantidadSolicitada ?? 0) > 0; }).length;
            return <TabsTrigger key={cat} value={cat} className="gap-1.5"><Icon className="w-3.5 h-3.5" /> {cat}{catCount > 0 && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{catCount}</Badge>}</TabsTrigger>;
          })}
        </TabsList>

        {CATEGORIAS.map((cat: string) => (
          <TabsContent key={cat} value={cat} className="mt-3">
            <div className="space-y-2">
              {filteredProducts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No se encontraron productos</p> : (
                filteredProducts.map((p: Producto) => {
                  const sug = sugerencias[p?.id];
                  const cantidad = lineas[p?.id]?.cantidadSolicitada ?? 0;
                  const isFilled = cantidad > 0;
                  return (
                    <Card key={p.id} className={cn('transition-all', isFilled ? 'ring-2 ring-primary/25 bg-primary/[0.03]' : 'hover:bg-accent/40')} style={{ boxShadow: 'var(--shadow-sm)' }}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium leading-tight">{p.nombre}</span><SeasonBadge nombre={p.nombre} mesInicio={p.mesInicioTemp} mesFin={p.mesFinTemp} size="sm" /></div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">{p.unidad}</span>
                              {sug?.promedio ? <button type="button" onClick={() => useSuggestion(p.id, sug.promedio)} className="text-xs text-info hover:underline flex items-center gap-0.5" title="Usar promedio"><TrendingUp className="w-3 h-3" /> Prom: {sug.promedio}</button> : null}
                              {(sug?.ultimosPedidos ?? []).length > 0 ? (<span className="text-xs text-muted-foreground flex items-center gap-1" title="Últimos pedidos"><Copy className="w-3 h-3" />{(sug.ultimosPedidos ?? []).slice(0, 3).map((up: any, i: number) => <button key={i} type="button" onClick={() => useSuggestion(p.id, up?.cantidad ?? 0)} className="text-success hover:underline" title={up?.fecha ? new Date(up.fecha).toLocaleDateString('es-ES') : ''}>{up?.cantidad}{i < Math.min((sug.ultimosPedidos ?? []).length, 3) - 1 ? ',' : ''}</button>)}</span>) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCantidad(p.id, Math.max(0, cantidad - (p.unidad === 'Kg' ? 0.5 : 1)))} disabled={cantidad <= 0} aria-label="Restar cantidad"><Minus className="w-3.5 h-3.5" /></Button>
                            <Input type="number" min="0" step={p.unidad === 'Kg' ? '0.5' : '1'} value={cantidad || ''} onChange={(e: any) => { const v = parseFloat(e?.target?.value ?? '0'); updateCantidad(p.id, isNaN(v) ? 0 : v); }} className="w-16 text-center h-9 font-mono" placeholder="0" inputMode="decimal" aria-label={'Cantidad de ' + p.nombre} />
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCantidad(p.id, cantidad + (p.unidad === 'Kg' ? 0.5 : 1))} aria-label="Sumar cantidad"><Plus className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Sticky carrito — se sitúa justo encima de la bottom nav en móvil */}
      {totalItems > 0 && (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+64px)] lg:bottom-0 z-30 mx-auto max-w-[1100px]">
          <div className="flex items-center justify-between rounded-2xl border bg-card/95 backdrop-blur px-3 py-2.5 shadow-lg" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
            <button onClick={() => setCartOpen(true)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
              <span className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{totalItems}</span>
              <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">{totalItems} producto{totalItems !== 1 ? 's' : ''}</span><span className="block text-xs text-muted-foreground truncate">Ver pedido</span></span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>
            <Button onClick={() => handleSave('enviado')} disabled={sending || saving} className="gap-1.5 ml-2 shrink-0"><Send className="w-4 h-4" /> Enviar</Button>
          </div>
        </div>
      )}

      {/* Carrito bottom sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-card border-t p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" style={{ boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" style={{ transform: 'translateY(-2px)' }} />
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-semibold text-base">Tu pedido · {totalItems}</span>
              <button onClick={() => setCartOpen(false)} aria-label="Cerrar" className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {cartItems.map((it: any) => (
                <div key={it.productoId} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium truncate">{it?.producto?.nombre ?? 'Producto'}</span>
                  <span className="text-sm font-mono shrink-0">{it.cantidadSolicitada} {it?.producto?.unidad ?? ''}</span>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div className="mt-3 max-w-[260px]"><ProgressBar value={progress} label="Selección" tone="info" /></div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleSave('borrador')} disabled={saving || sending} className="gap-1.5"><Save className="w-4 h-4" /> Borrador</Button>
              <Button onClick={() => handleSave('enviado')} disabled={saving || sending} className="gap-1.5"><Send className="w-4 h-4" /> Enviar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
