'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Wifi, WifiOff } from 'lucide-react';

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
      {isOnline ? (
        <>
          <Cloud className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Cloud Sync</span>
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Local Save</span>
        </>
      )}
    </div>
  );
}
