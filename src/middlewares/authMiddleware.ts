import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';
import Room from '../models/Room';

export const validateHostAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roomCode } = req.params;
    const hostId = req.headers['host-id'] as string;

    if (!hostId) {
      throw new ApiError(401, 'Host ID is required');
    }

    const room = await Room.findOne({ roomCode });
    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    if (room.hostId !== hostId) {
      throw new ApiError(403, 'Only host can perform this action');
    }

    next();
  } catch (error) {
    next(error);
  }
};
