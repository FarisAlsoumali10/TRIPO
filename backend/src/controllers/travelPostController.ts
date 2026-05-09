import { Request, Response } from 'express';
import { TravelPost } from '../models/TravelPost';
import { AuthRequest } from '../types';
import { User } from '../models/User';

// GET /api/travel-posts  ?communityId=xxx  (optional)
export const getTravelPosts = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.communityId) filter.communityId = req.query.communityId;

    // Only future posts
    const today = new Date().toISOString().split('T')[0];
    const posts = await TravelPost.find({
      ...filter,
      date: { $gte: today },
    }).sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/travel-posts
export const createTravelPost = async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, placeName, placeId, date, maxGroupSize, description, interests } =
      req.body;
    if (!placeName || !date) return res.status(400).json({ message: 'placeName and date required' });

    const userId = req.user!.userId;
    const author = await User.findById(userId).select('name avatar').lean();

    const post = await TravelPost.create({
      communityId,
      userId,
      userName: author?.name ?? 'مسافر',
      userAvatar: author?.avatar,
      placeName,
      placeId,
      date,
      maxGroupSize: maxGroupSize ?? 4,
      description,
      interests: interests ?? [],
      members: [userId], // creator auto-joins
    });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/travel-posts/:id/join
export const joinTravelPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const post = await TravelPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.members.includes(userId)) return res.status(409).json({ message: 'Already joined' });
    if (post.members.length >= post.maxGroupSize)
      return res.status(400).json({ message: 'Group is full' });

    post.members.push(userId);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
