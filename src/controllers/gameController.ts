import { Request, Response } from 'express';
import Room from '../models/Room';
import Player from '../models/Player';

export class GameController {
  // Verificar si una sala existe
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
        return res.status(404).json({ error: 'Sala no encontrada' });
      }

      if (room.status !== 'waiting') {
        return res.status(400).json({ error: 'El juego ya ha comenzado' });
      }

      // En una implementación real, aquí crearías un jugador en la base de datos
      // Pero para una versión simplificada, solo confirmamos que la sala existe

      return res.status(200).json({
        success: true,
        roomCode,
        status: room.status,
      });
    } catch (error) {
      console.error('Error al unirse a la sala:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener estado actual del juego
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

  // Obtener ranking de jugadores
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

  // Actualizar configuración del juego (solo host)
  static async updateGameSettings(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const { maxPlayers, roundTime, totalRounds } = req.body;
      const { hostId } = req.headers; // Asumiendo que envías el hostId en los headers

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

  // Obtener historial de rondas previas
  static async getRoundHistory(req: Request, res: Response) {
    try {
      const { roomCode } = req.params;
      const room = await Room.findOne({ roomCode });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Aquí podrías implementar la lógica para obtener el historial de rondas
      // si decides guardarlo en la base de datos

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
