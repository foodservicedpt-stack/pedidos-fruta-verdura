'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { History, Search, Filter, TrendingUp, Calendar } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';

export function HistorialClient() {
  const [historicos, setHistoricos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoria) params.set('categoria', categoria);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await fetch(`/api/historico?${params.toString()}`);
      if (res.ok) setHistoricos(await res.json());
    } catch (err: any) {
      console.error(err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoria, desde, hasta]);

  // Group by product
  const grouped: Record<string, { nombre: string; categoria: string; unidad: string; registros: { fecha: string; cantidad: number }[] }> = {};
  for (const h of (historicos ?? [])) {
    const key = h?.producto?.nombre ?? 'Desconocido';
    if (!grouped[key]) {
      grouped[key] = {
        nombre: key,
        categoria: h?.producto?.categoria ?? '',
        unidad: h?.producto?.unidad ?? '',
        registros: [],
      };
    }
    grouped[key].registros.push({ fecha: h?.fecha, cantidad: h?.cantidad ?? 0 });
  }

  const filteredProducts = Object.values(grouped ?? {}).filter((g: any) =>
    !search || (g?.nombre?.toLowerCase?.()?.includes?.(search?.toLowerCase?.() ?? '') ?? false)
  );

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-primary" /> Historial de Pedidos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Consulta el histórico de cantidades pedidas por producto</p>
        </div>
      </FadeIn>

      <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar producto..." value={search} onChange={(e: any) => setSearch(e?.target?.value ?? '')} className="pl-10" />
            </div>
            <select value={categoria} onChange={(e: any) => setCategoria(e?.target?.value ?? '')} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">Todas las categorías</option>
              <option value="Verduras">Verduras</option>
              <option value="Frutas">Frutas</option>
              <option value="Ensaladas">Ensaladas</option>
            </select>
            <Input type="date" value={desde} onChange={(e: any) => setDesde(e?.target?.value ?? '')} placeholder="Desde" />
            <Input type="date" value={hasta} onChange={(e: any) => setHasta(e?.target?.value ?? '')} placeholder="Hasta" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i: number) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : filteredProducts.length === 0 ? (
          <Card className="text-center py-12" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent>
              <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay datos históricos con estos filtros</p>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((g: any) => {
            const avg = (g?.registros ?? []).reduce((sum: number, r: any) => sum + (r?.cantidad ?? 0), 0) / Math.max((g?.registros ?? []).length, 1);
            const last = (g?.registros ?? []).sort((a: any, b: any) => new Date(b?.fecha ?? 0).getTime() - new Date(a?.fecha ?? 0).getTime())?.[0];
            return (
              <Card key={g?.nombre} style={{ boxShadow: 'var(--shadow-sm)' }} className="hover:translate-y-[-1px] transition-transform">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{g?.nombre}</span>
                        <Badge variant="outline" className="text-xs">{g?.categoria}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{(g?.registros ?? []).length} registros</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Promedio</p>
                        <p className="text-sm font-mono">{Math.round(avg * 10) / 10} {g?.unidad}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Último</p>
                        <p className="text-sm font-mono">{last?.cantidad ?? 0} {g?.unidad}</p>
                        <p className="text-xs text-muted-foreground">{last?.fecha ? new Date(last.fecha).toLocaleDateString('es-ES') : ''}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
