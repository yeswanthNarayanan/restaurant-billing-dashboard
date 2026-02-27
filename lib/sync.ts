import { supabase } from './supabase';
import { db, getAllUnsyncedBills, getBillItems, updateBill } from './db';

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
      const result = await Promise.race([
        supabase.from('menu_items').upsert(item, { onConflict: 'id' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout')), 3000)
        ),
      ]) as any;

      if (result.error) {
        console.warn(`[v0] Menu item local only (cloud sync failed) ${item.id}:`, result.error.message);
        return { success: true, synced: false, local: true };
      }
      
      console.log('[v0] Menu item synced to cloud instantly:', item.id);
      return { success: true, synced: true, local: true };
    } catch (cloudError) {
      console.warn(`[v0] Menu item local only (cloud unreachable) ${item.id}`);
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
    if (!navigator.onLine) return { success: false, synced: 0 };

    const items = await db.menuItems.toArray();
    let syncedCount = 0;
    
    for (const item of items) {
      try {
        const { error } = await supabase
          .from('menu_items')
          .upsert(item, { onConflict: 'id' });

        if (!error) {
          syncedCount++;
          console.log('[v0] Menu item synced on reconnect:', item.id);
        }
      } catch (err) {
        console.error(`[v0] Error syncing menu item ${item.id}:`, err);
      }
    }

    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error('[v0] Error syncing menu on reconnect:', error);
    return { success: false, synced: 0 };
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
