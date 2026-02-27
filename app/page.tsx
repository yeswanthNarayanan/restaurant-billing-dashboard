'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SyncStatus } from '@/components/sync-status';
import { MenuGrid } from '@/components/menu-grid';
import { ActiveBill } from '@/components/active-bill';
import { AdminPanel } from '@/components/admin-panel';
import { Dashboard } from '@/components/dashboard';
import { ReceiptModal } from '@/components/receipt-modal';
import {
  getMenuItems,
  createBill,
  addBillItem,
  getBillItems,
  updateBill,
  updateBillItem,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  recordSale,
  clearBillItems,
  getTodaysSales,
} from '@/lib/db';
import { syncMenuItemToCloud, loadMenuItemsFromCloud, setupSyncListener, initializeSampleMenu } from '@/lib/sync';
import type { MenuItem, BillItem } from '@/lib/supabase';

export default function POSDashboard() {
  const [activeTab, setActiveTab] = useState('billing');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [billTotal, setBillTotal] = useState(0);

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        
        // Initialize sample menu if needed (first run)
        await initializeSampleMenu();
        
        // Load menu items from cloud if online
        if (navigator.onLine) {
          await loadMenuItemsFromCloud();
        }
        
        // Load menu items from local DB
        const items = await getMenuItems();
        setMenuItems(items);
        console.log('[v0] Loaded menu items:', items.length);
        
        // Create a new bill
        const billId = await createBill();
        setCurrentBillId(billId);
        
        // Setup sync listener
        setupSyncListener();
        
        console.log('[v0] POS Dashboard initialized');
      } catch (error) {
        console.error('[v0] Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Reload bill items when bill changes
  useEffect(() => {
    const loadBillItems = async () => {
      if (currentBillId) {
        const items = await getBillItems(currentBillId);
        setBillItems(items);
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setBillTotal(total);
      }
    };

    loadBillItems();
  }, [currentBillId]);

  const handleSelectMenuItem = useCallback(async (item: MenuItem) => {
    if (!currentBillId) return;

    try {
      // Check if item already in bill
      const existingItem = billItems.find(bi => bi.menu_item_id === item.id);
      
      if (existingItem) {
        // Increment quantity
        const newQty = existingItem.quantity + 1;
        await updateBillItem(existingItem.id, { quantity: newQty });
      } else {
        // Add new item
        const billItemId = `bill-item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await addBillItem({
          id: billItemId,
          bill_id: currentBillId,
          menu_item_id: item.id,
          quantity: 1,
          price: item.price,
        });
      }

      // Reload bill items
      const updated = await getBillItems(currentBillId);
      setBillItems(updated);
      const total = updated.reduce((sum, bi) => sum + bi.price * bi.quantity, 0);
      setBillTotal(total);
    } catch (error) {
      console.error('[v0] Error adding item:', error);
    }
  }, [currentBillId, billItems]);

  const handleUpdateBillItem = useCallback(async (items: BillItem[]) => {
    setBillItems(items);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setBillTotal(total);
  }, []);

  const handlePrintAndComplete = useCallback(async () => {
    if (!currentBillId || billItems.length === 0) return;

    try {
      // Update bill
      await updateBill(currentBillId, {
        total: billTotal,
        items_count: billItems.length,
      });

      // Record sale
      await recordSale({
        id: `sale_${Date.now()}`,
        bill_id: currentBillId,
        total: billTotal,
        hour: new Date().getHours(),
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      });

      // Show receipt modal
      setIsReceiptModalOpen(true);
      
      // Bills stay local in IndexedDB only - no cloud sync
      console.log('[v0] Bill completed and stored locally');
    } catch (error) {
      console.error('[v0] Error completing bill:', error);
    }
  }, [currentBillId, billItems, billTotal]);

  const handleReceiptClose = useCallback(async () => {
    setIsReceiptModalOpen(false);
    
    // Clear bill items and create new bill
    if (currentBillId) {
      await clearBillItems(currentBillId);
    }
    
    const newBillId = await createBill();
    setCurrentBillId(newBillId);
    setBillItems([]);
    setBillTotal(0);
  }, [currentBillId]);

  const handleAddMenuItem = async (item: Omit<MenuItem, 'id' | 'created_at'>) => {
    const id = `item_${Date.now()}`;
    const newItem: MenuItem = {
      id,
      ...item,
      created_at: new Date().toISOString(),
    };
    // Add to local DB first
    await addMenuItem(newItem);
    // Sync to cloud if online (instant sync for menu items)
    await syncMenuItemToCloud(newItem);
    const updated = await getMenuItems();
    setMenuItems(updated);
  };

  const handleUpdateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    // Update locally first
    await updateMenuItem(id, updates);
    // Get updated item and sync to cloud if online
    const updated = await getMenuItems();
    const item = updated.find(i => i.id === id);
    if (item) {
      await syncMenuItemToCloud(item);
    }
    setMenuItems(updated);
  };

  const handleDeleteMenuItem = async (id: string) => {
    await deleteMenuItem(id);
    const updated = await getMenuItems();
    setMenuItems(updated);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-emerald-500">Restaurant POS</h1>
          <p className="text-xs text-slate-400">High-Speed Billing Counter</p>
        </div>
        <SyncStatus />
      </header>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-b border-slate-700 rounded-none h-auto p-0">
          <TabsTrigger
            value="billing"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-500 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Billing
          </TabsTrigger>
          <TabsTrigger
            value="admin"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-500 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Admin
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-500 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Billing Tab - Split Screen (responsive) */}
        <TabsContent value="billing" className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Menu Grid - Left Side (Full width on mobile, flex-1 on desktop) */}
          <div className="flex-1 border-b lg:border-b-0 lg:border-r border-slate-700 overflow-hidden">
            <MenuGrid
              items={menuItems}
              onSelectItem={handleSelectMenuItem}
              isLoading={isLoading}
            />
          </div>

          {/* Active Bill - Right Side (Full width on mobile, flex-1 on desktop) */}
          <div className="flex-1 overflow-hidden">
            <ActiveBill
              billId={currentBillId || ''}
              items={billItems}
              onItemsChange={handleUpdateBillItem}
              onPrint={handlePrintAndComplete}
            />
          </div>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin" className="flex-1 overflow-auto">
          <AdminPanel
            items={menuItems}
            onAddItem={handleAddMenuItem}
            onUpdateItem={handleUpdateMenuItem}
            onDeleteItem={handleDeleteMenuItem}
          />
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="flex-1 overflow-auto">
          <Dashboard />
        </TabsContent>
      </Tabs>

      {/* Receipt Modal */}
      {currentBillId && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={handleReceiptClose}
          billId={currentBillId}
          items={billItems}
          total={billTotal}
          createdAt={new Date().toISOString()}
        />
      )}
    </div>
  );
}
