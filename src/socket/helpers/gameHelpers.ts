import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
  Room,
  QuestionData,
  GameResult,
  Player,
  MobileController,
} from '../../types/gameTypes';
import { addRoom, getRoom, removeRoom, getRooms } from '../../store/roomStore';
import {
  defaultQuestions,
  questionsByCategory,
} from '../../constants/questions';
import { generateRoomCode } from '../../utils/codeGenerator';

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
    return null;
  }

  // Generate room code with extra validation
  const roomCode = generateRoomCode();
  if (!roomCode || roomCode.trim().length !== 6) {
    console.error('❌ Failed to generate valid room code');
    return null;
  }

  const hostNickname = (nickname || 'Host').trim();

  const defaultGameSettings: Room['gameSettings'] = {
    maxPlayers: 8,
    roundTime: 30,
    totalRounds: 10,
  };

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

  // Log detailed room creation information
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

    // Verify room was added
    const verifyRoom = getRoom(roomCode);
    if (!verifyRoom) {
      console.error(`❌ Failed to retrieve newly created room: ${roomCode}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Room creation failed:', error);
    return null;
  }

  try {
    // Join socket to room
    socket.join(roomCode);
  } catch (joinError) {
    console.error('❌ Failed to join room socket:', joinError);
    return null;
  }

  // Comprehensive room created event
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
) {
  const logPrefix = `⚡ [Room ${roomCode}]`;
  console.log(
    `${logPrefix} Join Attempt:`,
    JSON.stringify({
      socketId: socket.id,
      nickname,
      isMobileController,
    })
  );

  // Extensive room retrieval logging
  const rooms = getRooms();
  console.log(`${logPrefix} Total Rooms: ${rooms.size}`);
  rooms.forEach((r, code) => {
    console.log(
      `${logPrefix} Existing Room: ${code}, Players: ${r.players.length}`
    );
  });

  const room = getRoom(roomCode);
  if (!room) {
    console.error(`${logPrefix} ❌ Room not found`);

    // Log additional debugging information
    console.log(`${logPrefix} Room Code Details:`, {
      length: roomCode.length,
      trimmedLength: roomCode.trim().length,
      roomCode: roomCode,
    });

    socket.emit('error', {
      message: 'Room not found',
      details: {
        roomCode,
        totalRooms: rooms.size,
        existingRoomCodes: Array.from(rooms.keys()),
      },
    });
    return false;
  }
}

export function validateRoomCode(roomCode: string): boolean {
  // Ensure room code is not empty and meets specific criteria
  if (!roomCode || roomCode.trim() === '') {
    console.warn('❌ Invalid room code: Empty or whitespace');
    return false;
  }

  // Optional: Add more validation rules
  // For example, check length, allowed characters, etc.
  if (roomCode.length !== 6) {
    console.warn(`❌ Invalid room code length: ${roomCode}`);
    return false;
  }

  // Verify room exists in store
  const room = getRoom(roomCode);
  if (!room) {
    console.warn(`❌ Room with code ${roomCode} does not exist`);
    return false;
  }

  return true;
}

// Function to attempt room recovery
export function recoverRoom(roomCode: string, socket: Socket): Room | null {
  const room = getRoom(roomCode);

  if (!room) {
    console.error(`❌ Cannot recover room: ${roomCode} not found`);
    return null;
  }

  // Attempt to re-add socket to room
  try {
    socket.join(roomCode);
  } catch (joinError) {
    console.error('❌ Failed to rejoin room socket:', joinError);
    return null;
  }

  console.log(`🔄 Recovered room: ${roomCode}`);
  return room;
}

export function startGame(
  io: Server,
  socket: Socket,
  roomCode: string,
  categoryId?: string,
  categoryType?: string
): void {
  console.log('🚀 Starting game request:', {
    roomCode,
    socketId: socket.id,
    categoryId,
    categoryType,
  });

  const room = getRoom(roomCode);
  if (!room) {
    console.error(`❌ Room ${roomCode} not found for starting game`);
    socket.emit('error', { message: 'Sala no encontrada' });
    return;
  }

  // If the game is already in progress, force it anyway.
  if (room.status !== 'waiting') {
    console.log(`⚠️ Game in room ${roomCode} already started, forcing restart`);

    io.to(roomCode).emit('game_started', {
      roomCode: roomCode,
      currentRound: room.currentRound || 1,
      totalRounds: room.gameSettings.totalRounds,
      category: room.category,
      categoryType: room.categoryType,
      forceStart: true,
    });

    // Force question start anyway
    setTimeout(() => {
      console.log(`🔥 Forcing first question start for room ${roomCode}`);
      startNewQuestion(io, roomCode);
    }, 1500);

    return;
  }

  // Update game status
  room.status = 'playing';
  room.currentRound = 1;

  // Update category if provided

  if (categoryId) {
    room.category = categoryId;
  }

  if (categoryType) {
    room.categoryType = categoryType;
  }

  console.log(`🎮 Game starting in room ${roomCode} with:`, {
    category: room.category,
    categoryType: room.categoryType,
    currentRound: room.currentRound,
    totalRounds: room.gameSettings.totalRounds,
  });

  // IMPORTANT: Ensure that this event is broadcast to ALL customers in the room.
  io.to(roomCode).emit('game_started', {
    roomCode: roomCode,
    currentRound: room.currentRound,
    totalRounds: room.gameSettings.totalRounds,
    category: room.category,
    categoryType: room.categoryType,
  });

  console.log(`🎮 Game_started event issued for room ${roomCode} with data:`, {
    roomCode: roomCode,
    currentRound: room.currentRound,
    category: room.category,
    categoryType: room.categoryType,
  });

  // Start the first question after a short delay.
  setTimeout(() => {
    console.log(`⏱️ Starting first question for room ${roomCode}`);
    startNewQuestion(io, roomCode);
  }, 1500);
}

export function checkAllReady(io: Server, room: Room): boolean {
  const allReady =
    room.mobileControllers.length > 0 &&
    room.mobileControllers.every((c) => c.isReady);

  console.log('⚠️ All ready?', allReady, {
    controllersCount: room.mobileControllers.length,
    readyCount: room.mobileControllers.filter((c) => c.isReady).length,
  });

  if (allReady && room.status === 'waiting') {
    console.log('⚠️ All players ready, starting the game!');
    room.status = 'playing';
    room.currentRound = 1;

    io.to(room.roomCode).emit('game_started', {
      currentRound: room.currentRound,
      totalRounds: room.gameSettings.totalRounds,
      category: room.category,
      categoryType: room.categoryType,
    });

    startNewQuestion(io, room.roomCode);
    return true;
  }

  return false;
}

export function startNewQuestion(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) {
    console.log(`⚠️ Room ${roomCode} not found for new question`);
    return;
  }

  // Reset answer flags for all players and controllers
  room.players.forEach((player) => {
    player.hasAnswered = false;
  });

  room.mobileControllers.forEach((controller) => {
    controller.hasAnswered = false;
  });

  // Clear any existing timer to avoid duplication
  if (room.timer) {
    console.log(`⚠️ Clearing existing timer for room ${roomCode}`);
    clearInterval(room.timer);
    room.timer = undefined;
  }

  // Ensure currentRound is at least 1
  if (room.currentRound <= 0) {
    console.log(`⚠️ Fixing currentRound for room ${roomCode}`);
    room.currentRound = 1;
  }

  console.log(
    `⚠️ Starting new question for room ${roomCode}, round ${room.currentRound}`
  );

  // Get questions based on category, or use default if category not available
  let questions = defaultQuestions;
  if (room.category && questionsByCategory[room.category]) {
    questions = questionsByCategory[room.category];
    console.log(`⚠️ Using category ${room.category} questions`);
  } else {
    console.log(`⚠️ Using default questions (no category found)`);
  }

  // Verify that we have questions
  if (!questions || questions.length === 0) {
    io.to(roomCode).emit('error', {
      message: 'No questions found for this category',
    });
    return;
  }

  // Select a question based on the current round
  const questionIndex = (room.currentRound - 1) % questions.length;

  // Verify that there is a question in that index
  if (!questions[questionIndex]) {
    io.to(roomCode).emit('error', { message: 'Error loading question' });
    return;
  }

  const questionData = questions[questionIndex];

  console.log(`⚠️ Selected question: ${questionData.question}`);

  const questionId = uuidv4();

  // Set a minimum time limit of 20 seconds to ensure enough time
  const timeLimit = Math.max(20, room.gameSettings.roundTime || 30);

  const questionToSend: QuestionData = {
    question: {
      id: questionId,
      question: questionData.question,
      correctOptionId: questionData.correctOptionId,
      order: room.currentRound,
      totalQuestions: room.gameSettings.totalRounds,
    },
    options: questionData.options,
    timeLimit: timeLimit,
  };

  // Save current question for reference
  room.currentQuestion = questionToSend;

  // Set the initial time in the room
  room.timeRemaining = timeLimit;

  console.log(`⚠️ Emitting new_question to room ${roomCode}`);
  console.log(`⚠️ Setting timer for ${room.timeRemaining} seconds`);

  // Send the question to all clients in the room
  io.to(roomCode).emit('new_question', questionToSend);

  // Send initial time explicitly to synchronize all clients
  io.to(roomCode).emit('timer_update', timeLimit);

  // Store the exact start time for precise synchronization
  const startTime = Date.now();
  let lastSecondSent = timeLimit;

  // Create a precise 1-second interval to update the timer
  room.timer = setInterval(() => {
    // Calculate elapsed time since start in seconds
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Calculate remaining time based on elapsed time
    const remainingSeconds = timeLimit - elapsedSeconds;

    // Update the remaining time in the room
    room.timeRemaining = Math.max(0, remainingSeconds);

    // Only send updates when the second changes
    if (room.timeRemaining !== lastSecondSent) {
      lastSecondSent = room.timeRemaining;

      // Log with timestamp for debugging
      const timestamp = new Date().toISOString().substr(11, 8);
      console.log(
        `⏱️ [${timestamp}] Room ${roomCode}: timer=${room.timeRemaining}s`
      );

      // Send update to all clients
      io.to(roomCode).emit('timer_update', room.timeRemaining);
    }

    // End when time reaches zero
    if (room.timeRemaining <= 0) {
      clearInterval(room.timer);
      room.timer = undefined;

      console.log(`⚠️ Time's up for question in room ${roomCode}`);

      // Make sure we have the current question and send question_ended with correct answer
      if (room.currentQuestion && room.currentQuestion.question) {
        io.to(roomCode).emit('question_ended', {
          correctAnswer: room.currentQuestion.question.correctOptionId,
          timeUp: true,
        });
      }

      // Handle automatic progression if needed
    }
  }, 1000); // Exact 1-second interval
}
export function submitAnswer(
  io: Server,
  socket: Socket,
  roomCode: string,
  answer: string
): void {
  const room = getRoom(roomCode);
  if (!room || room.status !== 'playing') {
    socket.emit('error', {
      message: 'Room not found or game not in playing state',
    });
    return;
  }

  // Verify we have a current question
  if (!room.currentQuestion || !room.currentQuestion.question) {
    socket.emit('error', { message: 'No current question available' });
    return;
  }

  // Get the correct answer from the current question
  const correctAnswer = room.currentQuestion.question.correctOptionId;
  const isCorrect = correctAnswer === answer;

  console.log(
    `Answer submitted by ${socket.id}: ${answer} (Correct: ${isCorrect})`
  );

  // Check if this is from a mobile controller
  const isMobileController = room.mobileControllers.some(
    (c) => c.id === socket.id
  );

  if (isMobileController) {
    const controller = room.mobileControllers.find((c) => c.id === socket.id);
    if (controller) {
      // Initialize properties if they don't exist
      controller.score = controller.score ?? 0;
      controller.correctAnswers = controller.correctAnswers ?? 0;
      controller.wrongAnswers = controller.wrongAnswers ?? 0;

      // Mark this controller as having answered
      controller.hasAnswered = true;

      if (isCorrect) {
        controller.score += 1;
        controller.correctAnswers += 1;
      } else {
        controller.wrongAnswers += 1;
      }

      // Send result ONLY to the player who answered
      socket.emit('answer_result', {
        correct: isCorrect,
        score: controller.score,
        totalCorrect: controller.correctAnswers,
        totalWrong: controller.wrongAnswers,
      });

      // Notify everyone else that a player has answered WITHOUT revealing correctness
      io.to(roomCode).emit('player_answered', {
        playerId: socket.id,
        nickname: controller.nickname,
        answer,
        score: controller.score,
      });

      // Check if all controllers have answered
      const allControllersAnswered =
        room.mobileControllers.length > 0 &&
        room.mobileControllers.every((c) => c.hasAnswered === true);

      // If all have answered, end the question
      if (allControllersAnswered) {
        console.log(
          `All controllers have answered in room ${roomCode}. Ending question...`
        );

        // Emit question_ended with correctAnswer to all clients
        io.to(roomCode).emit('question_ended', {
          correctAnswer: correctAnswer,
          allAnswered: true,
        });
      }
    }
  } else {
    // Similar logic for web players
    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      // Mark this player as having answered
      player.hasAnswered = true;

      if (isCorrect) {
        player.score += 1;
        player.correctAnswers += 1;
      } else {
        player.wrongAnswers += 1;
      }

      // Send result ONLY to the player who answered
      socket.emit('answer_result', {
        correct: isCorrect,
        correctAnswer: correctAnswer,
        score: player.score,
        totalCorrect: player.correctAnswers,
        totalWrong: player.wrongAnswers,
      });

      // Notify everyone else that a player has answered WITHOUT revealing correctness
      io.to(roomCode).emit('player_answered', {
        playerId: player.id,
        nickname: player.nickname,
        answer,
        score: player.score,
      });

      // Check if all players have answered
      const allPlayersAnswered =
        room.players.length > 0 &&
        room.players.every((p) => p.hasAnswered === true);

      // If all have answered, end the question
      if (allPlayersAnswered) {
        console.log(
          `All players have answered in room ${roomCode}. Ending question...`
        );

        // Emit question_ended with correctAnswer to all clients
        io.to(roomCode).emit('question_ended', {
          correctAnswer: correctAnswer,
          allAnswered: true,
        });
      }
    }
  }
  const allParticipantsAnswered =
    (room.players.length > 0 || room.mobileControllers.length > 0) &&
    room.players.every((p) => p.hasAnswered === true) &&
    room.mobileControllers.every((c) => c.hasAnswered === true);

  if (allParticipantsAnswered) {
    console.log(
      `All participants have answered in room ${roomCode}. Ending question...`
    );

    io.to(roomCode).emit('question_ended', {
      correctAnswer: correctAnswer,
      allAnswered: true,
    });
  }
}

