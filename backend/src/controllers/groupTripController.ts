import { Response } from 'express';
import { AuthRequest } from '../types';
import { GroupTrip, Itinerary, Notification, User } from '../models';
import { Types } from 'mongoose';
import crypto from 'crypto';

export const createGroupTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { baseItineraryId, title } = req.body;

    const itinerary = await Itinerary.findById(baseItineraryId);
    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    const groupTrip = await GroupTrip.create({
      organizerId: req.user?.userId,
      baseItineraryId,
      title,
      memberIds: [req.user?.userId],
      status: 'planning'
    });

    res.status(201).json(groupTrip);
  } catch (error: any) {
    console.error('❌ Error in createGroupTrip:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الرحلة الجماعية' });
  }
};

export const getGroupTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId } = req.params;

    const groupTrip = await GroupTrip.findById(groupTripId)
      .populate('organizerId', 'name avatar')
      .populate('memberIds', 'name avatar')
      .populate('baseItineraryId');

    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    // Check if user is a member
    const userId = req.user?.userId;
    const isMember = groupTrip.memberIds.some(
      (id: any) => id._id.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group trip' });
    }

    res.json(groupTrip);
  } catch (error: any) {
    console.error('❌ Error in getGroupTrip:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الرحلة الجماعية' });
  }
};

export const getUserGroupTrips = async (req: AuthRequest, res: Response) => {
  try {
    const groupTrips = await GroupTrip.find({
      memberIds: req.user?.userId
    })
      .populate('organizerId', 'name avatar')
      .populate('baseItineraryId', 'title city estimatedDuration estimatedCost')
      .sort({ createdAt: -1 });

    res.json(groupTrips);
  } catch (error: any) {
    console.error('❌ Error in getUserGroupTrips:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة رحلاتك الجماعية' });
  }
};

export const inviteToGroupTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId } = req.params;
    const { userId } = req.body;

    const groupTrip = await GroupTrip.findById(groupTripId);

    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    // Check if requester is organizer
    if (groupTrip.organizerId.toString() !== req.user?.userId) {
      return res.status(403).json({ error: 'Only organizer can invite members' });
    }

    // Check if already invited or member
    const alreadyInvited = groupTrip.invitations?.some(
      (inv) => inv.userId.toString() === userId
    );
    const alreadyMember = groupTrip.memberIds.some(
      (id: Types.ObjectId) => id.toString() === userId
    );

    if (alreadyInvited || alreadyMember) {
      return res.status(409).json({ error: 'User already invited or member' });
    }

    // Ensure invitations array exists
    if (!groupTrip.invitations) {
      groupTrip.invitations = [];
    }

    groupTrip.invitations.push({
      userId: new Types.ObjectId(userId),
      status: 'pending',
      sentAt: new Date()
    } as any);

    await groupTrip.save();

    // Create notification
    await Notification.create({
      userId,
      type: 'group_invitation',
      payload: {
        groupTripId: groupTrip._id,
        groupTripTitle: groupTrip.title,
        organizerId: req.user?.userId
      },
      read: false
    });

    // Emit Socket.IO event safely
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        type: 'group_invitation',
        groupTripId: groupTrip._id,
        groupTripTitle: groupTrip.title
      });
    }

    res.json({ message: 'Invitation sent successfully' });
  } catch (error: any) {
    console.error('❌ Error in inviteToGroupTrip:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الدعوة' });
  }
};

export const respondToInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId, invitationId } = req.params;
    const { status } = req.body; // 'accepted' or 'declined'

    const groupTrip = await GroupTrip.findById(groupTripId);

    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    const invitation = groupTrip.invitations?.find(
      (inv) => inv.userId.toString() === req.user?.userId
    );

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    invitation.status = status;

    if (status === 'accepted') {
      groupTrip.memberIds.push(new Types.ObjectId(req.user?.userId));

      // Notify organizer
      await Notification.create({
        userId: groupTrip.organizerId,
        type: 'member_joined',
        payload: {
          groupTripId: groupTrip._id,
          groupTripTitle: groupTrip.title,
          userId: req.user?.userId
        },
        read: false
      });
    }

    await groupTrip.save();

    res.json(groupTrip);
  } catch (error: any) {
    console.error('❌ Error in respondToInvitation:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء الرد على الدعوة' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId, userId } = req.params;

    const groupTrip = await GroupTrip.findById(groupTripId);

    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    // Check if requester is organizer
    if (groupTrip.organizerId.toString() !== req.user?.userId) {
      return res.status(403).json({ error: 'Only organizer can remove members' });
    }

    // Cannot remove organizer
    if (userId === groupTrip.organizerId.toString()) {
      return res.status(400).json({ error: 'Cannot remove organizer' });
    }

    groupTrip.memberIds = groupTrip.memberIds.filter(
      (id: Types.ObjectId) => id.toString() !== userId
    );

    await groupTrip.save();

    // Notify removed member
    await Notification.create({
      userId,
      type: 'member_left',
      payload: {
        groupTripId: groupTrip._id,
        groupTripTitle: groupTrip.title,
        reason: 'removed'
      },
      read: false
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('❌ Error in removeMember:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إزالة العضو' });
  }
};

