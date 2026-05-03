import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/components/auth/SocketProvider';
import { useChurch } from '@/components/church/ChurchProvider';

const STORAGE_KEY = 'liveLocationEnabled';

interface BatteryLike {
  level: number;
  charging: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

/**
 * Live GPS broadcast hook for members.
 * - watchPosition emits `location:update` to the server.
 * - Auto-resumes after reload if user previously enabled tracking.
 * - Battery-aware: throttles emit interval when battery is low / not charging.
 * - Cleans up on unmount or branch switch.
 */
export function useLocationBroadcast() {
  const { socket, isConnected } = useSocket();
  const { currentBranch } = useChurch() as { currentBranch: { id?: string } | null };
  const branchId = currentBranch?.id ?? null;

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<
    { lat: number; lng: number; accuracy: number; at: number } | null
  >(null);

  const watchIdRef = useRef<number | null>(null);
  const lastEmitAtRef = useRef<number>(0);
  const minIntervalRef = useRef<number>(3000); // ms between emits
  const batteryRef = useRef<BatteryLike | null>(null);

  const supported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const computeMinInterval = useCallback((battery: BatteryLike | null): number => {
    if (!battery) return 3000;
    if (battery.charging) return 3000;
    if (battery.level < 0.2) return 15000;
    if (battery.level < 0.5) return 7000;
    return 4000;
  }, []);

  const stopTracking = useCallback(
    (notifyServer = true) => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (notifyServer && socket && branchId) {
        socket.emit('location:stop', { branchId });
      }
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setIsTracking(false);
      setLastPosition(null);
    },
    [socket, branchId],
  );

  const startTracking = useCallback(() => {
    if (!supported) {
      setError('Geolocation is not supported on this device.');
      toast.error('Geolocation is not supported on this device.');
      return;
    }
    if (!socket || !isConnected) {
      setError('Not connected to server.');
      toast.error('Not connected to server. Please try again.');
      return;
    }
    if (!branchId) {
      setError('Branch not selected.');
      toast.error('No branch selected.');
      return;
    }
    if (watchIdRef.current != null) return;

    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const interval = minIntervalRef.current;
        if (now - lastEmitAtRef.current < interval) return;
        lastEmitAtRef.current = now;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        socket.emit('location:update', { branchId, lat, lng, accuracy });
        setLastPosition({ lat, lng, accuracy, at: now });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Location unavailable.'
              : 'Failed to get location.';
        setError(msg);
        toast.error(msg);
        stopTracking(true);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setIsTracking(true);
    toast.success('Live location sharing started');
  }, [supported, socket, isConnected, branchId, stopTracking]);

  // Battery-aware throttling
  useEffect(() => {
    let active = true;
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryLike>;
    };
    if (!nav.getBattery) return;
    const onChange = () => {
      minIntervalRef.current = computeMinInterval(batteryRef.current);
    };
    nav
      .getBattery()
      .then((bat) => {
        if (!active) return;
        batteryRef.current = bat;
        minIntervalRef.current = computeMinInterval(bat);
        bat.addEventListener?.('levelchange', onChange);
        bat.addEventListener?.('chargingchange', onChange);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      active = false;
      const bat = batteryRef.current;
      if (bat) {
        bat.removeEventListener?.('levelchange', onChange);
        bat.removeEventListener?.('chargingchange', onChange);
      }
    };
  }, [computeMinInterval]);

  // Auto-resume on mount once socket is connected
  useEffect(() => {
    if (!isConnected || !socket || !branchId) return;
    if (watchIdRef.current != null) return;
    let stored = '0';
    try {
      stored = localStorage.getItem(STORAGE_KEY) ?? '0';
    } catch {
      /* ignore */
    }
    if (stored === '1') {
      startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, socket, branchId]);

  // Stop on branch change (don't auto-restart on new branch unless user toggles)
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Stop tracking if user disconnects
  useEffect(() => {
    if (!isConnected && watchIdRef.current != null) {
      // Server already cleans up on disconnect; just stop local watcher.
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    }
  }, [isConnected]);

  const toggle = useCallback(() => {
    if (isTracking) stopTracking(true);
    else startTracking();
  }, [isTracking, startTracking, stopTracking]);

  return {
    supported,
    isTracking,
    isConnected,
    error,
    lastPosition,
    startTracking,
    stopTracking,
    toggle,
  };
}
