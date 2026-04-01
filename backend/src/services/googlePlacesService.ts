import axios from 'axios';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const BASE = 'https://places.googleapis.com/v1';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.photos',
  'places.reviews',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.regularOpeningHours',
  'places.priceLevel',
].join(',');

export interface GPhoto {
  name: string;
  widthPx: number;
  heightPx: number;
}

export interface GReview {
  relativePublishTimeDescription: string;
  rating: number;
  text?: { text: string; languageCode: string };
  authorAttribution: { displayName: string; uri?: string; photoUri?: string };
  publishTime: string;
}

export interface GPlaceResult {
  id: string;
  displayName?: { text: string };
  photos?: GPhoto[];
  reviews?: GReview[];
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: any;
  priceLevel?: string;
}

export async function searchPlaceByText(query: string): Promise<GPlaceResult | null> {
  if (!API_KEY) {
    console.warn('[GooglePlaces] GOOGLE_PLACES_API_KEY is not configured');
    return null;
  }
  try {
    const { data } = await axios.post(
      `${BASE}/places:searchText`,
      { textQuery: query, languageCode: 'en' },
      {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );
    return (data.places ?? [])[0] ?? null;
  } catch (err: any) {
    console.error('[GooglePlaces] searchPlaceByText error:', err?.response?.data ?? err.message);
    return null;
  }
}

export function buildPhotoFetchUrl(photoName: string, maxWidth = 1200): string {
  return `${BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}
