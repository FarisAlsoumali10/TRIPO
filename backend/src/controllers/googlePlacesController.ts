import { Request, Response } from 'express';
import axios from 'axios';
import { searchPlaceByText, buildPhotoFetchUrl } from '../services/googlePlacesService';

// GET /google-places/details?name=Al+Faisaliah&city=Riyadh
export const getGooglePlaceDetails = async (req: Request, res: Response) => {
  const { name, city } = req.query as { name?: string; city?: string };

  if (!name) {
    return res.status(400).json({ error: 'name query parameter is required' });
  }

  const query = `${name}${city ? ` ${city}` : ''} Saudi Arabia`;
  const place = await searchPlaceByText(query);

  if (!place) {
    // Return empty data rather than 404 so the frontend degrades gracefully
    return res.json({ photos: [], reviews: [], googlePlaceId: null });
  }

  const photos = (place.photos ?? []).slice(0, 10).map(p => ({
    // Served through our own photo proxy so the API key stays on the server
    url: `/api/v1/google-places/photo?name=${encodeURIComponent(p.name)}`,
    width: p.widthPx,
    height: p.heightPx,
  }));

  const reviews = (place.reviews ?? []).map(r => ({
    author: r.authorAttribution.displayName,
    authorPhoto: r.authorAttribution.photoUri ?? null,
    rating: r.rating,
    text: r.text?.text ?? '',
    relativeTime: r.relativePublishTimeDescription,
    publishTime: r.publishTime,
  }));

  return res.json({
    googlePlaceId: place.id,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    photos,
    reviews,
    address: place.formattedAddress,
    website: place.websiteUri,
    phone: place.nationalPhoneNumber,
  });
};

// GET /google-places/photo?name=places/.../photos/...
// Public endpoint — no auth — because <img> tags cannot send JWT headers
export const proxyGooglePhoto = async (req: Request, res: Response) => {
  const { name } = req.query as { name?: string };

  if (!name) {
    return res.status(400).json({ error: 'name query parameter is required' });
  }

  try {
    const googleUrl = buildPhotoFetchUrl(name);
    const upstream = await axios.get(googleUrl, {
      responseType: 'stream',
      timeout: 10000,
      maxRedirects: 5,
    });

    const contentType = upstream.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24 h
    upstream.data.pipe(res);
  } catch {
    res.status(502).json({ error: 'Failed to fetch photo from Google' });
  }
};
