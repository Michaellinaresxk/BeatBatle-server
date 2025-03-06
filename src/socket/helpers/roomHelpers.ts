import type { Socket } from 'socket.io';
import { addRoom, getRoom, getRooms } from '../../store/roomStore';
import { generateRoomCode } from '../../utils/codeGenerator';
import type { Room, Player, MobileController } from '../../types/gameTypes';

/**
 * Creates a new game room
 */
export function createRoom(
  socket: Socket,
  options: {
    category?: string;
    nickname?: string;
    gameSettings?: Partial<Room['gameSettings']>;
  } = {}
): Room | null {
  const { category, nickname, gameSettings: customGameSettings } = options;

  // Validate socket
  if (!socket || !socket.id) {
    console.error('❌ Invalid socket for room creation');
    socket.emit('error', { message: 'Invalid socket connection' });
    return null;
  }

  // Generate room code with validation
  const roomCode = generateRoomCode();
  if (!roomCode || roomCode.trim().length !== 6) {
    console.error('❌ Failed to generate valid room code');
    socket.emit('error', { message: 'Failed to generate room code' });
    return null;
  }

  const hostNickname = (nickname || 'Host').trim();

  const defaultGameSettings: Room['gameSettings'] = {
    maxPlayers: 8,
    roundTime: 30,
    totalRounds: 10,
  };

  // Create room object
  const room: Room = {
    roomCode,
    hostId: socket.id,
    status: 'waiting',
    players: [
      {
        id: socket.id,
        nickname: hostNickname,
        isHost: true,
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
      },
    ],
    gameSettings: { ...defaultGameSettings, ...customGameSettings },
    currentRound: 0,
    scores: new Map(),
    category: category || null,
    categoryType: '',
    mobileControllers: [],
    currentQuestion: null,
    quizType: '',
  };

  // Log room creation details
  console.log(`🚀 Room Creation Details:`, {
    roomCode,
    hostId: socket.id,
    hostNickname,
    category: room.category,
    gameSettings: room.gameSettings,
  });

  try {
    // Add room to store
    addRoom(room);

    // Verify room was added successfully
    const verifyRoom = getRoom(roomCode);
    if (!verifyRoom) {
      console.error(`❌ Failed to save room with code: ${roomCode}`);
      socket.emit('error', { message: 'Failed to create room in data store' });
      return null;
    }
  } catch (error) {
    console.error('❌ Room creation failed:', error);
    socket.emit('error', {
      message: `Room creation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    });
    return null;
  }

  try {
    // Join socket to room
    socket.join(roomCode);
  } catch (joinError) {
    console.error('❌ Failed to join room socket:', joinError);
    socket.emit('error', {
      message: `Failed to join room: ${
        joinError instanceof Error ? joinError.message : 'Unknown error'
      }`,
    });
    return null;
  }

  // Send room created event with complete data
  socket.emit('room_created', {
    roomCode,
    hostId: socket.id,
    category: room.category,
    players: room.players,
    categoryType: room.categoryType,
    gameSettings: room.gameSettings,
  });

  // Debug: Log all current rooms
  const currentRooms = getRooms();
  console.log(`🏠 Total Rooms after creation: ${currentRooms.size}`);
  currentRooms.forEach((r, code) => {
    console.log(
      `🔑 Room Code: ${code}, Players: ${r.players.length}, Controllers: ${r.mobileControllers.length}`
    );
  });

  console.log(
    `✅ Room created successfully: ${roomCode} with host: ${hostNickname}`
  );
  return room;
}

/**
 * Joins an existing room as player or controller
 */
export function joinRoom(
  socket: Socket,
  {
    roomCode,
    nickname,
    isMobileController = false,
  }: {
    roomCode: string;
    nickname: string;
    isMobileController?: boolean;
  }
): boolean {
  if (!roomCode || !nickname) {
    socket.emit('error', {
      message: 'Room code and nickname are required',
      code: 'MISSING_PARAMETERS',
    });
    return false;
  }

  const logPrefix = `⚡ [Room ${roomCode}]`;
  console.log(
    `${logPrefix} Join Attempt:`,
    JSON.stringify({
      socketId: socket.id,
      nickname,
      isMobileController,
    })
  );

  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const room = getRoom(normalizedRoomCode);
  if (!room) {
    console.error(`${logPrefix} ❌ Room not found`);
    socket.emit('error', {
      message: 'Room not found. Please check the code and try again.',
      code: 'ROOM_NOT_FOUND',
      details: {
        roomCode: normalizedRoomCode,
        totalRooms: getRooms().size,
      },
    });
    return false;
  }

  // Check if the game has already started (only for regular players)
  if (room.status !== 'waiting' && !isMobileController) {
    socket.emit('error', {
      message: 'Game has already started',
      code: 'GAME_ALREADY_STARTED',
    });
    return false;
  }

  try {
    const existingPlayer = room.players.find((p) => p.id === socket.id);
    const existingController = room.mobileControllers.find(
      (c) => c.id === socket.id
    );

    if (existingPlayer || existingController) {
      console.log(
        `${logPrefix} ⚠️ Socket ${socket.id} already in the room, updating`
      );

      socket.join(normalizedRoomCode);

      if (existingPlayer) {
        socket.emit('room_joined', {
          roomCode: normalizedRoomCode,
          players: room.players,
          mobileControllers: room.mobileControllers,
          gameStatus: room.status,
          category: room.category,
          categoryType: room.categoryType,
          isHost: existingPlayer.isHost,
        });
      } else if (existingController) {
        socket.emit('controller_joined', {
          roomCode: normalizedRoomCode,
          players: room.players,
          mobileControllers: room.mobileControllers,
          gameStatus: room.status,
          category: room.category,
          categoryType: room.categoryType,
        });
      }

      return true;
    }

    socket.join(normalizedRoomCode);

    if (isMobileController) {
      const controller: MobileController = {
        id: socket.id,
        nickname,
        isReady: false,
      };

      room.mobileControllers.push(controller);

      // Notify the controller that you have joined
      socket.emit('controller_joined', {
        roomCode: normalizedRoomCode,
        players: room.players,
        mobileControllers: room.mobileControllers,
        gameStatus: room.status,
        category: room.category,
        categoryType: room.categoryType,
      });

      socket.to(normalizedRoomCode).emit('controller_joined', {
        id: socket.id,
        nickname,
        players: room.players,
        mobileControllers: room.mobileControllers,
      });

      console.log(`${logPrefix} ✅ Mobile controller joined: ${nickname}`);
    } else {
      const player: Player = {
        id: socket.id,
        nickname,
        isHost: false,
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
      };

      room.players.push(player);

      socket.emit('room_joined', {
        roomCode: normalizedRoomCode,
        players: room.players,
        mobileControllers: room.mobileControllers,
        gameStatus: room.status,
        category: room.category,
        categoryType: room.categoryType,
        isHost: false,
      });

      socket.to(normalizedRoomCode).emit('player_joined', player);

      console.log(`${logPrefix} ✅ Player joined: ${nickname}`);
    }

    return true;
  } catch (error) {
    console.error(`${logPrefix} ❌ Error joining room:`, error);
    socket.emit('error', {
      message: `Failed to join room: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      code: 'JOIN_ROOM_ERROR',
    });
    return false;
  }
}
/**
 * Handle leaving a room
 */