export function endGame(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;

  // Limpiar cualquier temporizador existente
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = undefined;
  }

  // Use the status value defined in the Room interface ('ended')
  room.status = 'finished';

  // Prepare results with explicit type
  const results: Record<
    string,
    {
      nickname: string;
      score: number;
      correctAnswers: number;
      totalAnswers: number;
    }
  > = {};

  // Log antes de crear los resultados
  console.log(
    `🏆 Room ${roomCode} players before creating results:`,
    room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score || 0,
      correctAnswers: p.correctAnswers || 0,
      wrongAnswers: p.wrongAnswers || 0,
    }))
  );

  console.log(
    `🏆 Room ${roomCode} controllers before creating results:`,
    room.mobileControllers.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      score: c.score || 0,
      correctAnswers: c.correctAnswers || 0,
      wrongAnswers: c.wrongAnswers || 0,
    }))
  );

  // Agregar jugadores regulares
  room.players.forEach((player) => {
    results[player.id] = {
      nickname: player.nickname,
      score: player.score || 0,
      correctAnswers: player.correctAnswers || 0,
      totalAnswers: (player.correctAnswers || 0) + (player.wrongAnswers || 0),
    };
  });

  // Also include mobile controllers in results
  room.mobileControllers.forEach((controller) => {
    // Asegurarse de que existan los datos de puntuación
    results[controller.id] = {
      nickname: controller.nickname,
      score: controller.score || 0,
      correctAnswers: controller.correctAnswers || 0,
      totalAnswers:
        (controller.correctAnswers || 0) + (controller.wrongAnswers || 0),
    };
  });

  // Registrar información detallada para depuración
  console.log(`🏆 Game ended in room ${roomCode} with results:`, {
    playersCount: room.players.length,
    controllersCount: room.mobileControllers.length,
    resultsCount: Object.keys(results).length,
  });

  // Log individual player results
  Object.entries(results).forEach(([playerId, playerResult]) => {
    console.log(
      `🏆 Player ${playerResult.nickname} (${playerId}) result:`,
      playerResult
    );
  });

  // Enviar resultados a todos los clientes
  io.to(roomCode).emit('game_ended', {
    results,
  });

  // También emitir un evento específico para los players y otro para los controllers
  room.players.forEach((player) => {
    io.to(player.id).emit('your_game_result', {
      score: player.score || 0,
      correctAnswers: player.correctAnswers || 0,
      totalAnswers: (player.correctAnswers || 0) + (player.wrongAnswers || 0),
    });
  });

  room.mobileControllers.forEach((controller) => {
    io.to(controller.id).emit('your_game_result', {
      score: controller.score || 0,
      correctAnswers: controller.correctAnswers || 0,
      totalAnswers:
        (controller.correctAnswers || 0) + (controller.wrongAnswers || 0),
    });
  });
}
