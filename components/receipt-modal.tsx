'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import type { BillItem } from '@/lib/supabase';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  billId: string;
  items: BillItem[];
  total: number;
  createdAt: string;
}

export function ReceiptModal({
  isOpen,
  onClose,
  billId,
  items,
  total,
  createdAt,
}: ReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const billDate = new Date(createdAt);
  const formattedDate = billDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = billDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 bg-white dark:bg-slate-800 w-full sm:w-auto">
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Receipt Header */}
          <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">RECEIPT</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Restaurant POS System</p>
          </div>

          {/* Bill Info */}
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Bill No:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{billId}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formattedTime}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-y border-slate-200 dark:border-slate-700 py-3">
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Item {idx + 1}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">TOTAL AMOUNT</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">₹{total.toFixed(2)}</p>
          </div>

          {/* Footer */}
          <div className="text-center border-t border-slate-200 dark:border-slate-700 pt-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Thank you for your purchase!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visit again soon</p>
          </div>

          {/* Hidden print styles */}
          <style>{`
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .print\\:hidden {
                display: none !important;
              }
              .print\\:max-h-none {
                max-height: none !important;
              }
              .print\\:overflow-visible {
                overflow: visible !important;
              }
            }
          `}</style>
        </div>

        {/* Actions (hidden on print) */}
        <div className="flex gap-2 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 print:hidden flex-col sm:flex-row">
          <Button
            onClick={handlePrint}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base h-10 sm:h-auto"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 text-sm sm:text-base h-10 sm:h-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
