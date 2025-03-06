import { Request, Response } from 'express';
import Room from '../models/Room';
import Player from '../models/Player';

export class GameController {
  // Check if a room exists
  static async checkRoom(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const room = await Room.findOne({ roomCode });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.json({
        status: room.status,
        currentPlayers: room.players.length,
        maxPlayers: room.gameSettings.maxPlayers,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async joinRoom(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const { nickname } = req.body;

      const room = await Room.findOne({ roomCode });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (room.status !== 'waiting') {
        return res.status(400).json({ error: 'The game has already started' });
      }

      return res.status(200).json({
        success: true,
        roomCode,
        status: room.status,
      });
    } catch (error) {
      console.error('Error joining the room:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGameState(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const room = await Room.findOne({ roomCode }).populate('players');

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.json({
        status: room.status,
        players: room.players,
        currentRound: room.currentRound,
        totalRounds: room.gameSettings.totalRounds,
        scores: Array.from(room.scores),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Obtain player ranking
  static async getLeaderboard(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const room = await Room.findOne({ roomCode });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const players = await Player.find({ roomId: roomCode })
        .sort({ score: -1 })
        .select('nickname score correctAnswers');

      return res.json(players);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateGameSettings(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const { maxPlayers, roundTime, totalRounds } = req.body;
      const { hostId } = req.headers;

      const room = await Room.findOne({ roomCode });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (room.hostId !== hostId) {
        return res.status(403).json({ error: 'Only host can update settings' });
      }

      if (room.status !== 'waiting') {
        return res
          .status(400)
          .json({ error: 'Cannot update settings after game has started' });
      }

      room.gameSettings = {
        maxPlayers: maxPlayers || room.gameSettings.maxPlayers,
        roundTime: roundTime || room.gameSettings.roundTime,
        totalRounds: totalRounds || room.gameSettings.totalRounds,
      };

      await room.save();

      return res.json(room.gameSettings);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRoundHistory(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const room = await Room.findOne({ roomCode });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.json({
        currentRound: room.currentRound,
        totalRounds: room.gameSettings.totalRounds,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default GameController;
