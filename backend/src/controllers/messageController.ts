import { Response } from 'express';
import { AuthRequest } from '../types';
import { Message, GroupTrip, Notification } from '../models';

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId } = req.query;
    const { page = 1, limit = 50 } = req.query;

    if (!groupTripId) {
      return res.status(400).json({ error: 'groupTripId is required' });
    }

    // Verify user is member
    const groupTrip = await GroupTrip.findById(groupTripId);
    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    const isMember = groupTrip.memberIds.some(
      (id: any) => id.toString() === req.user?.userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group trip' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await Message.find({ groupTripId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Message.countDocuments({ groupTripId });

    res.json({
      messages,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    console.error('❌ Error in getMessages:', error);
    // ✅ منع تعليق الواجهة الأمامية
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الرسائل' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId, content } = req.body;

    // Verify user is member
    const groupTrip = await GroupTrip.findById(groupTripId);
    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    const isMember = groupTrip.memberIds.some(
      (id: any) => id.toString() === req.user?.userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group trip' });
    }

    const message = await Message.create({
      groupTripId,
      senderId: req.user?.userId,
      content,
      type: 'text'
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name avatar');

    // Emit Socket.IO event safely
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${groupTripId}`).emit('message:receive', populatedMessage);
    }

    // Create notifications for other members
    const otherMembers = groupTrip.memberIds.filter(
      (id: any) => id.toString() !== req.user?.userId
    );

    for (const memberId of otherMembers) {
      await Notification.create({
        userId: memberId,
        type: 'new_message',
        payload: {
          groupTripId: groupTrip._id,
          groupTripTitle: groupTrip.title,
          senderId: req.user?.userId,
          messagePreview: content.substring(0, 50)
        },
        read: false
      });
    }

    res.status(201).json(populatedMessage);
  } catch (error: any) {
    console.error('❌ Error in sendMessage:', error);
    // ✅ منع تعليق الواجهة الأمامية
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الرسالة' });
  }
};