'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Package,
  ClipboardList,
  TrendingUp,
  Leaf,
  Apple,
  Salad,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import Image from 'next/image';
import { CATEGORIAS } from '@/lib/constants';

interface Resumen {
  totalProductos: number;
  totalPedidos: number;
  pedidosBorrador: number;
  totalHistorico: number;
  topProductos: { productoId: number; nombre: string; categoria: string; frecuencia: number; promedioKg: number }[];
  consumoMensual: { mes: string; Verduras: number; Frutas: number; Ensaladas: number }[];
}

const categoryImages: Record<string, string> = {
  Verduras: 'https://cdn.abacus.ai/images/a552b01c-ffc0-42e5-beae-7714889e3750.png',
  Frutas: 'https://cdn.abacus.ai/images/8a69aa29-b972-45ea-b88c-f10de0ccfb94.png',
  Ensaladas: 'https://cdn.abacus.ai/images/cff28210-6604-49f2-bc88-9bedadd59f22.png',
};

const categoryIcons: Record<string, any> = {
  Verduras: Leaf,
  Frutas: Apple,
  Ensaladas: Salad,
};

export function DashboardClient() {
  const { data: session } = useSession() || {};
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [pedidosRecientes, setPedidosRecientes] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, pedRes] = await Promise.all([
          fetch('/api/analisis/resumen'),
          fetch('/api/pedidos?limit=5'),
        ]);
        if (resRes.ok) setResumen(await resRes.json());
        if (pedRes.ok) setPedidosRecientes(await pedRes.json());
      } catch (err: any) {
        console.error('Error loading dashboard:', err?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const estadoLabel: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    recibido: 'Recibido',
  };
  const estadoColor: Record<string, string> = {
    borrador: 'bg-amber-100 text-amber-700',
    enviado: 'bg-blue-100 text-blue-700',
    recibido: 'bg-green-100 text-green-700',
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-8">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
              Bienvenido, {(session?.user as any)?.name ?? 'Usuario'}
            </h1>
            <p className="text-muted-foreground mt-1">Gestiona los pedidos de fruta y verdura del equipo</p>
          </div>
          <Link href="/pedidos/nuevo">
            <Button size="lg" className="gap-2">
              <PlusCircle className="w-5 h-5" /> Nuevo Pedido
            </Button>
          </Link>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Productos Activos', value: resumen?.totalProductos ?? 0, icon: Package, color: 'text-green-600 bg-green-50' },
          { label: 'Pedidos Realizados', value: resumen?.totalPedidos ?? 0, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
          { label: 'Borradores', value: resumen?.pedidosBorrador ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Datos Históricos', value: resumen?.totalHistorico ?? 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
        ].map((stat: any, i: number) => {
          const Icon = stat?.icon;
          return (
            <SlideIn key={i} from="bottom" delay={i * 0.1}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }} className="hover:translate-y-[-2px] transition-transform">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat?.color ?? ''}`}>
                    {Icon && <Icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{loading ? '–' : stat?.value}</p>
                    <p className="text-xs text-muted-foreground">{stat?.label}</p>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          );
        })}
      </div>

      <FadeIn delay={0.2}>
        <h2 className="font-display text-lg font-semibold mb-3">Categorías</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CATEGORIAS.map((cat: string) => {
            const Icon = categoryIcons[cat] ?? Leaf;
            return (
              <Link key={cat} href={`/pedidos/nuevo?categoria=${cat}`}>
                <Card className="overflow-hidden group hover:translate-y-[-2px] transition-all cursor-pointer" style={{ boxShadow: 'var(--shadow-md)' }}>
                  <div className="relative h-32 bg-muted">
                    <Image src={categoryImages[cat] ?? ''} alt={`Categoría ${cat}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
                      <Icon className="w-5 h-5" />
                      <span className="font-display font-bold text-lg">{cat}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.3}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display">Pedidos Recientes</CardTitle>
                <Link href="/pedidos"><Button variant="ghost" size="sm" className="gap-1 text-xs">Ver todos <ArrowRight className="w-3 h-3" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (pedidosRecientes ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay pedidos aún</p>
                  <Link href="/pedidos/nuevo"><Button variant="outline" size="sm" className="mt-3 gap-1"><PlusCircle className="w-3 h-3" /> Crear primer pedido</Button></Link>
                </div>
              ) : (pedidosRecientes ?? []).map((p: any) => (
                <Link key={p?.id} href={`/pedidos/${p?.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                    <div>
                      <p className="text-sm font-medium">Pedido #{p?.id}</p>
                      <p className="text-xs text-muted-foreground">{p?.fechaPedido ? new Date(p.fechaPedido).toLocaleDateString('es-ES') : ''} · {(p?.detalles ?? []).length} productos</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[p?.estado] ?? 'bg-gray-100 text-gray-700'}`}>{estadoLabel[p?.estado] ?? p?.estado}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.4}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Productos Más Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (resumen?.topProductos ?? []).slice(0, 7).map((p: any, i: number) => (
                <div key={p?.productoId ?? i} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">{p?.nombre ?? ''}</p>
                      <p className="text-xs text-muted-foreground">{p?.categoria ?? ''}</p>
                    </div>
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
    </div>
  );
}
