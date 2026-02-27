import Dexie from 'dexie';
import type { MenuItem, Bill, BillItem, SalesData } from './supabase';

export class POSDatabase extends Dexie {
  menuItems!: Dexie.Table<MenuItem, string>;
  bills!: Dexie.Table<Bill, string>;
  billItems!: Dexie.Table<BillItem, string>;
  salesData!: Dexie.Table<SalesData, string>;

  constructor() {
    super('POSDatabase');
    this.version(1).stores({
      menuItems: 'id, category, enabled',
      bills: 'id, created_at, synced',
      billItems: 'id, bill_id, menu_item_id',
      salesData: 'id, bill_id, date, hour',
    });
  }
}

export const db = new POSDatabase();

// Menu Items Operations
export async function getMenuItems() {
  return db.menuItems.toArray();
}

export async function getMenuItemsByCategory(category: string) {
  return db.menuItems.where('category').equals(category).toArray();
}

export async function addMenuItem(item: MenuItem) {
  return db.menuItems.add(item);
}

export async function updateMenuItem(id: string, updates: Partial<MenuItem>) {
  return db.menuItems.update(id, updates);
}

export async function deleteMenuItem(id: string) {
  return db.menuItems.delete(id);
}

// Bills Operations
export async function createBill(): Promise<string> {
  const billId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.bills.add({
    id: billId,
    total: 0,
    items_count: 0,
    created_at: new Date().toISOString(),
    synced: false,
  });
  return billId;
}

export async function getBill(billId: string) {
  return db.bills.get(billId);
}

export async function updateBill(billId: string, updates: Partial<Bill>) {
  return db.bills.update(billId, updates);
}

export async function getAllUnsyncedBills() {
  return db.bills.where('synced').equals(false).toArray();
}

export async function getUnsyncedBills() {
  return db.bills.where('synced').equals(false).toArray();
}

// Bill Items Operations
export async function addBillItem(item: BillItem) {
  return db.billItems.add(item);
}

export async function getBillItems(billId: string) {
  return db.billItems.where('bill_id').equals(billId).toArray();
}

export async function updateBillItem(id: string, updates: Partial<BillItem>) {
  return db.billItems.update(id, updates);
}

export async function deleteBillItem(id: string) {
  return db.billItems.delete(id);
}

export async function clearBillItems(billId: string) {
  return db.billItems.where('bill_id').equals(billId).delete();
}

// Sales Data Operations
export async function recordSale(sale: SalesData) {
  return db.salesData.add(sale);
}

export async function getTodaysSales() {
  const today = new Date().toISOString().split('T')[0];
  return db.salesData.where('date').equals(today).toArray();
}

export async function getSalesByHour(date: string) {
  return db.salesData.where('date').equals(date).toArray();
}

export async function markBillsSynced(billIds: string[]) {
  const now = new Date().toISOString();
  for (const id of billIds) {
    await db.bills.update(id, { synced: true, synced_at: now });
  }
}
