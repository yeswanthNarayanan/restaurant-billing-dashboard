'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTodaysSales, getSalesByHour, getBills, getBillItems, getMenuItems } from '@/lib/db';
import { TrendingUp, ShoppingCart, Zap, Receipt } from 'lucide-react';
import type { SalesData, Bill, BillItem, MenuItem } from '@/lib/supabase';

interface BillWithItems extends Bill {
  items: (BillItem & { itemName?: string })[];
  itemCount?: number;
}

export function Dashboard() {
  const [sales, setSales] = useState<SalesData[]>([]);
  const [bills, setBills] = useState<BillWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load sales data
        const today = new Date().toISOString().split('T')[0];
        const salesData = await getSalesByHour(today);
        setSales(salesData);

        // Load menu items
        const items = await getMenuItems();
        setMenuItems(items);

        // Load bills for today
        const allBills = await getBills();
        const itemMap = new Map(items.map(i => [i.id, i.name]));
        
        // Filter bills from today and get their items
        const billsWithItems: BillWithItems[] = [];
        for (const bill of allBills) {
          const billDate = bill.created_at.split('T')[0];
          if (billDate === today) {
            const billItems = await getBillItems(bill.id);
            const itemsWithNames = billItems.map(bi => ({
              ...bi,
              itemName: itemMap.get(bi.menu_item_id) || 'Unknown Item',
            }));
            billsWithItems.push({
              ...bill,
              items: itemsWithNames,
              itemCount: itemsWithNames.length,
            });
          }
        }

        // Sort by most recent first
        billsWithItems.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setBills(billsWithItems);
      } catch (error) {
        console.error('[v0] Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

      {/* Billing Details */}
      <Card className="p-4 sm:p-6 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            Today's Bills
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-slate-500 text-sm">Loading bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No bills completed today</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Bill ID</p>
                    <p className="text-slate-900 dark:text-slate-100 font-mono break-all">{bill.id.substring(0, 12)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Items</p>
                    <p className="text-slate-900 dark:text-slate-100 font-semibold">
                      {bill.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Amount</p>
                    <p className="text-emerald-600 font-bold">₹{bill.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Time</p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {new Date(bill.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>

                {/* Bill Items */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2">
                  {bill.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex-1">
                        <p className="text-slate-900 dark:text-slate-100">{item.itemName}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-slate-600 dark:text-slate-400">
                          {item.quantity}x ₹{item.price.toFixed(2)}
                        </span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold">
                          ₹{(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
