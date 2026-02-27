import { supabase } from './supabase';
import { db, getAllUnsyncedBills, getBillItems, updateBill } from './db';

export async function syncBillsToCloud() {
  try {
    const unsyncedBills = await getAllUnsyncedBills();
    
    for (const bill of unsyncedBills) {
      try {
        const billItems = await getBillItems(bill.id);
        
        // Insert bill to Supabase
        const { error: billError } = await supabase
          .from('bills')
          .insert({
            id: bill.id,
            total: bill.total,
            items_count: bill.items_count,
            created_at: bill.created_at,
          });

        if (billError) {
          console.error('Error syncing bill:', billError);
          continue;
        }

        // Insert bill items to Supabase
        if (billItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(
              billItems.map(item => ({
                id: item.id,
                bill_id: item.bill_id,
                menu_item_id: item.menu_item_id,
                quantity: item.quantity,
                price: item.price,
              }))
            );

          if (itemsError) {
            console.error('Error syncing bill items:', itemsError);
            continue;
          }
        }

        // Record sales data
        const hour = new Date(bill.created_at).getHours();
        const date = bill.created_at.split('T')[0];
        
        const { error: salesError } = await supabase
          .from('sales_data')
          .insert({
            bill_id: bill.id,
            total: bill.total,
            hour,
            date,
          });

        if (salesError) {
          console.error('Error recording sales:', salesError);
          continue;
        }

        // Mark bill as synced
        await updateBill(bill.id, {
          synced: true,
          synced_at: new Date().toISOString(),
        });

        console.log(`[v0] Bill ${bill.id} synced successfully`);
      } catch (error) {
        console.error(`[v0] Error syncing bill ${bill.id}:`, error);
      }
    }

    return { success: true, synced: unsyncedBills.length };
  } catch (error) {
    console.error('[v0] Sync error:', error);
    return { success: false, synced: 0 };
  }
}

export async function loadMenuItemsFromCloud() {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category');

    if (error) throw error;

    // Clear existing items and load from cloud
    await db.menuItems.clear();
    if (data && data.length > 0) {
      await db.menuItems.bulkAdd(data);
      console.log('[v0] Menu items loaded from cloud');
    }

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('[v0] Error loading menu items:', error);
    return { success: false, count: 0 };
  }
}

export async function syncMenuChanges() {
  try {
    const items = await db.menuItems.toArray();
    
    for (const item of items) {
      const { error } = await supabase
        .from('menu_items')
        .upsert(item, { onConflict: 'id' });

      if (error) {
        console.error(`[v0] Error syncing menu item ${item.id}:`, error);
      }
    }

    return { success: true, synced: items.length };
  } catch (error) {
    console.error('[v0] Error in menu sync:', error);
    return { success: false, synced: 0 };
  }
}

export function setupSyncListener() {
  let syncTimeout: NodeJS.Timeout;

  const handleOnline = async () => {
    console.log('[v0] Online detected, starting sync...');
    await syncBillsToCloud();
    await syncMenuChanges();
    await loadMenuItemsFromCloud();
  };

  const handleOffline = () => {
    console.log('[v0] Offline detected');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Periodic sync attempt every 5 minutes when online
  if (navigator.onLine) {
    syncTimeout = setInterval(async () => {
      if (navigator.onLine) {
        console.log('[v0] Running periodic sync...');
        await syncBillsToCloud();
      }
    }, 5 * 60 * 1000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(syncTimeout);
  };
}
