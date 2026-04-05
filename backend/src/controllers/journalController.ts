import { Response } from 'express';
import { AuthRequest } from '../types';
import { TripJournal } from '../models/TripJournal';
import crypto from 'crypto';

export const getMyJournals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const journals = await TripJournal.find({ userId }).sort({ updatedAt: -1 });
    res.json(journals);
  } catch (error) {
    console.error('❌ getMyJournals:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المذكرات' });
  }
};

export const getPublicJournals = async (req: AuthRequest, res: Response) => {
  try {
    const { city, page = 1, limit = 20 } = req.query;
    const query: any = { visibility: 'public' };
    if (city) query.city = city;
    const skip = (Number(page) - 1) * Number(limit);
    const journals = await TripJournal.find(query)
      .populate('userId', 'name avatar')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await TripJournal.countDocuments(query);
    res.json({ journals, total });
  } catch (error) {
    console.error('❌ getPublicJournals:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

export const getJournal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const journal = await TripJournal.findById(id).populate('userId', 'name avatar');
    if (!journal) return res.status(404).json({ error: 'المذكرة غير موجودة' });

    const userId = req.user?.userId;
    if (journal.visibility === 'private' && journal.userId.toString() !== userId) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    res.json(journal);
  } catch (error) {
    console.error('❌ getJournal:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

export const getJournalByToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const journal = await TripJournal.findOne({ shareToken: token }).populate('userId', 'name avatar');
    if (!journal) return res.status(404).json({ error: 'الرابط غير صالح' });
    res.json(journal);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

export const createJournal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { title, description, tripId, coverPhoto, visibility, days, tags, startDate, endDate, city } = req.body;
    const journal = await TripJournal.create({
      userId, title, description, tripId, coverPhoto,
      visibility: visibility || 'private',
      days: days || [],
      tags: tags || [],
      startDate, endDate, city,
    });
    res.status(201).json(journal);
  } catch (error) {
    console.error('❌ createJournal:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المذكرة' });
  }
};

export const updateJournal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const journal = await TripJournal.findOne({ _id: id, userId });
    if (!journal) return res.status(404).json({ error: 'غير موجود أو غير مصرح' });

    Object.assign(journal, req.body);
    await journal.save();
    res.json(journal);
  } catch (error) {
    console.error('❌ updateJournal:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

export const deleteJournal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await TripJournal.findOneAndDelete({ _id: id, userId });
    res.json({ message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

export const generateShareLink = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const journal = await TripJournal.findOne({ _id: id, userId });
    if (!journal) return res.status(404).json({ error: 'غير موجود' });

    if (!journal.shareToken) {
      journal.shareToken = crypto.randomBytes(16).toString('hex');
    }
    journal.visibility = 'link';
    await journal.save();
    res.json({ shareToken: journal.shareToken });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
