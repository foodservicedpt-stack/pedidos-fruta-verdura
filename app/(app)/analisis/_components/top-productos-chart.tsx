'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TopProductosChart({ data }: { data: any[] }) {
  const chartData = (data ?? []).map((d: any) => ({
    nombre: (d?.nombre ?? '').length > 12 ? (d?.nombre ?? '').substring(0, 12) + '...' : (d?.nombre ?? ''),
    fullName: d?.nombre ?? '',
    frecuencia: d?.frecuencia ?? 0,
    promedio: d?.promedioKg ?? 0,
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <XAxis
            type="number"
            tickLine={false}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tickLine={false}
            tick={{ fontSize: 10 }}
            width={100}
          />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(value: any, name: any) => [value, name === 'frecuencia' ? 'Pedidos' : 'Promedio']} />
          <Bar dataKey="frecuencia" fill="#72BF78" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
