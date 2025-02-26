import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

export const validateRoomCode = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { roomCode } = req.params;

  if (!roomCode || roomCode.length !== 6) {
    throw new ApiError(400, 'Invalid room code format');
  }

  next();
};

export const validateGameSettings = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { maxPlayers, roundTime, totalRounds } = req.body;

  if (maxPlayers && (maxPlayers < 2 || maxPlayers > 8)) {
    throw new ApiError(400, 'Players must be between 2 and 8');
  }

  if (roundTime && (roundTime < 10 || roundTime > 60)) {
    throw new ApiError(400, 'Round time must be between 10 and 60 seconds');
  }

  if (totalRounds && (totalRounds < 5 || totalRounds > 20)) {
    throw new ApiError(400, 'Total rounds must be between 5 and 20');
  }

  next();
};
