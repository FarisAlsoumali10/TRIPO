import { Response } from 'express';
import { AuthRequest } from '../types';
import { GroupTrip, Itinerary, Notification } from '../models';
import { Types } from 'mongoose';

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
  } catch (error) {
    throw error;
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
  } catch (error) {
    throw error;
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
  } catch (error) {
    throw error;
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
    const alreadyInvited = groupTrip.invitations.some(
      (inv) => inv.userId.toString() === userId
    );
    const alreadyMember = groupTrip.memberIds.some(
      (id: Types.ObjectId) => id.toString() === userId
    );

    if (alreadyInvited || alreadyMember) {
      return res.status(409).json({ error: 'User already invited or member' });
    }

    groupTrip.invitations.push({
      userId: new Types.ObjectId(userId),
      status: 'pending',
      sentAt: new Date()
    });

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

    // Emit Socket.IO event
    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('notification', {
      type: 'group_invitation',
      groupTripId: groupTrip._id,
      groupTripTitle: groupTrip.title
    });

    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    throw error;
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

    const invitation = groupTrip.invitations.find(
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
  } catch (error) {
    throw error;
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
  } catch (error) {
    throw error;
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
  } catch (error) {
    throw error;
  }
};
