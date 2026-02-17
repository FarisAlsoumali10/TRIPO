import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  console.error('Error:', error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: error.message
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: 'A record with this value already exists'
    });
  }

  return res.status(error.statusCode || 500).json({
    error: error.message || 'Internal server error'
  });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
};
