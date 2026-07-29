'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  ClipboardList,
  Calendar,
  User,
  Trash2,
  Eye,
  Copy,
  Filter,
} from 'lucide-react';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { TIPO_PEDIDO_LABELS_SHORT } from '@/lib/constants';

const estadoLabel: Record<string, string> = { borrador: 'Borrador', enviado: 'Enviado', recibido: 'Recibido' };
const estadoColor: Record<string, string> = {
  borrador: 'bg-amber-100 text-amber-700',
  enviado: 'bg-blue-100 text-blue-700',
  recibido: 'bg-green-100 text-green-700',
};
const tipoLabel = TIPO_PEDIDO_LABELS_SHORT;

export function PedidosListClient() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');

  const loadPedidos = async () => {
    try {
      const url = filtroEstado ? `/api/pedidos?estado=${filtroEstado}` : '/api/pedidos';
      const res = await fetch(url);
      if (res.ok) setPedidos(await res.json());
    } catch (err: any) {
      console.error(err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPedidos();
  }, [filtroEstado]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPedidos((prev: any[]) => (prev ?? []).filter((p: any) => p?.id !== id));
        toast.success('Pedido eliminado');
      }
    } catch (err: any) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground text-sm mt-1">Todos los pedidos realizados</p>
          </div>
          <Link href="/pedidos/nuevo">
            <Button className="gap-2"><PlusCircle className="w-4 h-4" /> Nuevo Pedido</Button>
          </Link>
        </div>
      </FadeIn>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {['', 'borrador', 'enviado', 'recibido'].map((est: string) => (
          <Button
            key={est}
            variant={filtroEstado === est ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroEstado(est)}
            className="text-xs"
          >
            {est === '' ? 'Todos' : estadoLabel[est] ?? est}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i: number) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : (pedidos ?? []).length === 0 ? (
          <Card className="text-center py-12" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent>
              <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">No hay pedidos</p>
              <Link href="/pedidos/nuevo"><Button className="gap-2"><PlusCircle className="w-4 h-4" /> Crear pedido</Button></Link>
            </CardContent>
          </Card>
        ) : (
          (pedidos ?? []).map((p: any, i: number) => (
            <SlideIn key={p?.id ?? i} from="bottom" delay={i * 0.05}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }} className="hover:translate-y-[-1px] transition-transform">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Pedido #{p?.id}</span>
                        <Badge className={estadoColor[p?.estado] ?? 'bg-gray-100 text-gray-700'}>
                          {estadoLabel[p?.estado] ?? p?.estado}
                        </Badge>
                        {p?.tipoPedido && (
                          <Badge variant="outline" className="text-xs">
                            {tipoLabel[p?.tipoPedido] ?? p?.tipoPedido}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p?.fechaPedido ? new Date(p.fechaPedido).toLocaleDateString('es-ES') : ''}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{p?.user?.name ?? 'Usuario'}</span>
                        <span>{(p?.detalles ?? []).length} productos</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/pedidos/${p?.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                      </Link>
                      <Link href={`/pedidos/nuevo?copiar=${p?.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Copy className="w-4 h-4" /></Button>
                      </Link>
                      {(p?.estado === 'borrador' || p?.estado === 'enviado' || p?.estado === 'recibido') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p?.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          ))
        )}
      </div>
    </div>
  );
}
