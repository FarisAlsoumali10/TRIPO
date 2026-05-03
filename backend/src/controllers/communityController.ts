import { Request, Response } from 'express';
import { Community } from '../models/Community';
import { AuthRequest } from '../types';

export const getAllCommunities = async (req: Request, res: Response) => {
  try {
    const communities = await Community.find({}).lean();
    return res.status(200).json({ success: true, count: communities.length, data: communities });
  } catch (error: any) {
    console.error('❌ Error fetching communities:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getCommunity = async (req: Request, res: Response) => {
  try {
    const community = await Community.findById(req.params.communityId).lean();
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }
    return res.status(200).json({ success: true, data: community });
  } catch (error: any) {
    console.error('❌ Error fetching community:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const createCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const community = await Community.create({
      ...req.body,
      members: [userId],
      memberCount: 1,
    });
    return res.status(201).json({ success: true, data: community });
  } catch (error: any) {
    console.error('❌ Error creating community:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const joinCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

    const alreadyMember = community.members.map(String).includes(String(userId));
    if (alreadyMember) {
      return res.status(400).json({ success: false, error: 'Already a member' });
    }

    community.members.push(userId as any);
    community.memberCount = community.members.length;
    await community.save();

    return res.status(200).json({ success: true, data: community });
  } catch (error: any) {
    console.error('❌ Error joining community:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const leaveCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

    community.members = community.members.filter((id) => String(id) !== String(userId)) as any;
    community.memberCount = community.members.length;
    await community.save();

    return res.status(200).json({ success: true, data: community });
  } catch (error: any) {
    console.error('❌ Error leaving community:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getJoinedCommunities = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const communities = await Community.find({ members: userId }).lean();
    return res.status(200).json({ success: true, data: communities });
  } catch (error: any) {
    console.error('❌ Error fetching joined communities:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const subscribeCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

    const alreadySubscribed = community.subscribers.map(String).includes(String(userId));
    if (alreadySubscribed) {
      return res.status(400).json({ success: false, error: 'Already subscribed' });
    }

    community.subscribers.push(userId as any);
    await community.save();

    return res.status(200).json({ success: true, data: community });
  } catch (error: any) {
    console.error('❌ Error subscribing to community:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const unsubscribeCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

    community.subscribers = community.subscribers.filter((id) => String(id) !== String(userId)) as any;
    await community.save();

    return res.status(200).json({ success: true, data: community });
  } catch (error: any) {
    console.error('❌ Error unsubscribing from community:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getSubscribedCommunities = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const communities = await Community.find({ subscribers: userId }).lean();
    return res.status(200).json({ success: true, data: communities });
  } catch (error: any) {
    console.error('❌ Error fetching subscribed communities:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
