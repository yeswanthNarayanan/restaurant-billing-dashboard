import { supabase } from './supabase';
import { db, getAllUnsyncedBills, getBillItems, updateBill, getMenuItems, addMenuItem, getBills, getSalesByHour } from './db';

/**
 * Bills are stored locally in IndexedDB only and are NOT synced to Supabase automatically.
 * This function is kept for future manual export functionality if needed.
 */
export async function syncBillsToCloud(billIds?: string[]) {
  try {
    console.log('[v0] Manual bill sync requested - feature available for export');
    return { success: true, synced: 0, message: 'Bills remain local in IndexedDB' };
  } catch (error) {
    console.error('[v0] Error in bill sync:', error);
    return { success: false, synced: 0 };
  }
}

/**
 * Load menu items from cloud (if online)
 * Falls back to local IndexedDB if offline
 */
export async function loadMenuItemsFromCloud() {
  try {
    console.log('[v0] Attempting to load menu items from cloud...');
    
    const { data, error } = await Promise.race([
      supabase.from('menu_items').select('*').order('category'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase request timeout')), 5000)
      ),
    ]) as any;

    if (error) {
      console.warn('[v0] Cloud load failed, using local storage:', error);
      return { success: true, count: 0, source: 'local' };
    }

    // Update local cache with cloud data
    if (data && data.length > 0) {
      // Don't clear - merge with existing to preserve unsaved changes
      for (const item of data) {
        await db.menuItems.put(item);
      }
      console.log('[v0] Menu items loaded from cloud:', data.length);
      return { success: true, count: data.length, source: 'cloud' };
    }

    console.log('[v0] No menu items in cloud, using local storage');
    return { success: true, count: 0, source: 'cloud' };
  } catch (error) {
    console.warn('[v0] Error loading from cloud (will use local):', error instanceof Error ? error.message : error);
    // Silently fall back to local storage
    return { success: true, count: 0, source: 'local' };
  }
}

/**
 * Sync a single menu item to cloud instantly
 * Store locally in IndexedDB always
 */
export async function syncMenuItemToCloud(item: any) {
  try {
    // Always save to local IndexedDB first
    await db.menuItems.put(item);
    console.log('[v0] Menu item saved locally:', item.id);

    // Try to sync to Supabase with timeout
    try {
      console.log('[v0] Syncing to Supabase:', item.id);
      const { data, error } = await Promise.race([
        supabase
          .from('menu_items')
          .upsert([item])
          .select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout')), 3000)
        ),
      ]) as any;

      if (error) {
        console.warn(`[v0] Menu item local only (cloud sync failed) ${item.id}:`, error.message);
        return { success: true, synced: false, local: true };
      }
      
      console.log('[v0] Menu item synced to cloud instantly:', item.id, data);
      return { success: true, synced: true, local: true };
    } catch (cloudError) {
      console.warn(`[v0] Menu item local only (cloud unreachable) ${item.id}:`, cloudError instanceof Error ? cloudError.message : cloudError);
      return { success: true, synced: false, local: true };
    }
  } catch (error) {
    console.error('[v0] Error in menu item sync:', error);
    return { success: false, synced: false };
  }
}

/**
 * Sync all unsaved menu changes when coming online
 */
export async function syncMenuChangesOnReconnect() {
  try {
    const items = await db.menuItems.toArray();
    if (items.length === 0) {
      console.log('[v0] No menu items to sync');
      return { success: true, synced: 0 };
    }

    console.log('[v0] Syncing', items.length, 'menu items...');
    let syncedCount = 0;
    
    for (const item of items) {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .upsert([item])
          .select();

        if (!error) {
          syncedCount++;
          console.log('[v0] Menu item synced on reconnect:', item.id);
        } else {
          console.warn('[v0] Error syncing menu item:', item.id, error);
        }
      } catch (err) {
        console.error(`[v0] Error syncing menu item ${item.id}:`, err);
      }
    }

    console.log('[v0] Synced', syncedCount, 'menu items');
    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error('[v0] Error syncing menu on reconnect:', error);
    return { success: false, synced: 0 };
  }
}

/**
 * Initialize sample menu items if database is empty
 */
export async function initializeSampleMenu() {
  try {
    const existingItems = await getMenuItems();
    
    if (existingItems.length > 0) {
      console.log('[v0] Menu items already exist, skipping initialization');
      return;
    }

    const sampleItems = [
      { id: 'item_biryani', name: 'Biryani', category: 'Rice', price: 250, enabled: true },
      { id: 'item_butter_chicken', name: 'Butter Chicken', category: 'Curries', price: 320, enabled: true },
      { id: 'item_paneer_tikka', name: 'Paneer Tikka', category: 'Appetizers', price: 280, enabled: true },
      { id: 'item_naan', name: 'Naan', category: 'Breads', price: 50, enabled: true },
      { id: 'item_samosa', name: 'Samosa', category: 'Appetizers', price: 40, enabled: true },
      { id: 'item_dosa', name: 'Dosa', category: 'South Indian', price: 120, enabled: true },
      { id: 'item_idli', name: 'Idli', category: 'South Indian', price: 80, enabled: true },
      { id: 'item_lassi', name: 'Lassi', category: 'Beverages', price: 60, enabled: true },
      { id: 'item_chai', name: 'Chai', category: 'Beverages', price: 30, enabled: true },
      { id: 'item_gulab_jamun', name: 'Gulab Jamun', category: 'Desserts', price: 100, enabled: true },
    ];

    console.log('[v0] Initializing sample menu items...');
    for (const item of sampleItems) {
      const menuItem = {
        ...item,
        created_at: new Date().toISOString(),
      };
      await addMenuItem(menuItem);
      // Sync each item to cloud
      await syncMenuItemToCloud(menuItem);
    }

    console.log('[v0] Sample menu items initialized and synced');
  } catch (error) {
    console.error('[v0] Error initializing sample menu:', error);
  }
}

