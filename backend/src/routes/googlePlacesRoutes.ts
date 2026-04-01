import { Router } from 'express';
import { getGooglePlaceDetails, proxyGooglePhoto } from '../controllers/googlePlacesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Details endpoint requires a logged-in user
router.get('/google-places/details', authenticate, getGooglePlaceDetails);

// Photo proxy is intentionally public — <img> tags cannot send Authorization headers
router.get('/google-places/photo', proxyGooglePhoto);

export default router;
