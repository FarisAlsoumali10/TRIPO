import { Request, Response } from 'express';
import { Rental } from '../models/Rental';
import { AuthRequest } from '../types';

export const getAllRentals = async (req: Request, res: Response) => {
  try {
    const rentals = await Rental.find({}).lean();
    return res.status(200).json({ success: true, count: rentals.length, data: rentals });
  } catch (error: any) {
    console.error('❌ Error fetching rentals:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.findById(req.params.rentalId).lean();
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }
    return res.status(200).json({ success: true, data: rental });
  } catch (error: any) {
    console.error('❌ Error fetching rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const createRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.create(req.body);
    return res.status(201).json({ success: true, data: rental });
  } catch (error: any) {
    console.error('❌ Error creating rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const updateRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.findByIdAndUpdate(req.params.rentalId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }
    return res.status(200).json({ success: true, data: rental });
  } catch (error: any) {
    console.error('❌ Error updating rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const deleteRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.findByIdAndDelete(req.params.rentalId);
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }
    return res.status(200).json({ success: true, data: {} });
  } catch (error: any) {
    console.error('❌ Error deleting rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const bookRental = async (req: AuthRequest, res: Response) => {
  try {
    // Basic placeholder logic for booking a rental
    const rental = await Rental.findById(req.params.rentalId);
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }
    return res.status(200).json({ success: true, message: 'Rental successfully booked', data: rental });
  } catch (error: any) {
    console.error('❌ Error booking rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
