'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ConsumoMensualChart({ data }: { data: any[] }) {
  const chartData = (data ?? []).map((d: any) => ({
    ...(d ?? {}),
    mes: d?.mes?.substring?.(5) ?? '',
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
          <XAxis
            dataKey="mes"
            tickLine={false}
            tick={{ fontSize: 10 }}
            label={{ value: 'Mes', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }}
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 10 }}
            label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
          />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Verduras" fill="#72BF78" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Frutas" fill="#FF9149" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Ensaladas" fill="#60B5FF" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
