import { Response } from 'express';
import { Thread } from '../models/Thread';
import { User } from '../models/User';
import { AuthRequest } from '../types';

// Get all threads for a specific community
export const getThreadsByCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req.params;
    const threads = await Thread.find({ communityId }).sort({ pinned: -1, createdAt: -1 }).lean();
    
    // Normalize _id to id for the frontend
    const formatted = threads.map(t => ({ ...t, id: t._id }));
    return res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('Error fetching threads:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Create a new thread
export const createThread = async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const newThread = await Thread.create({
      ...req.body,
      communityId,
      authorId: userId,
      authorName: user.name
    });

    return res.status(201).json({ success: true, data: { ...newThread.toObject(), id: newThread._id } });
  } catch (error) {
    console.error('Error creating thread:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Add a reply
export const addReply = async (req: AuthRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const { text, imageUrl } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const updated = await Thread.findByIdAndUpdate(
      threadId,
      { $push: { replies: { text, imageUrl, authorId: userId, authorName: user.name } } },
      { new: true }
    ).lean();

    return res.status(200).json({ success: true, data: { ...updated, id: updated?._id } });
  } catch (error) {
    console.error('Error adding reply:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Toggle Reaction (Optimized to handle arrays in Maps)
export const toggleReaction = async (req: AuthRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const thread = await Thread.findById(threadId);
    if (!thread) return res.status(404).json({ success: false, error: 'Not found' });

    const currentReactions = thread.reactions.get(emoji) || [];
    const hasReacted = currentReactions.includes(userId);

    if (hasReacted) {
      thread.reactions.set(emoji, currentReactions.filter((id: string) => id !== userId));
    } else {
      thread.reactions.set(emoji, [...currentReactions, userId]);
    }

    await thread.save();
    return res.status(200).json({ success: true, data: { ...thread.toObject(), id: thread._id } });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Vote on a Poll
export const votePoll = async (req: AuthRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    thread.poll.votes.set(userId, optionIndex);
    await thread.save();

    return res.status(200).json({ success: true, data: { ...thread.toObject(), id: thread._id } });
  } catch (error) {
    console.error('Error voting on poll:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Toggle Pin (Admin Only)
export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    const thread = await Thread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ success: false });
    
    thread.pinned = !thread.pinned;
    await thread.save();
    
    return res.status(200).json({ success: true, data: { ...thread.toObject(), id: thread._id } });
  } catch (error) {
    console.error('Error toggling pin:', error);
    return res.status(500).json({ success: false });
  }
};