export function leaveRoom(socket: Socket, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) {
    socket.emit('error', { message: 'Room not found' });
    return;
  }

  // Check if player exists in room
  const playerIndex = room.players.findIndex((p) => p.id === socket.id);
  const controllerIndex = room.mobileControllers.findIndex(
    (c) => c.id === socket.id
  );

  if (playerIndex !== -1) {
    // Handle player leaving
    const player = room.players[playerIndex];
    room.players.splice(playerIndex, 1);

    socket.to(roomCode).emit('player_left', {
      playerId: player.id,
      nickname: player.nickname,
    });

    // If this was the host, assign a new host if possible
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;

      socket.to(roomCode).emit('new_host', {
        playerId: room.players[0].id,
        nickname: room.players[0].nickname,
      });
    }
  } else if (controllerIndex !== -1) {
    // Handle controller leaving
    const controller = room.mobileControllers[controllerIndex];
    room.mobileControllers.splice(controllerIndex, 1);

    socket.to(roomCode).emit('controller_left', {
      id: controller.id,
      nickname: controller.nickname,
    });
  }

  // Leave socket.io room
  socket.leave(roomCode);
  socket.emit('left_room', { roomCode });

  // Clean up empty rooms
  if (room.players.length === 0 && room.mobileControllers.length === 0) {
    getRooms().delete(roomCode);
    console.log(
      `Room ${roomCode} deleted - no players or controllers remaining`
    );
  }
}
