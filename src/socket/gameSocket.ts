// src/socket/gameSocket.ts
import type { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, leaveRoom } from './helpers/roomHelpers';
import { submitAnswer, startNewQuestion, endGame } from './helpers/gameHelpers';
import { handleDisconnect } from './helpers/connectionHelpers';
import { getRoom, getRooms } from '../store/roomStore';

export default function initializeSocket(io: Server): void {
  io.engine.on('connection_error', (err) => {
    console.log('Connection error:', err.message);
  });

  io.on('connection', (socket: Socket) => {
    console.log(
      `🔌 Client connected: ${socket.id} from ${socket.handshake.address}`
    );

    // Debug: Log all events received from this socket
    socket.onAny((event, ...args) => {
      console.log(
        `[SOCKET RECEIVED] ${event} from ${socket.id}:`,
        event !== 'error' ? JSON.stringify(args) : 'Error event'
      );
    });

    // Send a successful connection event to the client
    socket.emit('connection_established', {
      message: 'Connected to server',
      socketId: socket.id,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
    });

    const rooms = getRooms();
    console.log(`📋 Rooms available: ${rooms.size}`);

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

    socket.on('join_room', (data: { roomCode: string; nickname: string }) => {
      console.log('🚪 Join room request:', { socketId: socket.id, ...data });

      // Validate room code
      if (!data.roomCode || typeof data.roomCode !== 'string') {
        console.error('❌ Invalid room code:', data.roomCode);
        socket.emit('error', { message: 'Invalid room code format' });
        return;
      }

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

      // Attempt to join the room
      const success = joinRoom(socket, {
        ...data,
        roomCode: normalizedRoomCode,
        isMobileController: false,
      });

      if (success) {
        console.log(`✅ Client ${socket.id} joined room ${normalizedRoomCode}`);
      }
    });

    // Join the room as a mobile controller
    socket.on(
      'join_controller',
      (data: { roomCode: string; nickname: string }) => {
        console.log('🎮 Join controller request:', {
          socketId: socket.id,
          ...data,
        });

        if (!data.roomCode || typeof data.roomCode !== 'string') {
          console.error('❌ Invalid room code for controller:', data.roomCode);
          socket.emit('error', { message: 'Invalid room code format' });
          return;
        }
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

        const success = joinRoom(socket, {
          ...data,
          roomCode: normalizedRoomCode,
          isMobileController: true,
        });

        if (success) {
          const room = getRoom(normalizedRoomCode);
          if (room && room.hostId) {
            io.to(room.hostId).emit('goto_quiz_selection', {
              roomCode: normalizedRoomCode,
            });
          }

          // If game is already in progress, send game_started event to controller
          // ONLY if selection is complete
          if (
            room &&
            room.status === 'playing' &&
            room.category &&
            room.categoryType
          ) {
            console.log(
              `🎮 Game already in progress, sending game_started to new controller ${socket.id}`
            );
            socket.emit('game_started', {
              roomCode: normalizedRoomCode,
              currentRound: room.currentRound,
              totalRounds: room.gameSettings?.totalRounds || 10,
              category: room.category,
              categoryType: room.categoryType,
              gameReady: true,
            });

            // Also send current question if it exists
            if (room.currentQuestion) {
              socket.emit('new_question', room.currentQuestion);
            }
          } else {
            console.log(
              `🎮 Game not ready yet or selection incomplete for controller ${socket.id}`
            );
          }
        }
      }
    );

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

        // Check if the client already exists in the room
        const isPlayer = room.players.some((p) => p.id === socket.id);
        const isController = room.mobileControllers.some(
          (c) => c.id === socket.id
        );

        if (isPlayer || isController) {
          // Customer is already in the room, send the current status
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

          // If game is already in progress, send game_started event
          // ONLY if selection is complete
          if (room.status === 'playing' && room.category && room.categoryType) {
            socket.emit('game_started', {
              roomCode: normalizedRoomCode,
              currentRound: room.currentRound,
              totalRounds: room.gameSettings?.totalRounds || 10,
              category: room.category,
              categoryType: room.categoryType,
              gameReady: true,
            });

            // Also send current question if it exists
            if (room.currentQuestion) {
              socket.emit('new_question', room.currentQuestion);
            }
          }

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

    socket.on('controller_direction', (data) => {
      if (!data || !data.roomCode || !data.direction) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      console.log(
        `📡 Controller direction: ${data.direction} in room ${normalizedRoomCode}`
      );

      io.to(normalizedRoomCode).emit('controller_direction', {
        direction: data.direction,
        playerId: socket.id,
      });
    });

    socket.on('controller_enter', (data) => {
      if (!data || !data.roomCode) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      console.log(`📡 Controller ENTER in room ${normalizedRoomCode}`);

      // Get room information
      const room = getRoom(normalizedRoomCode);
      if (!room) {
        console.error(
          `❌ Room ${normalizedRoomCode} not found for controller_enter`
        );
        return;
      }

      // Debug: Verify room state
      console.log(`🔍 Room state for ${normalizedRoomCode}:`, {
        status: room.status,
        category: room.category,
        categoryType: room.categoryType,
        currentRound: room.currentRound,
        isHost: room.hostId === socket.id,
        isController: room.mobileControllers.some((c) => c.id === socket.id),
      });

      // Forward event to everyone in the room
      io.to(normalizedRoomCode).emit('controller_enter', {
        playerId: socket.id,
      });

      // If game is already in progress, send game_started event to controller
      // ONLY if selection is complete
      if (room.status === 'playing' && room.category && room.categoryType) {
        console.log(
          `🎮 Game already in progress, sending game_started to controller ${socket.id}`
        );
        socket.emit('game_started', {
          roomCode: normalizedRoomCode,
          currentRound: room.currentRound,
          totalRounds: room.gameSettings?.totalRounds || 10,
          category: room.category,
          categoryType: room.categoryType,
          gameReady: true,
        });

        // Also send current question if it exists
        if (room.currentQuestion) {
          socket.emit('new_question', room.currentQuestion);
        }
      }
    });

    socket.on(
      'send_controller_command',
      (data: { roomCode: string; action: string; direction?: string }) => {
        console.log('Controller command received:', data);
        const { roomCode, action, direction } = data;

        if (!roomCode) {
          console.error('❌ Missing roomCode in controller command');
          return;
        }

        const normalizedRoomCode = roomCode.trim().toUpperCase();
        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(`❌ Room ${normalizedRoomCode} not found`);
          return;
        }

        // Resend the command to all clients in the room, except the sender.
        socket
          .to(normalizedRoomCode)
          .emit('controller_command', { action, direction });
      }
    );

    socket.on('screen_changed', (data) => {
      if (!data || !data.roomCode || !data.screen) {
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
        `📡 Notifying screen change to controllers: ${data.screen} room ${normalizedRoomCode}`
      );

      room.mobileControllers.forEach((controller) => {
        io.to(controller.id).emit('screen_changed', {
          screen: data.screen,
          options: data.options || [],
        });
      });
    });

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

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      handleDisconnect(socket);
    });

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

        // Update the type of quiz in the room
        room.quizType = quizType;
        io.to(normalizedRoomCode).emit('quiz_type_selected', {
          quizType,
          roomCode: normalizedRoomCode,
        });

        io.to(normalizedRoomCode).emit('category_selection', {
          roomCode: normalizedRoomCode,
          category: room.category,
          stage: 'main_category',
        });

        console.log(
          `✅ Quiz type selected for room ${normalizedRoomCode}: ${quizType}`
        );
      }
    );

    socket.on(
      'start_game',
      (data: {
        roomCode: string;
        categoryId?: string;
        categoryType?: string;
      }) => {
        console.log('🔍 start_game:', data);

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

        // Verify that we have category and category type
        if (!categoryId && !room.category) {
          console.error(`❌ Missing category for room ${normalizedRoomCode}`);
          socket.emit('error', {
            message: 'Please select a category before starting the game',
          });
          return;
        }

        if (!categoryType && !room.categoryType) {
          console.error(
            `❌ Missing category type for room ${normalizedRoomCode}`
          );
          socket.emit('error', {
            message: 'Please select a category type before starting the game',
          });
          return;
        }

        // Update the game status on the server
        room.status = 'playing';
        room.currentRound = 1; // Ensure currentRound is set to 1
        if (categoryId) room.category = categoryId;
        if (categoryType) room.categoryType = categoryType;

        // Only send game_started if we have all necessary information
        const hasCategory =
          room.category !== null && room.category !== undefined;
        const hasCategoryType =
          room.categoryType !== null && room.categoryType !== undefined;

        if (hasCategory && hasCategoryType) {
          console.log(
            `🔍 BROADCASTING game_started for room ${normalizedRoomCode}`,
            {
              roomCode: normalizedRoomCode,
              category: room.category,
              categoryType: room.categoryType,
              currentRound: room.currentRound,
              totalRounds: room.gameSettings?.totalRounds || 10,
              gameReady: true, // Add this flag to indicate the game is fully ready
            }
          );

          // Emit game_started with all necessary data
          io.to(normalizedRoomCode).emit('game_started', {
            roomCode: normalizedRoomCode,
            currentRound: room.currentRound,
            totalRounds: room.gameSettings?.totalRounds || 10,
            category: room.category,
            categoryType: room.categoryType,
            gameReady: true, // This flag will trigger navigation in the mobile app
          });

          // Start first question after a short delay
          setTimeout(() => {
            try {
              console.log(
                `🔍 Starting first question for room ${normalizedRoomCode}`
              );
              startNewQuestion(io, normalizedRoomCode);
            } catch (error) {
              console.error('🔍 Error starting first question:', error);
            }
          }, 2000);
        } else {
          console.error(
            `❌ Cannot start game: missing category or category type for room ${normalizedRoomCode}`
          );
          socket.emit('error', {
            message: 'Cannot start game: missing category or category type',
          });
        }
      }
    );

    // Request current question
    socket.on('request_current_question', (data: { roomCode: string }) => {
      if (!data.roomCode) return;

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (room && room.currentQuestion) {
        console.log(
          `📤 Sending current question to ${socket.id} for room ${normalizedRoomCode}`
        );
        socket.emit('new_question', room.currentQuestion);
      } else {
        console.log(
          `⚠️ No current question available for room ${normalizedRoomCode}`
        );
        // If no current question but game is in progress, start a new question
        if (
          room &&
          room.status === 'playing' &&
          room.category &&
          room.categoryType
        ) {
          console.log(
            `🔄 Starting new question for room ${normalizedRoomCode} on request`
          );
          startNewQuestion(io, normalizedRoomCode);
        } else {
          console.log(
            `⚠️ Game not ready or selection incomplete for room ${normalizedRoomCode}`
          );
          // Notify client that no question is available
          socket.emit('error', {
            message:
              'No current question available. Please make sure the game has started.',
          });
        }
      }
    });

    socket.on('submit_answer', (data: { roomCode: string; answer: string }) => {
      console.log('📝 Answer submitted:', data);

      if (!data.roomCode || !data.answer) {
        console.error('❌ Invalid answer submission data');
        socket.emit('error', { message: 'Invalid answer submission' });
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (!room || room.status !== 'playing') {
        console.error('❌ Room not found or game not in playing state');
        socket.emit('error', { message: 'Game not in playing state' });
        return;
      }

      // Check if we have a current question
      if (!room.currentQuestion) {
        console.error('❌ No current question available');
        socket.emit('error', { message: 'No current question available' });
        return;
      }

      // Get the current question and check if the answer is correct
      const correctAnswer = room.currentQuestion.question.correctOptionId;
      const isCorrect = correctAnswer === data.answer;

      console.log(
        `📊 Answer evaluation: ${
          isCorrect ? 'Correct' : 'Incorrect'
        } (submitted: ${data.answer}, correct: ${correctAnswer})`
      );

      // Send result to the controller that sent the answer
      socket.emit('answer_result', {
        correct: isCorrect,
        correctAnswer: correctAnswer,
      });

      // Notify everyone in the room about the answer
      const controller = room.mobileControllers.find((c) => c.id === socket.id);
      if (controller) {
        io.to(normalizedRoomCode).emit('player_answered', {
          playerId: socket.id,
          nickname: controller.nickname,
          answer: data.answer,
          isCorrect,
        });
      }

      submitAnswer(io, socket, normalizedRoomCode, data.answer);
    });

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

      if (room.status === 'playing' && room.category && room.categoryType) {
        room.currentRound++;

        if (room.currentRound <= room.gameSettings.totalRounds) {
          // Reset states for all clients before sending the new question
          io.to(normalizedRoomCode).emit('reset_question_state');

          // Small pause before sending the new question
          setTimeout(() => {
            console.log(
              `🔄 Starting question ${room.currentRound} for room ${normalizedRoomCode}`
            );
            startNewQuestion(io, normalizedRoomCode);
          }, 500);
        } else {
          console.log(
            `🏁 Ending game for room ${normalizedRoomCode} - all questions completed`
          );
          endGame(io, normalizedRoomCode);
        }
      } else {
        console.log(
          `⚠️ Game not ready or selection incomplete for room ${normalizedRoomCode}`
        );
        socket.emit('error', {
          message: 'Game not in playing state or missing category information',
        });
      }
    });

    // Change "ready" status
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

        const controllerIndex = room.mobileControllers.findIndex(
          (c) => c.id === socket.id
        );

        if (controllerIndex === -1) {
          console.error(
            `❌ Controller ${socket.id} not found in room ${normalizedRoomCode}`
          );
          return;
        }

        room.mobileControllers[controllerIndex].isReady = isReady;

        io.to(normalizedRoomCode).emit('player_ready', {
          playerId: socket.id,
          nickname: room.mobileControllers[controllerIndex].nickname,
          isReady: isReady,
        });

        const allControllersReady =
          room.mobileControllers.length > 0 &&
          room.mobileControllers.every((c) => c.isReady);

        // If everyone is ready, start game
        if (
          allControllersReady &&
          room.status === 'waiting' &&
          room.category &&
          room.categoryType
        ) {
          console.log(
            `🚀 All controllers ready, starting play in room ${normalizedRoomCode}`
          );

          room.status = 'playing';

          io.to(normalizedRoomCode).emit('all_ready', {
            message: 'All players are ready',
          });

          io.to(normalizedRoomCode).emit('game_started', {
            roomCode: normalizedRoomCode,
            currentRound: room.currentRound || 1,
            totalRounds: room.gameSettings?.totalRounds || 10,
            category: room.category,
            categoryType: room.categoryType,
            gameReady: true,
          });

          // Starting first question after short delay
          setTimeout(() => {
            try {
              console.log(
                `🔍 Starting first question after all_ready for room ${normalizedRoomCode}`
              );
              startNewQuestion(io, normalizedRoomCode);
            } catch (error) {
              console.error(
                '🔍 Error starting first question after all_ready:',
                error
              );
            }
          }, 2000);
        }
      }
    );

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

        room.category = categoryId;

        io.to(normalizedRoomCode).emit('category_selected', {
          categoryId,
          roomCode: normalizedRoomCode,
        });

        console.log(
          `✅ Category selected for room ${normalizedRoomCode}: ${categoryId}`
        );
      }
    );

    socket.on(
      'update_room_category',
      (data: {
        roomCode: string;
        categoryType: string;
        categoryId: string;
      }) => {
        console.log('🔄 Update room category request:', data);

        if (!data.roomCode || !data.categoryType || !data.categoryId) {
          console.error('❌ Invalid update room category data');
          socket.emit('error', {
            message: 'Invalid update room category data',
          });
          return;
        }

        const { roomCode, categoryType, categoryId } = data;
        const normalizedRoomCode = roomCode.trim().toUpperCase();

        const room = getRoom(normalizedRoomCode);
        if (!room) {
          console.error(
            `❌ Room ${normalizedRoomCode} not found for update room category`
          );
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        room.categoryType = categoryType;
        room.category = categoryId;

        io.to(normalizedRoomCode).emit('category_updated', {
          categoryType,
          categoryId,
          roomCode: normalizedRoomCode,
        });

        console.log(
          `✅ Room category updated for room ${normalizedRoomCode}: ${categoryType}/${categoryId}`
        );
      }
    );

    socket.on('request_game_results', (data) => {
      console.log('Game results requested for room:', data);

      if (!data || !data.roomCode) {
        console.error('❌ Missing room code for game results request');
        socket.emit('error', { message: 'Missing room code' });
        return;
      }

      const normalizedRoomCode = data.roomCode.trim().toUpperCase();
      const room = getRoom(normalizedRoomCode);

      if (!room) {
        console.error(
          `❌ Room ${normalizedRoomCode} not found for game results request`
        );
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Define results type explicitly to avoid TypeScript errors
      const results: Record<
        string,
        {
          nickname: string;
          score: number;
          correctAnswers: number;
          totalAnswers: number;
        }
      > = {};

      // Add regular players
      room.players.forEach((player) => {
        results[player.id] = {
          nickname: player.nickname,
          score: player.score || 0,
          correctAnswers: player.correctAnswers || 0,
          totalAnswers:
            (player.correctAnswers || 0) + (player.wrongAnswers || 0),
        };
      });

      // Add mobile controllers
      room.mobileControllers.forEach((controller) => {
        // Ensure score data exists
        results[controller.id] = {
          nickname: controller.nickname,
          score: controller.score || 0,
          correctAnswers: controller.correctAnswers || 0,
          totalAnswers:
            (controller.correctAnswers || 0) + (controller.wrongAnswers || 0),
        };
      });

      console.log(`Sending game results for room ${normalizedRoomCode}:`, {
        resultsCount: Object.keys(results).length,
        playerCount: room.players.length,
        mobileControllersCount: room.mobileControllers.length,
      });

      // Send results only to the client that requested them
      socket.emit('game_results', {
        results,
        roomCode: normalizedRoomCode,
      });
    });
  });
}
