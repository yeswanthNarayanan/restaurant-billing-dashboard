'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { manualSyncAllDataToSupabase } from '@/lib/sync';

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncMessage('Syncing...');

    try {
      const result = await manualSyncAllDataToSupabase();

      if (result.success) {
        const { menuItems, bills, billItems, salesData, errors } = result.stats;
        const summary = `✓ Synced: ${menuItems} items, ${bills} bills, ${billItems} line items, ${salesData} sales`;
        setSyncMessage(summary);
        console.log('[v0] Sync successful:', result.stats);
      } else {
        setSyncMessage('✗ Sync failed - check console');
        console.error('[v0] Sync failed:', result.stats);
      }

      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(''), 5000);
    } catch (error) {
      setSyncMessage('✗ Sync error - offline?');
      console.error('[v0] Sync error:', error);
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Online
            </span>
          </>
        ) : (
          <>
            <CloudOff className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Offline
            </span>
          </>
        )}
      </div>

      {/* Manual Sync Button */}
      <Button
        onClick={handleManualSync}
        disabled={isSyncing || !isOnline}
        size="sm"
        className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="w-3 h-3" />
        {isSyncing ? 'Syncing...' : 'Sync All'}
      </Button>

      {/* Sync Message */}
      {syncMessage && (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {syncMessage}
        </span>
      )}
    </div>
  );
}
