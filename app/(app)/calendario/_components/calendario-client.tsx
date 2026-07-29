'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TIPO_PEDIDO_LABELS_SHORT } from '@/lib/constants';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const tipoLabel = TIPO_PEDIDO_LABELS_SHORT;
const estadoColor: Record<string, string> = {
  borrador: 'bg-amber-500',
  enviado: 'bg-blue-500',
  recibido: 'bg-green-500',
};

export function CalendarioClient() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const res = await fetch('/api/pedidos?limit=200');
        if (res.ok) setPedidos(await res.json());
      } catch (err: any) {
        console.error(err?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPedidos();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const pedidosByDay: Record<number, any[]> = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const p of (pedidos ?? [])) {
      const fecha = new Date(p?.fechaPedido);
      if (fecha.getFullYear() === year && fecha.getMonth() === month) {
        const day = fecha.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    }
    return map;
  }, [pedidos, year, month]);

  const scheduleInfo = [
    { day: 'Lunes', action: 'Realizar pedido', delivery: 'Miércoles', color: 'bg-green-100 text-green-700' },
    { day: 'Miércoles', action: 'Realizar pedido', delivery: 'Viernes', color: 'bg-blue-100 text-blue-700' },
    { day: 'Jueves', action: 'Realizar pedido', delivery: 'Lunes siguiente', color: 'bg-purple-100 text-purple-700' },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" /> Calendario de Pedidos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Planifica y visualiza los pedidos del mes</p>
          </div>
          <Link href="/pedidos/nuevo"><Button className="gap-2"><PlusCircle className="w-4 h-4" /> Nuevo Pedido</Button></Link>
        </div>
      </FadeIn>

      <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Calendario de pedidos semanal:</p>
          <div className="flex flex-wrap gap-3">
            {scheduleInfo.map((s: any) => (
              <Badge key={s?.day} className={`${s?.color} text-xs`}>
                {s?.day}: pedido → entrega {s?.delivery}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
            <CardTitle className="font-display text-lg">{MESES[month]} {year}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {DIAS.map((d: string) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i: number) => (
              <div key={`empty-${i}`} className="h-20" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i: number) => {
              const day = i + 1;
              const dayPedidos = pedidosByDay[day] ?? [];
              const date = new Date(year, month, day);
              const isToday = new Date().toDateString() === date.toDateString();
              const dayOfWeek = date.getDay();
              const isPedidoDay = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4;

              return (
                <div
                  key={day}
                  className={cn(
                    'h-20 rounded-lg p-1.5 border text-xs transition-colors',
                    isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-accent/50',
                    isPedidoDay ? 'bg-green-50/50' : ''
                  )}
                >
                  <div className={cn('font-medium mb-1', isToday ? 'text-primary' : '')}>{day}</div>
                  {dayPedidos.slice(0, 2).map((p: any) => (
                    <Link key={p?.id} href={`/pedidos/${p?.id}`}>
                      <div className={cn('flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 hover:opacity-80 transition-opacity', estadoColor[p?.estado] ?? 'bg-gray-500', 'text-white')}>
                        <span className="truncate text-[10px]">#{p?.id} {tipoLabel[p?.tipoPedido] ?? ''}</span>
                      </div>
                    </Link>
                  ))}
                  {dayPedidos.length > 2 && <span className="text-muted-foreground text-[10px]">+{dayPedidos.length - 2}</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
