import type { Socket } from 'socket.io';
import type { Room, Player } from '../../types/gameTypes';
import { generateRoomCode } from '../../utils/codeGenerator';
import { addRoom, getRoom, removeRoom } from '../../store/roomStore';

/**
 * Creates a new game room
 */
export function createRoom(socket: Socket, category?: string): Room {
  const roomCode = generateRoomCode();
  const room: Room = {
    roomCode,
    hostId: socket.id,
    status: 'waiting',
    players: [],
    gameSettings: {
      maxPlayers: 8,
      roundTime: 30,
      totalRounds: 10,
    },
    currentRound: 0,
    scores: new Map(),
    category: category || null,
    mobileControllers: [],
    currentQuestion: null,
  };

  addRoom(room);
  socket.join(roomCode);
  socket.emit('room_created', {
    roomCode,
    hostId: socket.id,
    category: room.category,
  });

  return room;
}

/**
 * Adds a player or controller to a room
 */
export function joinRoom(
  socket: Socket,
  roomCode: string,
  nickname: string,
  isMobileController = false
): boolean {
  console.log(
    `⚠️ Joining room ${roomCode} as ${
      isMobileController ? 'controller' : 'player'
    } with nickname ${nickname}`
  );

  const room = getRoom(roomCode);
  if (!room) {
    console.log(`⚠️ Room ${roomCode} not found`);
    socket.emit('error', { message: 'Room not found' });
    return false;
  }

  // Solo verificar el estado para jugadores regulares, permitir que los controladores se unan en cualquier momento
  if (!isMobileController && room.status !== 'waiting') {
    console.log(
      `⚠️ Game in room ${roomCode} has already started, regular player can't join`
    );
    socket.emit('error', { message: 'Game has already started' });
    return false;
  }

  socket.join(roomCode);
  console.log(`⚠️ Socket ${socket.id} joined room ${roomCode}`);

  if (isMobileController) {
    // Add as a mobile controller
    const controller = {
      id: socket.id,
      nickname,
      isReady: false,
    };

    room.mobileControllers.push(controller);
    console.log(`⚠️ Added mobile controller ${nickname} to room ${roomCode}`);
    console.log(`⚠️ Room now has ${room.mobileControllers.length} controllers`);

    // Si el juego ya ha comenzado, enviar evento de inicio de juego inmediatamente
    if (room.status === 'playing') {
      console.log(
        `⚠️ Game already in progress, sending game_started event to new controller`
      );
      socket.emit('game_started', {
        currentRound: room.currentRound,
        totalRounds: room.gameSettings.totalRounds,
        category: room.category,
      });

      // También enviar la pregunta actual si está disponible
      if (room.currentQuestion) {
        socket.emit('new_question', room.currentQuestion);
      }
    } else {
      // Si el juego no ha comenzado, enviar info normal de la sala
      socket.emit('controller_joined', {
        roomCode,
        nickname,
        players: room.players.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          isHost: p.isHost,
          isReady: true,
        })),
        controllers: room.mobileControllers,
        hostId: room.hostId,
      });
    }

    // Notify other clients
    socket.to(roomCode).emit('controller_joined', {
      id: socket.id,
      nickname,
    });
  } else {
    // Add as a regular player
    const player: Player = {
      id: socket.id,
      nickname,
      isHost: room.players.length === 0,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    };

    if (room.players.length === 0) {
      room.hostId = socket.id;
    }

    room.players.push(player);
    console.log(`⚠️ Added player ${nickname} to room ${roomCode}`);
    console.log(`⚠️ Room now has ${room.players.length} players`);

    socket.emit('room_joined', {
      roomCode,
      players: room.players,
      gameSettings: room.gameSettings,
      category: room.category,
    });
    socket.to(roomCode).emit('player_joined', player);
  }

  return true;
}

/**
 * Removes a player or controller from a room
 */
export function leaveRoom(socket: Socket, roomCode: string): void {
  const room = getRoom(roomCode);
  if (room) {
    // Check if it's a player
    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      socket.to(roomCode).emit('player_left', {
        playerId: player.id,
        nickname: player.nickname,
      });

      if (player.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
        socket.to(roomCode).emit('new_host', {
          playerId: room.players[0].id,
          nickname: room.players[0].nickname,
        });
      }
    }

    // Check if it's a controller
    const controllerIndex = room.mobileControllers.findIndex(
      (c) => c.id === socket.id
    );
    if (controllerIndex !== -1) {
      const controller = room.mobileControllers[controllerIndex];
      room.mobileControllers.splice(controllerIndex, 1);
      socket.to(roomCode).emit('controller_left', {
        id: controller.id,
        nickname: controller.nickname,
      });
    }

    // If no players or controllers left, delete the room
    if (room.players.length === 0 && room.mobileControllers.length === 0) {
      removeRoom(roomCode);
    }
  }
  socket.leave(roomCode);
}
