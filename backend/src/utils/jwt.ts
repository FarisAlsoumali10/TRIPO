import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('❌ FATAL ERROR: JWT_SECRET is not defined in environment variables!');
}

const SECRET_KEY = JWT_SECRET || 'dev-secret-key-12345';
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || SECRET_KEY + '_refresh');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export const generateToken = (payload: JwtPayload): string => {
  try {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_EXPIRES_IN as any, algorithm: 'HS256' });
  } catch (error) {
    console.error('❌ Error generating JWT:', error);
    throw new Error('Failed to generate authentication token');
  }
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  try {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any, algorithm: 'HS256' });
  } catch (error) {
    console.error('❌ Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET_KEY) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
};