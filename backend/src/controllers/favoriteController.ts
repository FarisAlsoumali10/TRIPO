import { Response } from 'express';
import { AuthRequest } from '../types';
import { Favorite } from '../models';

export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const favorites = await Favorite.find({ userId: req.user?.userId })
      .populate('placeId')
      .sort({ createdAt: -1 });

    res.json(favorites);
  } catch (error) {
    throw error;
  }
};

export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.body;

    const favorite = await Favorite.create({
      userId: req.user?.userId,
      placeId
    });

    res.status(201).json(favorite);
  } catch (error) {
    if ((error as any).code === 11000) {
      return res.status(409).json({ error: 'Place already in favorites' });
    }
    throw error;
  }
};

export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      userId: req.user?.userId,
      placeId
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    throw error;
  }
};
