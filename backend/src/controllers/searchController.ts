import { Request, Response } from 'express';
import { Tour } from '../models/Tour';
import { Rental } from '../models/Rental';
import { Place } from '../models/Place';
import { Itinerary } from '../models/Itinerary';

// GET /api/v1/search?q=...&types=place,tour,rental,itinerary&limit=10
export const globalSearch = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
    }

    const typesParam = req.query.types as string;
    const types = typesParam
      ? typesParam.split(',').map(t => t.trim())
      : ['place', 'tour', 'rental', 'itinerary'];

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);
    const regex = new RegExp(q, 'i');

    const searches: Promise<any[]>[] = [];

    if (types.includes('place')) {
      searches.push(
        Place.find({ $or: [{ name: regex }, { city: regex }, { description: regex }] })
          .select('name city description photos categoryTags _id')
          .limit(limit)
          .lean()
          .then(docs => docs.map(d => ({ ...d, resultType: 'place', title: d.name, subtitle: d.city, image: d.photos?.[0] })))
      );
    }

    if (types.includes('tour')) {
      searches.push(
        Tour.find({ status: 'active', $or: [{ title: regex }, { description: regex }, { departureLocation: regex }] })
          .select('title description departureLocation heroImage category pricePerPerson _id')
          .limit(limit)
          .lean()
          .then(docs => docs.map(d => ({ ...d, resultType: 'tour', subtitle: (d as any).departureLocation })))
      );
    }

    if (types.includes('rental')) {
      searches.push(
        Rental.find({ active: { $ne: false }, $or: [{ title: regex }, { description: regex }, { city: regex }] })
          .select('title description city images type price _id')
          .limit(limit)
          .lean()
          .then(docs => docs.map(d => ({ ...d, resultType: 'rental', image: d.images?.[0], subtitle: d.city })))
      );
    }

    if (types.includes('itinerary')) {
      searches.push(
        Itinerary.find({ $or: [{ title: regex }, { city: regex }] })
          .select('title city estimatedCost estimatedDuration _id')
          .limit(limit)
          .lean()
          .then(docs => docs.map(d => ({ ...d, resultType: 'itinerary', subtitle: d.city })))
      );
    }

    const results = (await Promise.all(searches)).flat();

    return res.status(200).json({ success: true, count: results.length, data: results });
  } catch (error: any) {
    console.error('❌ Search error:', error);
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
};
