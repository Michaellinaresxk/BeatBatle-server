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

        const success = joinRoom(socket, { ...data, isMobileController: true });

        if (success) {
          // Si es exitoso, emitir un evento específico al host para que navegue a selección
          const room = getRoom(data.roomCode.trim().toUpperCase());
          if (room && room.hostId) {
            // Enviar evento solo al host
            io.to(room.hostId).emit('goto_quiz_selection', {
              roomCode: data.roomCode,
            });
          }
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

    socket.on('controller_direction', (data) => {
      console.log('➡️ RECIBIDO controller_direction:', {
        socketId: socket.id,
        data: data,
      });
      if (!data || !data.roomCode || !data.direction) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      console.log(
        `📡 Controller direction: ${data.direction} in room ${normalizedRoomCode}`
      );

      // Reenviar a TODOS los clientes en la sala
      io.to(normalizedRoomCode).emit('controller_direction', {
        direction: data.direction,
        playerId: socket.id,
      });
    });

    socket.on('controller_enter', (data) => {
      console.log('➡️ RECIBIDO controller_enter:', {
        socketId: socket.id,
        data: data,
      });
      if (!data || !data.roomCode) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      console.log(`📡 Controller ENTER in room ${normalizedRoomCode}`);

      // Reenviar a TODOS los clientes en la sala
      io.to(normalizedRoomCode).emit('controller_enter', {
        playerId: socket.id,
      });
    });
    socket.on('send_controller_command', (data) => {
      if (!data || !data.roomCode || !data.action) {
        console.error('❌ Datos de comando inválidos');
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (!room) {
        console.error(
          `❌ Room ${normalizedRoomCode} not found for controller command`
        );
        return;
      }

      console.log(
        `📡 Reenviando comando del controlador: ${data.action} a sala ${normalizedRoomCode}`,
        data
      );

      // Reenviar el comando a todos los clientes web en la sala
      io.to(normalizedRoomCode).emit('send_controller_command', {
        ...data,
        playerId: socket.id,
        nickname:
          room.mobileControllers.find((c) => c.id === socket.id)?.nickname ||
          'Unknown',
      });
    });

    // Manejar cambios de pantalla
    socket.on('screen_changed', (data) => {
      if (!data || !data.roomCode || !data.screen) {
        console.error('❌ Datos de cambio de pantalla inválidos');
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (!room) {
        console.error(
          `❌ Room ${normalizedRoomCode} not found for screen change`
        );
        return;
      }

      console.log(
        `📡 Notificando cambio de pantalla a controladores: ${data.screen} en sala ${normalizedRoomCode}`
      );

      // Solo enviar a controladores móviles, no a todos los clientes
      room.mobileControllers.forEach((controller) => {
        io.to(controller.id).emit('screen_changed', {
          screen: data.screen,
          options: data.options || [],
        });
      });
    });

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
        const { roomCode, isReady } = data;
        console.log('🔄 Toggle ready state:', data);

        const normalizedRoomCode = roomCode.trim().toUpperCase();
        const room = getRoom(normalizedRoomCode);

        if (!room) {
          console.error(
            `❌ Room ${normalizedRoomCode} not found for toggle ready`
          );
          return;
        }

        // Encontrar controlador
        const controllerIndex = room.mobileControllers.findIndex(
          (c) => c.id === socket.id
        );

        if (controllerIndex === -1) {
          console.error(
            `❌ Controller ${socket.id} not found in room ${normalizedRoomCode}`
          );
          return;
        }

        // Actualizar estado listo
        room.mobileControllers[controllerIndex].isReady = isReady;

        // Log detallado de los controladores
        console.log(
          `📊 Estado de controladores en sala ${normalizedRoomCode}:`,
          room.mobileControllers.map((c) => ({
            id: c.id,
            nickname: c.nickname,
            isReady: c.isReady,
          }))
        );

        // Emitir estado actualizado
        io.to(normalizedRoomCode).emit('player_ready', {
          playerId: socket.id,
          nickname: room.mobileControllers[controllerIndex].nickname,
          isReady: isReady,
        });

        // Verificar si todos están listos
        const allControllersReady =
          room.mobileControllers.length > 0 &&
          room.mobileControllers.every((c) => c.isReady);

        console.log(
          `🔍 ¿Todos los controladores listos? ${allControllersReady} (${
            room.mobileControllers.filter((c) => c.isReady).length
          }/${room.mobileControllers.length})`
        );

        // Si todos están listos, iniciar juego
        if (allControllersReady && room.status === 'waiting') {
          console.log(
            `🚀 Todos los controladores listos, iniciando juego en sala ${normalizedRoomCode}`
          );

          // Cambiar estado del juego
          room.status = 'playing';

          // Notificar a todos los clientes
          io.to(normalizedRoomCode).emit('all_ready', {
            message: 'Todos los jugadores están listos',
          });

          // Este evento debería hacer que los clientes naveguen a la pantalla adecuada
          io.to(normalizedRoomCode).emit('game_started', {
            currentRound: room.currentRound || 1,
            totalRounds: room.gameSettings?.totalRounds || 10,
            category: room.category,
            categoryType: room.categoryType,
          });
        }
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

    socket.on('send_controller_command', (data) => {
      if (!data || !data.roomCode || !data.action) {
        console.error('❌ Datos de comando inválidos');
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (!room) {
        console.error(
          `❌ Room ${normalizedRoomCode} not found for controller command`
        );
        return;
      }

      console.log(
        `📡 Reenviando comando del controlador: ${data.action} a sala ${normalizedRoomCode}`,
        data
      );

      // Reenviar el comando a todos los clientes web en la sala
      io.to(normalizedRoomCode).emit('send_controller_command', {
        ...data,
        playerId: socket.id,
        nickname:
          room.mobileControllers.find((c) => c.id === socket.id)?.nickname ||
          'Unknown',
      });
    });

    // Manejar cambios de pantalla
    socket.on('screen_changed', (data) => {
      if (!data || !data.roomCode || !data.screen) {
        console.error('❌ Datos de cambio de pantalla inválidos');
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (!room) {
        console.error(
          `❌ Room ${normalizedRoomCode} not found for screen change`
        );
        return;
      }

      console.log(
        `📡 Notificando cambio de pantalla a controladores: ${data.screen} en sala ${normalizedRoomCode}`
      );

      // Solo enviar a controladores móviles, no a todos los clientes
      room.mobileControllers.forEach((controller) => {
        io.to(controller.id).emit('screen_changed', {
          screen: data.screen,
          options: data.options || [],
        });
      });
    });

    socket.on('screen_changed', (data) => {
      const { roomCode, screen, options } = data;
      if (!roomCode) return;

      const room = getRoom(roomCode);
      if (!room) return;

      // Enviar el cambio de pantalla solo a los controladores móviles
      room.mobileControllers.forEach((controller) => {
        io.to(controller.id).emit('screen_changed', { screen, options });
      });
    });

    // También para el feedback del controlador
    socket.on('controller_feedback', (data) => {
      const { roomCode, playerId } = data;
      if (!roomCode || !playerId) return;

      const room = getRoom(roomCode);
      if (!room) return;

      // Encontrar el controlador específico
      const controller = room.mobileControllers.find((c) => c.id === playerId);
      if (controller) {
        io.to(controller.id).emit('controller_feedback', data);
      }
    });

    socket.on('controller_direction', (data) => {
      if (!data || !data.roomCode || !data.direction) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      console.log(
        `📡 Controller direction: ${data.direction} in room ${normalizedRoomCode}`
      );

      // Reenviar a TODOS los clientes en la sala
      io.to(normalizedRoomCode).emit('controller_direction', {
        direction: data.direction,
        playerId: socket.id,
      });
    });

    socket.on('controller_enter', (data) => {
      if (!data || !data.roomCode) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      console.log(`📡 Controller ENTER in room ${normalizedRoomCode}`);

      // Reenviar a TODOS los clientes en la sala
      io.to(normalizedRoomCode).emit('controller_enter', {
        playerId: socket.id,
      });
    });

    // Manejar la selección del tipo de quiz
    socket.on(
      'select_quiz_type',
      (data: { roomCode: string; quizType: string }) => {
        console.log('Quiz type selected:', data);
        const { roomCode, quizType } = data;

        const room = getRoom(roomCode);
        if (!room) {
          console.error(`Room ${roomCode} not found`);
          return;
        }

        // Actualizar el tipo de quiz en la sala
        room.quizType = quizType;

        // Notificar a todos los clientes en la sala sobre la selección
        io.to(roomCode).emit('quiz_type_selected', { quizType });

        // Opcionalmente, puedes iniciar la siguiente fase del juego aquí
        // Por ejemplo, cargar las preguntas para el tipo de quiz seleccionado
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
