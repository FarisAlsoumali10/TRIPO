import { Request, Response } from 'express';

interface CacheItem { url: string; expiry: number; }

const photoCache = new Map<string, CacheItem>();
const CACHE_TTL              = 20 * 60 * 1000; // 20 دقيقة (لأن روابط جوجل تنتهي صلاحيتها)
const CACHE_CLEANUP_INTERVAL =      60 * 60 * 1000;     // كل ساعة
const FALLBACK_IMAGE         = '/images/diriyah.jpg'; // Using a local asset as fallback

// تنظيف دوري للـ Cache
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of photoCache.entries()) {
    if (item.expiry <= now) photoCache.delete(key);
  }
}, CACHE_CLEANUP_INTERVAL);

export const getPlacePhoto = async (req: Request, res: Response) => {
  const placeName = (req.query.place as string)?.trim();

  if (!placeName) {
    return res.status(400).json({ error: 'اسم المكان مطلوب' });
  }

  const cacheKey = placeName.toLowerCase();

  try {
    // ── 1. Cache Hit → O(1) ───────────────────────────────────────────────
    const cached = photoCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      res.setHeader('X-Cache', 'HIT');
      return res.redirect(302, cached.url);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY غير معرّف في .env');

    // ── 2. New Places API (Text Search) ──────────────────────────────────
    const searchRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-Goog-Api-Key':  apiKey,
          'X-Goog-FieldMask': 'places.photos',
        },
        body: JSON.stringify({ textQuery: placeName, maxResultCount: 1 }),
      }
    );

    if (!searchRes.ok) throw new Error(`Google Places API: ${searchRes.status}`);

    const searchData = (await searchRes.json()) as any;
    const photoName  = searchData.places?.[0]?.photos?.[0]?.name;

    if (!photoName) {
      return res.redirect(302, FALLBACK_IMAGE);
    }

    // ── 3. جلب الـ Redirect URL بدون تحميل الصورة ────────────────────────
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${apiKey}`,
      { redirect: 'manual' }
    );

    const finalImageUrl = photoRes.headers.get('location');

    if (!finalImageUrl) {
      return res.redirect(302, FALLBACK_IMAGE);
    }

    // ── 4. Cache Miss → تخزين ────────────────────────────────────────────
    photoCache.set(cacheKey, { url: finalImageUrl, expiry: Date.now() + CACHE_TTL });

    res.setHeader('X-Cache', 'MISS');
    return res.redirect(302, finalImageUrl);

  } catch (error) {
    console.error(`[PhotoProxy] خطأ في "${placeName}":`, error);
    return res.redirect(302, FALLBACK_IMAGE); // لا crash — دائماً يرجع صورة
  }
};
