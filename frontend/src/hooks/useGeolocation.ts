import { useState, useCallback } from 'react';

interface GeoPosition { lat: number; lng: number; }

export const useGeolocation = () => {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'تم رفض إذن الموقع — فعّله من إعدادات المتصفح 🔒',
          2: 'تعذّر تحديد الموقع',
          3: 'انتهت مهلة تحديد الموقع',
        };
        setError(msgs[err.code] ?? 'خطأ في تحديد الموقع');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  return { position, loading, error, getLocation };
};
