import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface Room {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  gameSettings: GameSettings;
  currentRound: number;
  scores: Map<string, number>;
}

interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
}

interface GameSettings {
  maxPlayers: number;
  roundTime: number;
  totalRounds: number;
}

const rooms = new Map<string, Room>();

export default function initializeSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('New client connected', socket.id);

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });

    socket.on('create_room', () => {
      createRoom(socket);
    });

    socket.on('join_room', (data: { roomCode: string; nickname: string }) => {
      joinRoom(socket, data.roomCode, data.nickname);
    });

    socket.on('start_game', (data: { roomCode: string }) => {
      startGame(io, socket, data.roomCode);
    });

    socket.on('submit_answer', (data: { roomCode: string; answer: string }) => {
      submitAnswer(io, socket, data.roomCode, data.answer);
    });

    socket.on('leave_room', (data: { roomCode: string }) => {
      leaveRoom(socket, data.roomCode);
    });
  });
}

function createRoom(socket: Socket) {
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
  };

  rooms.set(roomCode, room);
  socket.join(roomCode);
  socket.emit('room_created', { roomCode, hostId: socket.id });
}

function joinRoom(socket: Socket, roomCode: string, nickname: string) {
  const room = rooms.get(roomCode);
  if (!room) {
    socket.emit('error', { message: 'Room not found' });
    return;
  }

  if (room.status !== 'waiting') {
    socket.emit('error', { message: 'Game has already started' });
    return;
  }

  const player: Player = {
    id: socket.id,
    nickname,
    isHost: room.players.length === 0,
    score: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
  };

  room.players.push(player);
  socket.join(roomCode);
  socket.emit('room_joined', {
    roomCode,
    players: room.players,
    gameSettings: room.gameSettings,
  });
  socket.to(roomCode).emit('player_joined', player);
}

function startGame(io: Server, socket: Socket, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.hostId !== socket.id) {
    socket.emit('error', {
      message: 'You do not have permission to start the game',
    });
    return;
  }

  room.status = 'playing';
  room.currentRound = 1;
  io.to(roomCode).emit('game_started', {
    currentRound: room.currentRound,
    totalRounds: room.gameSettings.totalRounds,
  });

  startNewQuestion(io, roomCode);
}

function submitAnswer(
  io: Server,
  socket: Socket,
  roomCode: string,
  answer: string
) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing') return;

  const player = room.players.find((p) => p.id === socket.id);
  if (!player) return;

  io.to(roomCode).emit('player_answered', {
    playerId: player.id,
    nickname: player.nickname,
    answer,
  });
}

function handleDisconnect(socket: Socket) {
  for (const [roomCode, room] of rooms.entries()) {
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

      if (room.players.length === 0) {
        rooms.delete(roomCode);
      }
      break;
    }
  }
}

function leaveRoom(socket: Socket, roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
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

      if (room.players.length === 0) {
        rooms.delete(roomCode);
      }
    }
  }
  socket.leave(roomCode);
}

function startNewQuestion(io: Server, roomCode: string) {
  // Here you would generate a new question
  // For now, we'll just send a placeholder question
  io.to(roomCode).emit('new_question', {
    question: {
      id: uuidv4(),
      text: 'What is the capital of France?',
      correctOptionId: '2',
    },
    options: [
      { id: '1', text: 'London' },
      { id: '2', text: 'Paris' },
      { id: '3', text: 'Berlin' },
      { id: '4', text: 'Madrid' },
    ],
    timeLimit: 30,
  });
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
