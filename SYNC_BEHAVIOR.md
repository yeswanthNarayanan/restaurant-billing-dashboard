# POS System - Offline/Online Sync Behavior

## Overview
The Restaurant POS system implements a dual-storage strategy for seamless operation both online and offline:

### Menu Items (Admin Operations)
**Storage**: IndexedDB (Primary) + Supabase (Cloud)

- **When Adding/Updating Items in Admin Tab**:
  - ✅ Always saved to **local IndexedDB** immediately
  - ✅ If **online**: Instantly synced to **Supabase** (no delay)
  - ⏳ If **offline**: Saved locally, will sync when connection returns
  - When coming back online: Automatic sync of any unsaved menu changes

- **When Loading Menu**:
  - Loads from **local IndexedDB** first (instant)
  - If online: Also pulls latest from **Supabase** and updates local cache
  - Merges cloud data with local data (preserves unsaved changes)

### Bills & Sales Orders
**Storage**: IndexedDB Only (No Cloud Sync)

- **When Creating/Completing Bills**:
  - ✅ Always saved to **local IndexedDB** immediately
  - ✅ Remains **local only** - no automatic Supabase sync
  - Works seamlessly offline with full functionality
  - No network dependency for billing operations

- **Sales Data**:
  - Recorded in **local IndexedDB** in real-time
  - Dashboard/analytics use local data
  - Bills are available for manual export if needed in future

## Network Status Indicators

The SyncStatus component shows:
- **Online - Menu Synced** (Cloud icon, green): Connected to internet, menu items syncing to cloud
- **Offline - Saving Locally** (Cloud-off icon, amber): No internet, all data stored locally

## Benefits

1. **Menu Management**: Cloud backup for restaurant data without network dependency
2. **Billing**: Fast, reliable billing with zero network latency
3. **Offline-First**: Complete functionality without internet
4. **Data Safety**: Critical bill data always stored locally
5. **Flexibility**: Bills can be exported/synced manually when needed

## Technical Implementation

- **Sync Functions** (`lib/sync.ts`):
  - `syncMenuItemToCloud()`: Instant sync for menu changes when online
  - `loadMenuItemsFromCloud()`: Pulls latest menu from cloud with local fallback
  - `setupSyncListener()`: Handles online/offline events and periodic syncs

- **Database Functions** (`lib/db.ts`):
  - Uses Dexie.js for IndexedDB management
  - Full CRUD operations for menu items and bills
  - Automatic conflict resolution favoring local changes
