'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Send,
  Save,
  Leaf,
  Apple,
  Salad,
  TrendingUp,
  Copy,
  CalendarDays,
  ChevronUp,
  Check,
  Minus,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';
import { cn } from '@/lib/utils';
import { getTemporadaInfo } from '@/lib/temporada';
import { TIPO_PEDIDO_OPTIONS, CATEGORIAS } from '@/lib/constants';

interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  enTemporada: boolean;
  activo: boolean;
  notas: string | null;
  ordenSeccion: number;
  mesInicioTemp: number | null;
  mesFinTemp: number | null;
}

interface Sugerencia {
  productoId: number;
  promedio: number;
  totalPedidos: number;
  ultimaCantidad: number | null;
  ultimaFecha: string | null;
  ultimosPedidos: { fecha: string; cantidad: number }[];
}

interface LineaPedido {
  productoId: number;
  cantidadSolicitada: number;
  comentario: string;
}

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
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Load products and suggestions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, sugRes] = await Promise.all([
          fetch('/api/productos'),
          fetch('/api/productos/sugerencias'),
        ]);
        if (prodRes.ok) {
          const prods = await prodRes.json();
          setProductos(prods ?? []);
        }
        if (sugRes.ok) {
          const sugs = await sugRes.json();
          const sugMap: Record<number, Sugerencia> = {};
          for (const s of (sugs ?? [])) {
            sugMap[s?.productoId] = s;
          }
          setSugerencias(sugMap);
        }

        // If copying from previous order
        if (fromPedido) {
          const pedRes = await fetch(`/api/pedidos/${fromPedido}`);
          if (pedRes.ok) {
            const ped = await pedRes.json();
            const newLineas: Record<number, LineaPedido> = {};
            for (const d of (ped?.detalles ?? [])) {
              newLineas[d?.productoId] = {
                productoId: d?.productoId,
                cantidadSolicitada: d?.cantidadSolicitada ?? 0,
                comentario: d?.comentario ?? '',
              };
            }
            setLineas(newLineas);
            toast.success('Pedido anterior copiado como plantilla');
          }
        }
      } catch (err: any) {
        console.error('Error loading data:', err?.message);
        toast.error('Error cargando productos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fromPedido]);

  // Auto-save draft
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    const filledLines = Object.values(lineas ?? {}).filter((l: any) => (l?.cantidadSolicitada ?? 0) > 0);
    if ((filledLines?.length ?? 0) > 0) {
      autoSaveRef.current = setTimeout(() => {
        try {
          localStorage?.setItem?.('pedido-borrador', JSON.stringify({
            lineas, tipoPedido, fechaEntrega, notas,
          }));
        } catch (e: any) {
          // ignore
        }
      }, 2000);
    }
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [lineas, tipoPedido, fechaEntrega, notas]);

  // Load draft on mount
  useEffect(() => {
    if (fromPedido) return;
    try {
      const saved = localStorage?.getItem?.('pedido-borrador');
      if (saved) {
        const data = JSON.parse(saved);
        if (data?.lineas && Object.keys(data.lineas ?? {}).length > 0) {
          setLineas(data.lineas);
          if (data?.tipoPedido) setTipoPedido(data.tipoPedido);
          if (data?.fechaEntrega) setFechaEntrega(data.fechaEntrega);
          if (data?.notas) setNotas(data.notas);
          toast.info('Borrador recuperado automáticamente');
        }
      }
    } catch (e: any) {
      // ignore
    }
  }, [fromPedido]);

  const updateCantidad = useCallback((productoId: number, cantidad: number) => {
    setLineas((prev: any) => {
      const newLineas = { ...(prev ?? {}) };
      if (cantidad <= 0) {
        delete newLineas[productoId];
      } else {
        newLineas[productoId] = {
          productoId,
          cantidadSolicitada: cantidad,
          comentario: newLineas[productoId]?.comentario ?? '',
        };
      }
      return newLineas;
    });
  }, []);

  const useSuggestion = useCallback((productoId: number, value: number) => {
    if (value > 0) updateCantidad(productoId, value);
  }, [updateCantidad]);

  const filteredProducts = (productos ?? []).filter((p: Producto) => {
    const matchSearch = !search || (p?.nombre?.toLowerCase?.()?.includes?.(search?.toLowerCase?.() ?? '') ?? false);
    const matchTab = p?.categoria === activeTab;
    const matchFilled = !showOnlyFilled || (lineas[p?.id]?.cantidadSolicitada ?? 0) > 0;
    return matchSearch && matchTab && matchFilled;
  });

  const totalItems = Object.values(lineas ?? {}).filter((l: any) => (l?.cantidadSolicitada ?? 0) > 0).length;

  const handleSave = async (estado: string) => {
    const isSending = estado === 'enviado';
    if (isSending) setSending(true); else setSaving(true);

    try {
      const detalles = Object.values(lineas ?? {}).filter((l: any) => (l?.cantidadSolicitada ?? 0) > 0);
      if ((detalles?.length ?? 0) === 0) {
        toast.error('Añade al menos un producto');
        return;
      }

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoPedido: tipoPedido || null,
          fechaEntrega: fechaEntrega || null,
          notas: notas || null,
          estado,
          detalles,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ?? 'Error al guardar');
      }

      const pedido = await res.json();

      // If sending, trigger Teams notification
      if (estado === 'enviado') {
        try {
          await fetch(`/api/pedidos/${pedido?.id}/enviar`, { method: 'POST' });
        } catch (e: any) {
          // Notification failure shouldn't block
        }
      }

      try {
        localStorage?.removeItem?.('pedido-borrador');
      } catch (e: any) {}

      toast.success(estado === 'enviado' ? 'Pedido enviado correctamente' : 'Borrador guardado');
      router.replace(`/pedidos/${pedido?.id}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-[1200px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-12 bg-muted rounded" />
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i: number) => <div key={i} className="h-16 bg-muted rounded" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Nuevo Pedido</h1>
            <p className="text-muted-foreground text-sm mt-1">Selecciona los productos y cantidades necesarias</p>
          </div>
          <div className="flex items-center gap-2">
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-sm">
                {totalItems} producto{totalItems !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Order config */}
      <FadeIn delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm"><CalendarDays className="w-3.5 h-3.5" /> Tipo de pedido</Label>
                <select
                  value={tipoPedido}
                  onChange={(e: any) => setTipoPedido(e?.target?.value ?? '')}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_PEDIDO.map((t: any) => (
                    <option key={t?.value} value={t?.value}>{t?.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm"><CalendarDays className="w-3.5 h-3.5" /> Fecha de entrega</Label>
                <Input type="date" value={fechaEntrega} onChange={(e: any) => setFechaEntrega(e?.target?.value ?? '')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Notas</Label>
                <Input placeholder="Notas del pedido..." value={notas} onChange={(e: any) => setNotas(e?.target?.value ?? '')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Search and filter */}
      <FadeIn delay={0.15}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e: any) => setSearch(e?.target?.value ?? '')}
              className="pl-10"
            />
          </div>
          <Button
            variant={showOnlyFilled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowOnlyFilled(!showOnlyFilled)}
            className="gap-1.5 shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            Solo con cantidad ({totalItems})
          </Button>
        </div>
      </FadeIn>

      {/* Product tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {CATEGORIAS.map((cat: string) => {
            const Icon = catIcons[cat] ?? Leaf;
            const catCount = Object.entries(lineas ?? {}).filter(([key]: [string, any]) => {
              const prod = (productos ?? []).find((p: Producto) => p?.id === parseInt(key));
              return prod?.categoria === cat && (lineas[parseInt(key)]?.cantidadSolicitada ?? 0) > 0;
            }).length;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {cat}
                {catCount > 0 && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{catCount}</Badge>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIAS.map((cat: string) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="space-y-2">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No se encontraron productos</p>
              ) : (
                filteredProducts.map((p: Producto) => {
                  const sug = sugerencias[p?.id];
                  const linea = lineas[p?.id];
                  const cantidad = linea?.cantidadSolicitada ?? 0;
                  const isFilled = cantidad > 0;

                  return (
                    <Card
                      key={p?.id}
                      className={cn(
                        'transition-all',
                        isFilled ? 'ring-2 ring-primary/30 bg-primary/5' : 'hover:bg-accent/50'
                      )}
                      style={{ boxShadow: 'var(--shadow-sm)' }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{p?.nombre}</span>
                              {(() => {
                                const tempInfo = getTemporadaInfo(p?.nombre ?? '', p?.mesInicioTemp, p?.mesFinTemp);
                                return (
                                  <Badge variant="outline" className={cn('text-xs gap-0.5', tempInfo.color, tempInfo.bgColor, tempInfo.borderColor)}>
                                    {tempInfo.estado === 'optima' ? '✓' : tempInfo.estado === 'transicion' ? '⚠' : '✗'} {tempInfo.label}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">{p?.unidad}</span>
                              {sug?.promedio ? (
                                <button
                                  type="button"
                                  onClick={() => useSuggestion(p?.id, sug?.promedio)}
                                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                                  title="Usar promedio"
                                >
                                  <TrendingUp className="w-3 h-3" /> Prom: {sug?.promedio}
                                </button>
                              ) : null}
                              {(sug?.ultimosPedidos ?? []).length > 0 ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1" title="Últimos pedidos">
                                  <Copy className="w-3 h-3" />
                                  {(sug.ultimosPedidos ?? []).slice(0, 3).map((up: any, i: number) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => useSuggestion(p?.id, up?.cantidad ?? 0)}
                                      className="text-green-600 hover:text-green-700 hover:underline"
                                      title={up?.fecha ? new Date(up.fecha).toLocaleDateString('es-ES') : ''}
                                    >
                                      {up?.cantidad}{i < Math.min((sug.ultimosPedidos ?? []).length, 3) - 1 ? ',' : ''}
                                    </button>
                                  ))}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCantidad(p?.id, Math.max(0, cantidad - (p?.unidad === 'Kg' ? 0.5 : 1)))}
                              disabled={cantidad <= 0}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              step={p?.unidad === 'Kg' ? '0.5' : '1'}
                              value={cantidad || ''}
                              onChange={(e: any) => {
                                const val = parseFloat(e?.target?.value ?? '0');
                                updateCantidad(p?.id, isNaN(val) ? 0 : val);
                              }}
                              className="w-20 text-center h-8 font-mono"
                              placeholder="0"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCantidad(p?.id, cantidad + (p?.unidad === 'Kg' ? 0.5 : 1))}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <span className="text-xs text-muted-foreground w-12 text-center">{p?.unidad}</span>
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

      {/* Action bar */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4 -mx-4 lg:-mx-8">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {totalItems} producto{totalItems !== 1 ? 's' : ''} seleccionado{totalItems !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('borrador')}
              disabled={saving || sending || totalItems === 0}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </Button>
            <Button
              onClick={() => handleSave('enviado')}
              disabled={saving || sending || totalItems === 0}
              className="gap-1.5"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Enviando...' : 'Enviar pedido'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
