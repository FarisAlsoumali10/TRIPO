import { Request, Response } from 'express';
import { TravelPost } from '../models/TravelPost';
import { AuthRequest } from '../types';

/** GET /api/v1/travel-posts?communityId=xxx */
export const getTravelPosts = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.communityId) filter.communityId = req.query.communityId;
    const posts = await TravelPost.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    console.error('❌ getTravelPosts error:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/** POST /api/v1/travel-posts */
export const createTravelPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const post = await TravelPost.create({
      ...req.body,
      authorId: userId,
      authorName: req.body.authorName ?? 'Traveller',
      joinedBy: [userId],
    });
    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('❌ createTravelPost error:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/** POST /api/v1/travel-posts/:postId/join */
export const joinTravelPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const post = await TravelPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const joined = post.joinedBy.map(String);
    const alreadyJoined = joined.includes(String(userId));

    if (alreadyJoined) {
      post.joinedBy = post.joinedBy.filter((id) => String(id) !== String(userId)) as any;
    } else {
      if (post.joinedBy.length >= post.maxSize) {
        return res.status(400).json({ success: false, error: 'Group is full' });
      }
      post.joinedBy.push(userId as any);
    }

    await post.save();
    return res.status(200).json({ success: true, data: post, joined: !alreadyJoined });
  } catch (error) {
    console.error('❌ joinTravelPost error:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
