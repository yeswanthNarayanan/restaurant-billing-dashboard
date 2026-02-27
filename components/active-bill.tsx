'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, Minus } from 'lucide-react';
import { getBillItems, updateBillItem, deleteBillItem } from '@/lib/db';
import type { BillItem } from '@/lib/supabase';

interface ActiveBillProps {
  billId: string;
  items: BillItem[];
  onItemsChange: (items: BillItem[]) => void;
  onPrint?: () => void;
}

export function ActiveBill({ billId, items, onItemsChange, onPrint }: ActiveBillProps) {
  const [loading, setLoading] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleQuantityChange = async (item: BillItem, change: number) => {
    const newQty = item.quantity + change;
    
    if (newQty <= 0) {
      await deleteBillItem(item.id);
    } else {
      await updateBillItem(item.id, { quantity: newQty });
    }

    const updated = await getBillItems(billId);
    onItemsChange(updated);
  };

  const handleRemoveItem = async (itemId: string) => {
    await deleteBillItem(itemId);
    const updated = await getBillItems(billId);
    onItemsChange(updated);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-slate-50 dark:bg-slate-900">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Active Bill</h2>

      {/* Bill Items List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-center text-sm sm:text-base">No items added yet<br/>Select items from menu to start</p>
          </div>
        ) : (
          items.map(item => (
            <Card key={item.id} className="p-3 sm:p-4 bg-white dark:bg-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                    Item
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">₹{item.price.toFixed(2)}</p>
                </div>

                {/* Quantity Controls & Total - Stacked on mobile, row on desktop */}
                <div className="flex items-center justify-between sm:gap-3 sm:flex-row">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleQuantityChange(item, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.quantity}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleQuantityChange(item, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Item Total */}
                  <div className="text-right min-w-20">
                    <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Total & Action Buttons */}
      <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Grand Total</span>
            <span className="text-2xl font-bold text-emerald-600">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          onClick={onPrint}
          disabled={items.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 sm:h-12 text-sm sm:text-base"
        >
          Print & Complete
        </Button>
      </div>
    </div>
  );
}
