
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopProductsChartProps {
  data: any[];
}

export default function TopProductsChart({ data }: TopProductsChartProps) {
  const chartData = data.slice(0, 10).map(item => ({
    name: item.product?.name || 'Unknown Product',
    quantity: item._sum.quantity || 0,
    revenue: item._sum.subtotal || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis 
          dataKey="name" 
          type="category"
          width={100}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value, name) => [
            name === 'quantity' ? `${value} sold` : `$${value}`,
            name === 'quantity' ? 'Quantity' : 'Revenue'
          ]}
        />
        <Bar 
          dataKey="quantity" 
          fill="#8B5CF6"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