/**
 * Setup online/offline event listeners
 * - When coming online: sync unsaved menu items to cloud
 * - Bills remain local only - no automatic sync
 */
export function setupSyncListener() {
  let syncTimeout: NodeJS.Timeout;

  const handleOnline = async () => {
    console.log('[v0] Online detected, syncing menu changes...');
    await syncMenuChangesOnReconnect();
    await loadMenuItemsFromCloud();
  };

  const handleOffline = () => {
    console.log('[v0] Offline detected - bills and menu items will be saved locally');
  };

  // Only setup listeners if window exists (client-side)
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic menu sync every 5 minutes when online (for menu items only)
    if (navigator.onLine) {
      syncTimeout = setInterval(async () => {
        if (navigator.onLine) {
          console.log('[v0] Running periodic menu sync...');
          await syncMenuChangesOnReconnect();
        }
      }, 5 * 60 * 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncTimeout);
    };
  }

  return () => {};
}

/**
 * MANUAL SYNC: Syncs ALL data from IndexedDB to Supabase
 * This includes: menu items, bills, bill items, and sales data
 * Called when user clicks the "Sync to Supabase" button
 */
export async function manualSyncAllDataToSupabase() {
  try {
    console.log('[v0] Starting manual full sync to Supabase...');
    
    let syncStats = {
      menuItems: 0,
      bills: 0,
      billItems: 0,
      salesData: 0,
      errors: [] as string[],
    };

    // 1. Sync Menu Items
    try {
      console.log('[v0] Syncing menu items...');
      const menuItems = await getMenuItems();
      
      if (menuItems.length > 0) {
        const { error } = await supabase
          .from('menu_items')
          .upsert(menuItems)
          .select();

        if (error) {
          syncStats.errors.push(`Menu items sync failed: ${error.message}`);
          console.error('[v0] Menu items sync error:', error);
        } else {
          syncStats.menuItems = menuItems.length;
          console.log('[v0] Synced', menuItems.length, 'menu items');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncStats.errors.push(`Menu items error: ${msg}`);
      console.error('[v0] Menu items sync error:', err);
    }

    // 2. Sync Bills
    try {
      console.log('[v0] Syncing bills...');
      const bills = await getBills();
      
      if (bills.length > 0) {
        const billsData = bills.map(({ synced, synced_at, ...bill }) => bill);
        const { error } = await supabase
          .from('bills')
          .upsert(billsData)
          .select();

        if (error) {
          syncStats.errors.push(`Bills sync failed: ${error.message}`);
          console.error('[v0] Bills sync error:', error);
        } else {
          syncStats.bills = bills.length;
          console.log('[v0] Synced', bills.length, 'bills');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncStats.errors.push(`Bills error: ${msg}`);
      console.error('[v0] Bills sync error:', err);
    }

    // 3. Sync Bill Items
    try {
      console.log('[v0] Syncing bill items...');
      const allBillItems: any[] = [];
      const bills = await getBills();
      
      for (const bill of bills) {
        const items = await getBillItems(bill.id);
        allBillItems.push(...items);
      }

      if (allBillItems.length > 0) {
        const { error } = await supabase
          .from('bill_items')
          .upsert(allBillItems)
          .select();

        if (error) {
          syncStats.errors.push(`Bill items sync failed: ${error.message}`);
          console.error('[v0] Bill items sync error:', error);
        } else {
          syncStats.billItems = allBillItems.length;
          console.log('[v0] Synced', allBillItems.length, 'bill items');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncStats.errors.push(`Bill items error: ${msg}`);
      console.error('[v0] Bill items sync error:', err);
    }

    // 4. Sync Sales Data
    try {
      console.log('[v0] Syncing sales data...');
      const today = new Date().toISOString().split('T')[0];
      const salesData = await getSalesByHour(today);
      
      if (salesData.length > 0) {
        const { error } = await supabase
          .from('sales_data')
          .upsert(salesData)
          .select();

        if (error) {
          syncStats.errors.push(`Sales data sync failed: ${error.message}`);
          console.error('[v0] Sales data sync error:', error);
        } else {
          syncStats.salesData = salesData.length;
          console.log('[v0] Synced', salesData.length, 'sales records');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncStats.errors.push(`Sales data error: ${msg}`);
      console.error('[v0] Sales data sync error:', err);
    }

    console.log('[v0] Manual sync complete:', syncStats);
    return { success: true, stats: syncStats };
  } catch (error) {
    console.error('[v0] Critical error in manual sync:', error);
    return { 
      success: false, 
      stats: { menuItems: 0, bills: 0, billItems: 0, salesData: 0, errors: ['Critical sync error'] } 
    };
  }
}
