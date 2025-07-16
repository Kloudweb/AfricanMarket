
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CustomerAnalyticsChartProps {
  data: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
  };
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B'];

export default function CustomerAnalyticsChart({ data }: CustomerAnalyticsChartProps) {
  const chartData = [
    { name: 'New Customers', value: data.newCustomers },
    { name: 'Returning Customers', value: data.returningCustomers }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value}`, 'Customers']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
