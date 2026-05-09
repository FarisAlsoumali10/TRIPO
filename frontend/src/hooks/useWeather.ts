import { useState, useEffect } from 'react';

interface WeatherData {
  temp: number;
  textAr: string;
  textEn: string;
  emoji: string;
  windSpeed: number;
}

const getWeatherDetails = (code: number) => {
  if (code === 0)                return { ar: 'صافي',        en: 'Clear',        emoji: '☀️' };
  if (code >= 1 && code <= 3)    return { ar: 'غائم جزئياً', en: 'Partly Cloudy', emoji: '⛅' };
  if (code >= 45 && code <= 48)  return { ar: 'ضباب',        en: 'Foggy',        emoji: '🌫️' };
  if (code >= 51 && code <= 67)  return { ar: 'ممطر',        en: 'Rainy',        emoji: '🌧️' };
  if (code >= 71 && code <= 77)  return { ar: 'مثلج',        en: 'Snowy',        emoji: '❄️' };
  if (code >= 80 && code <= 82)  return { ar: 'زخات مطر',   en: 'Showers',      emoji: '🌦️' };
  if (code >= 95)                return { ar: 'عواصف',       en: 'Thunderstorm', emoji: '⛈️' };
  return                                { ar: 'مشمس',        en: 'Sunny',        emoji: '☀️' };
};

// ✅ Module-level cache — يمنع إعادة الـ fetch عند re-renders
const weatherCache = new Map<string, WeatherData>();

export const useWeather = (city: string) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city?.trim()) return;

    // خدّم من الـ cache إذا موجود
    if (weatherCache.has(city)) {
      setWeather(weatherCache.get(city)!);
      return;
    }

    const controller = new AbortController(); // ✅ لإلغاء الطلب إذا unmount قبل انتهائه

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Geocoding
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`,
          { signal: controller.signal }
        );
        const geoData = await geoRes.json();

        if (!geoData.results?.length) {
          setError('City not found');
          return;
        }

        const { latitude, longitude } = geoData.results[0];

        // 2. ✅ Endpoint الحديث بدل current_weather=true
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
          { signal: controller.signal }
        );
        const weatherData = await weatherRes.json();

        // ✅ المتغيرات الجديدة
        const temp      = Math.round(weatherData.current.temperature_2m);
        const code      = weatherData.current.weather_code;
        const windSpeed = Math.round(weatherData.current.wind_speed_10m);
        const details   = getWeatherDetails(code);

        const result: WeatherData = {
          temp,
          textAr: details.ar,
          textEn: details.en,
          emoji: details.emoji,
          windSpeed,
        };

        weatherCache.set(city, result); // ✅ احفظ في الـ cache
        setWeather(result);

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError('Failed to fetch weather');
          console.error('useWeather error:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    return () => controller.abort(); // ✅ Cleanup
  }, [city]);

  return { weather, loading, error };
};
