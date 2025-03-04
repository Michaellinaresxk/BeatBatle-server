import type { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, leaveRoom } from './helpers/roomHelpers';
import {
  startGame,
  checkAllReady,
  submitAnswer,
  startNewQuestion,
  endGame,
} from './helpers/gameHelpers';
import { handleDisconnect } from './helpers/connectionHelpers';
import { getRoom, getRooms } from '../store/roomStore';

export default function initializeSocket(io: Server) {
  // Configurar opciones del servidor socket para mejorar la estabilidad
  io.engine.on('connection_error', (err) => {
    console.log('Connection error:', err.message);
  });

  io.on('connection', (socket: Socket) => {
    console.log(
      `🔌 Client connected: ${socket.id} from ${socket.handshake.address}`
    );

    // Debug: Registrar todos los eventos recibidos de este socket
    socket.onAny((event, ...args) => {
      console.log(
        `[SOCKET RECEIVED] ${event} from ${socket.id}:`,
        event !== 'error' ? JSON.stringify(args) : 'Error event'
      );
    });

    // Enviar un evento de conexión exitosa al cliente
    socket.emit('connection_established', {
      message: 'Connected to server',
      socketId: socket.id,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
    });

    // Información sobre las salas disponibles (solo para depuración)
    const rooms = getRooms();
    console.log(`📋 Rooms available: ${rooms.size}`);

    // Creación de sala
    socket.on(
      'create_room',
      (data: { category?: string; nickname?: string }) => {
        console.log('🏠 Create room request:', {
          socketId: socket.id,
          ...data,
        });
        const room = createRoom(socket, data);

        if (room) {
          console.log(`✅ Room created successfully: ${room.roomCode}`);
        } else {
          console.error('❌ Failed to create room');
          socket.emit('error', { message: 'Failed to create room' });
        }
      }
    );

    // Unirse a sala como cliente web
    socket.on('join_room', (data: { roomCode: string; nickname: string }) => {
      console.log('🚪 Join room request:', { socketId: socket.id, ...data });

      // Validar código de sala
      if (!data.roomCode || typeof data.roomCode !== 'string') {
        console.error('❌ Invalid room code:', data.roomCode);
        socket.emit('error', { message: 'Invalid room code format' });
        return;
      }

      // Normalizar código de sala (mayúsculas, sin espacios)
      const normalizedRoomCode = data.roomCode.trim().toUpperCase();

      const room = getRoom(normalizedRoomCode);
      if (!room) {
        console.error(`❌ Room not found: ${normalizedRoomCode}`);
        socket.emit('error', {
          message: 'Room not found. Please check the code and try again.',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      // Intentar unirse a la sala
      const success = joinRoom(socket, {
        ...data,
        roomCode: normalizedRoomCode,
        isMobileController: false,
      });

      if (success) {
        console.log(`✅ Client ${socket.id} joined room ${normalizedRoomCode}`);
      }
    });

    // Unirse a sala como controlador móvil
    socket.on(
      'join_controller',
      (data: { roomCode: string; nickname: string }) => {
        console.log('🎮 Join controller request:', {
          socketId: socket.id,
          ...data,
        });

        // Validar código de sala
        if (!data.roomCode || typeof data.roomCode !== 'string') {
          console.error('❌ Invalid room code for controller:', data.roomCode);
          socket.emit('error', { message: 'Invalid room code format' });
          return;
        }

        // Normalizar código de sala
        const normalizedRoomCode = data.roomCode.trim().toUpperCase();

        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Room not found for controller: ${normalizedRoomCode}`
          );
          socket.emit('error', {
            message: 'Room not found. Please check the code and try again.',
            code: 'ROOM_NOT_FOUND',
          });
          return;
        }

        // Intentar unirse como controlador móvil
        const success = joinRoom(socket, {
          ...data,
          roomCode: normalizedRoomCode,
          isMobileController: true,
        });

        if (success) {
          console.log(
            `✅ Controller ${socket.id} joined room ${normalizedRoomCode}`
          );
        }
      }
    );

    // Reconectar a sala (después de refrescar página o problemas de red)
    socket.on(
      'reconnect_to_room',
      (data: { roomCode: string; socketId?: string }) => {
        console.log('🔄 Reconnect attempt:', data);

        if (!data.roomCode) {
          console.error('❌ Missing room code for reconnection');
          socket.emit('error', {
            message: 'Missing room code for reconnection',
          });
          return;
        }

        const normalizedRoomCode = data.roomCode.trim().toUpperCase();
        const room = getRoom(normalizedRoomCode);

        if (!room) {
          console.error(
            `❌ Cannot reconnect: Room ${normalizedRoomCode} not found`
          );
          socket.emit('error', { message: 'Room not found for reconnection' });
          return;
        }

        // Comprobar si el cliente ya existe en la sala
        const isPlayer = room.players.some((p) => p.id === socket.id);
        const isController = room.mobileControllers.some(
          (c) => c.id === socket.id
        );

        if (isPlayer || isController) {
          // El cliente ya está en la sala, enviar el estado actual
          socket.join(normalizedRoomCode);

          socket.emit('room_rejoined', {
            roomCode: normalizedRoomCode,
            players: room.players,
            mobileControllers: room.mobileControllers,
            gameStatus: room.status,
            currentRound: room.currentRound,
            gameSettings: room.gameSettings,
            category: room.category,
            categoryType: room.categoryType,
            isHost: room.hostId === socket.id,
          });

          console.log(
            `✅ Client ${socket.id} rejoined room ${normalizedRoomCode}`
          );
        } else {
          console.log(
            `⚠️ Client ${socket.id} not found in room ${normalizedRoomCode}`
          );
          socket.emit('error', {
            message: 'You are not a member of this room',
            code: 'NOT_ROOM_MEMBER',
          });
        }
      }
    );

    socket.on(
      'reconnect_to_room',
      (data: { roomCode: string; socketId?: string }) => {
        console.log('🔄 Solicitud de reconexión recibida:', data);

        // Verificar parámetros
        if (!data || !data.roomCode) {
          console.error('❌ Datos de reconexión inválidos');
          socket.emit('error', {
            message: 'Datos de reconexión inválidos',
            code: 'INVALID_RECONNECT_DATA',
          });
          return;
        }

        // Normalizar código de sala
        const normalizedRoomCode = data.roomCode.trim().toUpperCase();

        // Verificar si la sala existe
        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Sala no encontrada para reconexión: ${normalizedRoomCode}`
          );
          socket.emit('error', {
            message: 'Room not found for reconnection',
            code: 'ROOM_NOT_FOUND',
          });
          return;
        }

        // Buscar al jugador o controlador en la sala
        const player = room.players.find((p) => p.id === socket.id);
        const controller = room.mobileControllers.find(
          (c) => c.id === socket.id
        );

        // Si el socket ID ya existe en la sala
        if (player || controller) {
          console.log(
            `✅ Cliente ya existe en la sala, actualizar estado para: ${socket.id}`
          );

          // El cliente ya está en la sala, solo unirlo al canal socket
          socket.join(normalizedRoomCode);

          // Enviar estado actual de la sala
          socket.emit('room_rejoined', {
            roomCode: normalizedRoomCode,
            players: room.players,
            mobileControllers: room.mobileControllers,
            gameStatus: room.status,
            currentRound: room.currentRound,
            currentQuestion: room.currentQuestion,
            gameSettings: room.gameSettings,
            category: room.category,
            categoryType: room.categoryType,
            isHost: room.hostId === socket.id,
          });

          console.log(
            `✅ Reconexión exitosa para ${socket.id} en sala ${normalizedRoomCode}`
          );
          return;
        }

        // En este caso, el socket ID no existe en la sala, pero la sala existe
        // Esto puede ocurrir si el usuario se desconectó y recibió un nuevo socket ID
        console.log(
          `⚠️ Cliente ${socket.id} no existe en la sala ${normalizedRoomCode}, sugerir unirse como nuevo`
        );

        // Informar al cliente que debe unirse como nuevo jugador
        socket.emit('reconnection_failed', {
          roomCode: normalizedRoomCode,
          message: 'Your session expired. Please join as a new player.',
          roomExists: true,
        });
      }
    );

    // Abandonar sala
    socket.on('leave_room', (data: { roomCode: string }) => {
      console.log('👋 Leave room request:', {
        socketId: socket.id,
        roomCode: data.roomCode,
      });

      if (!data.roomCode) {
        console.error('❌ Missing room code for leave operation');
        socket.emit('error', { message: 'Missing room code' });
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      leaveRoom(socket, normalizedRoomCode);
    });

    // Manejo de desconexión
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      handleDisconnect(socket);
    });

    // Inicio de juego
    socket.on(
      'start_game',
      (data: {
        roomCode: string;
        categoryId?: string;
        categoryType?: string;
      }) => {
        console.log('🎮 Start game request:', data);

        if (!data.roomCode) {
          console.error('❌ Missing room code for start game operation');
          socket.emit('error', { message: 'Missing room code' });
          return;
        }

        const { roomCode, categoryId, categoryType } = data;
        const normalizedRoomCode = roomCode.trim().toUpperCase();

        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Room ${normalizedRoomCode} not found for starting game`
          );
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (room.hostId !== socket.id) {
          console.error(
            `❌ Client ${socket.id} is not the host of room ${normalizedRoomCode}`
          );
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }

        if (room.status !== 'waiting') {
          console.log(
            `⚠️ Game in room ${normalizedRoomCode} has already started`
          );
          return;
        }

        // Iniciar el juego con la categoría seleccionada
        startGame(io, socket, normalizedRoomCode, categoryId, categoryType);
      }
    );

    // Solicitar pregunta actual
    socket.on('request_current_question', (data: { roomCode: string }) => {
      if (!data.roomCode) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (room && room.currentQuestion) {
        socket.emit('new_question', room.currentQuestion);
      }
    });

    // Envío de respuesta
    socket.on('submit_answer', (data: { roomCode: string; answer: string }) => {
      console.log('📝 Answer submitted:', data);

      if (!data.roomCode || !data.answer) {
        console.error('❌ Invalid answer submission data');
        socket.emit('error', { message: 'Invalid answer submission' });
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      submitAnswer(io, socket, normalizedRoomCode, data.answer);
    });

    // Solicitar siguiente pregunta
    socket.on('request_next_question', (data: { roomCode: string }) => {
      if (!data.roomCode) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (!room) {
        console.error(
          `❌ Room ${normalizedRoomCode} not found for next question`
        );
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.status === 'playing') {
        room.currentRound++;

        if (room.currentRound <= room.gameSettings.totalRounds) {
          startNewQuestion(io, normalizedRoomCode);
        } else {
          endGame(io, normalizedRoomCode);
        }
      }
    });

    // Cambiar estado "listo"
    socket.on(
      'toggle_ready',
      (data: { roomCode: string; isReady: boolean }) => {
        console.log('🔄 Toggle ready state:', data);

        if (!data.roomCode) {
          console.error('❌ Missing room code for toggle ready operation');
          socket.emit('error', { message: 'Missing room code' });
          return;
        }

        const { roomCode, isReady } = data;
        const normalizedRoomCode = roomCode.trim().toUpperCase();

        // Comprobar si la sala existe
        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Room ${normalizedRoomCode} not found for toggle ready`
          );
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Buscar el controlador en la sala
        const controllerIndex = room.mobileControllers.findIndex(
          (c) => c.id === socket.id
        );

        if (controllerIndex === -1) {
          console.error(
            `❌ Controller ${socket.id} not found in room ${normalizedRoomCode}`
          );
          socket.emit('error', {
            message: 'You are not registered as a controller in this room',
          });
          return;
        }

        // Actualizar el estado "listo" del controlador
        room.mobileControllers[controllerIndex].isReady = isReady;
        console.log(
          `✅ Controller ${socket.id} ready state updated to: ${isReady}`
        );

        // Emitir el estado actualizado a todos los miembros de la sala
        io.to(normalizedRoomCode).emit('player_ready', {
          playerId: socket.id,
          nickname: room.mobileControllers[controllerIndex].nickname,
          isReady: isReady,
        });

        // Comprobar si todos están listos
        checkAllReady(io, room);
      }
    );

    // Actualizar categoría
    socket.on(
      'update_room_category',
      (data: {
        roomCode: string;
        categoryType: string;
        categoryId: string;
      }) => {
        console.log('🔄 Update category request:', data);

        if (!data.roomCode || !data.categoryType || !data.categoryId) {
          console.error('❌ Invalid category update data');
          socket.emit('error', { message: 'Invalid category data' });
          return;
        }

        const { roomCode, categoryType, categoryId } = data;
        const normalizedRoomCode = roomCode.trim().toUpperCase();

        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Room ${normalizedRoomCode} not found for category update`
          );
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Actualizar categoría
        room.category = categoryId;
        room.categoryType = categoryType;

        // Notificar a todos los miembros de la sala
        io.to(normalizedRoomCode).emit('category_updated', {
          categoryType,
          categoryId,
        });

        console.log(
          `✅ Category updated for room ${normalizedRoomCode}: ${categoryType} - ${categoryId}`
        );
      }
    );

    // Seleccionar tipo de quiz
    socket.on(
      'select_quiz_type',
      (data: { roomCode: string; quizType: string }) => {
        console.log('🔄 Select quiz type request:', data);

        if (!data.roomCode || !data.quizType) {
          console.error('❌ Invalid quiz type selection data');
          socket.emit('error', { message: 'Invalid quiz type data' });
          return;
        }

        const { roomCode, quizType } = data;
        const normalizedRoomCode = roomCode.trim().toUpperCase();

        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Room ${normalizedRoomCode} not found for quiz type selection`
          );
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Navegar a selección de categoría
        io.to(normalizedRoomCode).emit('goto_category_selection', {
          categoryType: quizType,
        });

        console.log(
          `✅ Quiz type selected for room ${normalizedRoomCode}: ${quizType}`
        );
      }
    );

    // Seleccionar categoría específica
    socket.on(
      'select_category',
      (data: { roomCode: string; categoryId: string }) => {
        console.log('🔄 Select category request:', data);

        if (!data.roomCode || !data.categoryId) {
          console.error('❌ Invalid category selection data');
          socket.emit('error', { message: 'Invalid category data' });
          return;
        }

        const { roomCode, categoryId } = data;
        const normalizedRoomCode = roomCode.trim().toUpperCase();

        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Room ${normalizedRoomCode} not found for category selection`
          );
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Actualizar categoría
        room.category = categoryId;

        // Notificar a todos los miembros de la sala
        io.to(normalizedRoomCode).emit('category_selected', {
          categoryId,
        });

        console.log(
          `✅ Category selected for room ${normalizedRoomCode}: ${categoryId}`
        );
      }
    );
  });
}
