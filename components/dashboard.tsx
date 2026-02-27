'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTodaysSales, getSalesByHour } from '@/lib/db';
import { TrendingUp, ShoppingCart, Zap } from 'lucide-react';
import type { SalesData } from '@/lib/supabase';

export function Dashboard() {
  const [sales, setSales] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSales = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await getSalesByHour(today);
      setSales(data);
      setLoading(false);
    };

    loadSales();
  }, []);

  const { totalSales, mostSoldHour, ordersCount, chartData } = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    const orders = sales.length;
    
    // Group by hour
    const hourGroups: Record<number, { total: number; count: number }> = {};
    sales.forEach(s => {
      if (!hourGroups[s.hour]) {
        hourGroups[s.hour] = { total: 0, count: 0 };
      }
      hourGroups[s.hour].total += s.total;
      hourGroups[s.hour].count += 1;
    });

    const chartData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      sales: hourGroups[i]?.total || 0,
      orders: hourGroups[i]?.count || 0,
    }));

    const mostSold = Object.entries(hourGroups).sort((a, b) => b[1].total - a[1].total)[0];

    return {
      totalSales: total,
      mostSoldHour: mostSold ? `${mostSold[0].toString().padStart(2, '0')}:00` : 'N/A',
      ordersCount: orders,
      chartData,
    };
  }, [sales]);

  const kpis = [
    {
      title: 'Total Sales Today',
      value: `₹${totalSales.toFixed(2)}`,
      icon: TrendingUp,
      color: 'emerald',
    },
    {
      title: 'Orders Count',
      value: ordersCount.toString(),
      icon: ShoppingCart,
      color: 'emerald',
    },
    {
      title: 'Peak Hour',
      value: mostSoldHour,
      icon: Zap,
      color: 'emerald',
    },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="p-4 sm:p-6 bg-white dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">{kpi.title}</p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 line-clamp-1">
                    {kpi.value}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex-shrink-0`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-emerald-600`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card className="p-4 sm:p-6 bg-white dark:bg-slate-800">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Sales by Hour
        </h3>
        {loading ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <p className="text-slate-500 text-sm">Loading sales data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250} minHeight={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                interval={2}
              />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(value: any) => `₹${value.toFixed(2)}`}
              />
              <Bar dataKey="sales" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
