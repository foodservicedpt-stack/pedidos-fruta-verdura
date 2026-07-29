'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

interface TrendPoint {
  semana: string;
  cantidad: number;
  pedidos: number;
}

export default function ProductTrendChart({ data, unidad, promedio }: { data: TrendPoint[]; unidad: string; promedio: number }) {
  const formatted = (data ?? []).map(d => ({
    ...d,
    label: formatWeek(d.semana),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCantidad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value: number) => [`${value} ${unidad}`, 'Cantidad']}
          labelFormatter={(label: string) => `Semana: ${label}`}
        />
        <ReferenceLine y={promedio} stroke="#FF9800" strokeDasharray="5 5" label={{ value: `Promedio: ${promedio}`, position: 'insideTopRight', fontSize: 11, fill: '#FF9800' }} />
        <Area type="monotone" dataKey="cantidad" stroke="#4CAF50" fill="url(#colorCantidad)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function formatWeek(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return dateStr;
  }
}
