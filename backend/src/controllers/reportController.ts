import { Response } from 'express';
import { AuthRequest } from '../types';
import { Report } from '../models';

export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const reportData = {
      ...req.body,
      reporterId: req.user?.userId
    };

    const report = await Report.create(reportData);

    res.status(201).json(report);
  } catch (error) {
    throw error;
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const { status, targetType } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;

    const reports = await Report.find(query)
      .populate('reporterId', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    throw error;
  }
};

export const reviewReport = async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { actionTaken } = req.body;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = 'resolved';
    report.actionTaken = actionTaken;
    report.reviewedBy = req.user?.userId as any;
    report.resolvedAt = new Date();

    await report.save();

    // Apply action to content
    if (actionTaken === 'hidden' || actionTaken === 'removed') {
      const { Itinerary, Message, Session, Campsite } = await import('../models');

      let Model;
      switch (report.targetType) {
        case 'itinerary':
          Model = Itinerary;
          break;
        case 'message':
          Model = Message;
          break;
        case 'session':
          Model = Session;
          break;
        case 'campsite':
          Model = Campsite;
          break;
        default:
          return res.status(400).json({ error: 'Invalid target type' });
      }

      if (report.targetType === 'message') {
        // Messages don't have status, just delete
        await Model.findByIdAndDelete(report.targetId);
      } else {
        await Model.findByIdAndUpdate(report.targetId, {
          status: actionTaken
        });
      }
    }

    res.json(report);
  } catch (error) {
    throw error;
  }
};