export const leaveGroupTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId } = req.params;

    const groupTrip = await GroupTrip.findById(groupTripId);

    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    // Organizer cannot leave
    if (groupTrip.organizerId.toString() === req.user?.userId) {
      return res.status(400).json({ error: 'Organizer cannot leave. Delete the trip instead.' });
    }

    groupTrip.memberIds = groupTrip.memberIds.filter(
      (id: Types.ObjectId) => id.toString() !== req.user?.userId
    );

    await groupTrip.save();

    // Notify organizer
    await Notification.create({
      userId: groupTrip.organizerId,
      type: 'member_left',
      payload: {
        groupTripId: groupTrip._id,
        groupTripTitle: groupTrip.title,
        userId: req.user?.userId
      },
      read: false
    });

    res.json({ message: 'Left group trip successfully' });
  } catch (error: any) {
    console.error('❌ Error in leaveGroupTrip:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء مغادرة الرحلة' });
  }
};

export const createPrivateTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { title, startDate, endDate, destination, coverImage } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const inviteToken = crypto.randomBytes(12).toString('hex');

    const groupTrip = await GroupTrip.create({
      organizerId: req.user?.userId,
      title,
      description: destination,
      coverImage,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      memberIds: [new Types.ObjectId(req.user?.userId as string)],
      inviteToken,
      isPrivate: true,
      status: 'planning',
    });

    res.status(201).json(groupTrip);
  } catch (error: any) {
    console.error('❌ Error in createPrivateTrip:', error);
    res.status(500).json({ error: 'Failed to create private trip' });
  }
};

export const getInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    const trip = await GroupTrip.findById(req.params.groupTripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.organizerId.toString() !== req.user?.userId)
      return res.status(403).json({ error: 'Only the organizer can get the invite link' });
    res.json({ inviteToken: trip.inviteToken });
  } catch (error: any) {
    console.error('❌ Error in getInviteLink:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const joinByToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const trip = await GroupTrip.findOne({ inviteToken: token });
    if (!trip) return res.status(404).json({ error: 'Invalid or expired invite link' });

    const userId = new Types.ObjectId(req.user?.userId as string);
    const alreadyMember = trip.memberIds.some(id => id.equals(userId));
    if (!alreadyMember) {
      trip.memberIds.push(userId);
      await trip.save();
    }

    const populated = await GroupTrip.findById(trip._id)
      .populate('organizerId', 'name avatar email')
      .populate('memberIds', 'name avatar email');

    res.json(populated);
  } catch (error: any) {
    console.error('❌ Error in joinByToken:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMyPrivateTrips = async (req: AuthRequest, res: Response) => {
  try {
    const trips = await GroupTrip.find({
      memberIds: req.user?.userId,
      isPrivate: true,
    })
      .populate('organizerId', 'name avatar email')
      .populate('memberIds', 'name avatar email')
      .sort({ createdAt: -1 });

    res.json(trips);
  } catch (error: any) {
    console.error('❌ Error in getMyPrivateTrips:', error);
    res.status(500).json({ error: 'Failed to fetch private trips' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || (q as string).trim().length < 2) {
      return res.json([]);
    }

    const regex = new RegExp((q as string).trim(), 'i');
    const users = await User.find({
      $or: [{ name: regex }, { email: regex }],
      _id: { $ne: req.user?.userId },
    })
      .select('name email avatar')
      .limit(10);

    res.json(users);
  } catch (error: any) {
    console.error('❌ Error in searchUsers:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};