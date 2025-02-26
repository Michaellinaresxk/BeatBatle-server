import express from 'express';
import GameController from '../controllers/gameController';
import { validateHostAccess } from '../middlewares/authMiddleware';
import {
  validateRoomCode,
  validateGameSettings,
} from '../middlewares/validationMiddleware';

const router = express.Router();

router.get('/room/:roomCode', validateRoomCode, GameController.checkRoom);

router.patch(
  '/room/:roomCode/settings',
  validateRoomCode,
  validateHostAccess,
  validateGameSettings,
  GameController.updateGameSettings
);

export default router;
