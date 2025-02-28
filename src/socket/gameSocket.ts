import type { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, leaveRoom } from './helpers/roomHelpers';
import {
  checkAllReady,
  submitAnswer,
  startNewQuestion,
  endGame,
} from './helpers/gameHelpers';
import { handleDisconnect } from './helpers/connectionHelpers';
import { getRoom } from '../store/roomStore';

export default function initializeSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('New client connected', socket.id);

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });

    // Web client events
    socket.on('create_room', (data?: { category: string }) => {
      createRoom(socket, data?.category);
    });

    socket.on('join_room', (data: { roomCode: string; nickname: string }) => {
      joinRoom(socket, data.roomCode, data.nickname);
    });

    // Mobile controller events
    socket.on(
      'join_controller',
      (data: { roomCode: string; nickname: string }) => {
        // Verifica si este controlador ya está unido
        const room = getRoom(data.roomCode);

        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        // Verificar si el controlador ya está en la sala
        const existingController = room.mobileControllers.find(
          (c) => c.id === socket.id
        );
        if (existingController) {
          // Ya está unido, no hacer nada
          return;
        }

        // Añadir como nuevo controlador
        joinRoom(socket, data.roomCode, data.nickname, true);
      }
    );

    // Start game event
    socket.on('start_game', (data) => {
      const { roomCode } = data;
      console.log('⚠️ Host requested to start game:', roomCode);

      const room = getRoom(roomCode);
      if (!room || room.hostId !== socket.id) {
        console.log('⚠️ Not authorized to start game');
        socket.emit('error', {
          message: 'No tienes permisos para iniciar el juego',
        });
        return;
      }

      if (room.status !== 'waiting') {
        console.log('⚠️ Game already started');
        return;
      }

      // Iniciar el juego
      room.status = 'playing';
      room.currentRound = 1;

      // Notificar a todos
      io.to(roomCode).emit('game_started', {
        currentRound: room.currentRound,
        totalRounds: room.gameSettings.totalRounds,
        category: room.category,
      });

      // Iniciar primera pregunta
      startNewQuestion(io, roomCode);
    });

    socket.on('request_current_question', (data: { roomCode: string }) => {
      const room = getRoom(data.roomCode);
      if (room && room.currentQuestion) {
        socket.emit('new_question', room.currentQuestion);
      }
    });

    // Answer submission
    socket.on('submit_answer', (data: { roomCode: string; answer: string }) => {
      submitAnswer(io, socket, data.roomCode, data.answer);
    });

    // Request next question
    socket.on('request_next_question', (data: { roomCode: string }) => {
      const room = getRoom(data.roomCode);
      if (room && room.status === 'playing') {
        room.currentRound++;
        if (room.currentRound <= room.gameSettings.totalRounds) {
          startNewQuestion(io, data.roomCode);
        } else {
          endGame(io, data.roomCode);
        }
      }
    });

    // Toggle ready state
    socket.on('toggle_ready', (data) => {
      const { roomCode, isReady } = data;
      console.log('⚠️ Recibido toggle_ready:', {
        roomCode,
        isReady,
        socketId: socket.id,
      });

      const room = getRoom(roomCode);
      if (!room) {
        console.log('⚠️ Room not found:', roomCode);
        return;
      }

      // Buscar el controlador en la sala
      const controllerIndex = room.mobileControllers.findIndex(
        (c) => c.id === socket.id
      );
      if (controllerIndex === -1) {
        console.log('⚠️ Controller not found in room');
        return;
      }

      // Actualizar el estado ready del controlador
      room.mobileControllers[controllerIndex].isReady = isReady;
      console.log('⚠️ Controller ready state updated to:', isReady);

      // Enviar el estado actualizado a TODOS, incluyendo el emisor
      io.to(roomCode).emit('player_ready', {
        playerId: socket.id,
        nickname: room.mobileControllers[controllerIndex].nickname,
        isReady: isReady,
      });

      // IMPORTANTE: verificar si todos están listos
      checkAllReady(io, room);
    });

    // Leave room
    socket.on('leave_room', (data: { roomCode: string }) => {
      leaveRoom(socket, data.roomCode);
    });
  });
}
