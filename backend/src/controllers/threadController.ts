import { Request, Response } from 'express';
import { MajlisThread } from '../models/MajlisThread';
import { AuthRequest } from '../types';
import { User } from '../models/User';

// GET /api/threads?communityId=xxx
export const getThreads = async (req: Request, res: Response) => {
  try {
    const { communityId } = req.query;
    if (!communityId) return res.status(400).json({ message: 'communityId required' });

    const threads = await MajlisThread.find({ communityId }).sort({ pinned: -1, createdAt: -1 });
    res.json(threads);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/threads
export const createThread = async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, title, body, tags, imageUrl, poll } = req.body;
    if (!communityId || !title) return res.status(400).json({ message: 'communityId and title required' });

    const userId = req.user!.userId;
    const author = await User.findById(userId).select('name').lean();

    const thread = await MajlisThread.create({
      communityId,
      title,
      body,
      authorName: author?.name ?? 'مستخدم',
      userId,
      tags: tags ?? [],
      imageUrl,
      poll,
    });
    res.status(201).json(thread);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/threads/:id/reply
export const replyToThread = async (req: AuthRequest, res: Response) => {
  try {
    const { text, imageUrl } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text required' });

    const userId = req.user!.userId;
    const author = await User.findById(userId).select('name').lean();

    const thread = await MajlisThread.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          replies: {
            text,
            authorName: author?.name ?? 'مستخدم',
            userId,
            imageUrl,
            createdAt: new Date().toISOString(),
          },
        },
      },
      { new: true }
    );
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    res.json(thread);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/threads/:id/react  body: { emoji }
export const toggleReaction = async (req: AuthRequest, res: Response) => {
  try {
    const { emoji } = req.body;
    const userId = req.user!.userId;
    const thread = await MajlisThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const current: string[] = (thread.reactions.get(emoji) as string[]) ?? [];
    const updated = current.includes(userId)
      ? current.filter((u) => u !== userId)
      : [...current, userId];
    thread.reactions.set(emoji, updated);
    await thread.save();
    res.json(thread);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/threads/:id/vote  body: { optionIndex }
export const votePoll = async (req: AuthRequest, res: Response) => {
  try {
    const { optionIndex } = req.body;
    const userId = req.user!.userId;
    const thread = await MajlisThread.findById(req.params.id);
    if (!thread || !thread.poll) return res.status(404).json({ message: 'Thread or poll not found' });
    if (thread.poll.votes.get(userId) !== undefined)
      return res.status(409).json({ message: 'Already voted' });

    thread.poll.votes.set(userId, optionIndex);
    await thread.save();
    res.json(thread);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/threads/:id/pin  (admin/author only)
export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const thread = await MajlisThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    if (thread.userId !== userId && req.user!.role !== 'admin')
      return res.status(403).json({ message: 'Forbidden' });

    thread.pinned = !thread.pinned;
    await thread.save();
    res.json(thread);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
