import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 inset-x-4 z-50 flex items-center justify-center gap-2 rounded-xl bg-amber-600/95 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md border border-amber-400/40 animate-bounce">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Sin conexión a internet. Se requiere conexión para traducir.</span>
    </div>
  );
};
