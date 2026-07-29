'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Search, Leaf, Apple, Salad, ArrowLeft } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import { cn } from '@/lib/utils';
import { CATEGORIAS } from '@/lib/constants';

const ProductTrendChart = dynamic(() => import('./product-trend-chart'), { ssr: false, loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" /> });

interface ProductoStats {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  stats: {
    promedio: number;
    totalPedidos: number;
    totalCantidad: number;
    ultimaFecha: string | null;
    primeraFecha: string | null;
  };
}

interface ProductTrend {
  trend: { semana: string; cantidad: number; pedidos: number }[];
  promedio: number;
  totalRegistros: number;
  totalCantidad: number;
}

const catIcons: Record<string, any> = { Verduras: Leaf, Frutas: Apple, Ensaladas: Salad };

export function AnalisisClient() {
  const [productos, setProductos] = useState<ProductoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Verduras');
  const [selectedProduct, setSelectedProduct] = useState<ProductoStats | null>(null);
  const [trendData, setTrendData] = useState<ProductTrend | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analisis/producto');
        if (res.ok) setProductos(await res.json());
      } catch (err: any) {
        console.error(err?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectProduct = async (p: ProductoStats) => {
    setSelectedProduct(p);
    setLoadingTrend(true);
    try {
      const res = await fetch(`/api/analisis/producto?productoId=${p.id}`);
      if (res.ok) setTrendData(await res.json());
    } catch (err: any) {
      console.error(err?.message);
    } finally {
      setLoadingTrend(false);
    }
  };

  const filtered = (productos ?? []).filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase());
    const matchTab = p.categoria === activeTab;
    return matchSearch && matchTab;
  });

  // Detail view for selected product
  if (selectedProduct) {
    return (
      <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
        <FadeIn>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(null); setTrendData(null); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" /> {selectedProduct.nombre}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {selectedProduct.categoria} · {selectedProduct.unidad}
              </p>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Promedio por pedido', value: `${trendData?.promedio ?? selectedProduct.stats.promedio} ${selectedProduct.unidad}` },
            { label: 'Total registros', value: trendData?.totalRegistros ?? selectedProduct.stats.totalPedidos },
            { label: 'Total consumido', value: `${trendData?.totalCantidad ?? selectedProduct.stats.totalCantidad} ${selectedProduct.unidad}` },
            { label: 'Último pedido', value: selectedProduct.stats.ultimaFecha ? new Date(selectedProduct.stats.ultimaFecha).toLocaleDateString('es-ES') : 'Sin datos' },
          ].map((s, i) => (
            <Card key={i} style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <FadeIn delay={0.1}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Tendencia de consumo semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTrend ? (
                <div className="h-64 bg-muted rounded-lg animate-pulse" />
              ) : trendData?.trend && trendData.trend.length > 0 ? (
                <ProductTrendChart data={trendData.trend} unidad={selectedProduct.unidad} promedio={trendData.promedio} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No hay datos históricos para este producto</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Análisis de Consumo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Selecciona un producto para ver su tendencia de consumo</p>
        </div>
      </FadeIn>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {CATEGORIAS.map(cat => {
            const Icon = catIcons[cat] ?? Leaf;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                <Icon className="w-3.5 h-3.5" /> {cat}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIAS.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No se encontraron productos</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(p => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:bg-accent/50 transition-all"
                    style={{ boxShadow: 'var(--shadow-sm)' }}
                    onClick={() => selectProduct(p)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.unidad}</p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">Promedio</p>
                            <p className="text-sm font-mono font-medium">{p.stats.promedio} {p.unidad}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pedidos</p>
                            <p className="text-sm font-mono font-medium">{p.stats.totalPedidos}</p>
                          </div>
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
