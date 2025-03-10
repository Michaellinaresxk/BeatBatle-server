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

  // Asegurarse de que el formato de la pregunta sea consistente
  const questionToSend: QuestionData = {
    question: {
      id: questionId,
      question: questionData.question,
      correctOptionId: questionData.correctOptionId,
      order: room.currentRound,
      totalQuestions: room.gameSettings.totalRounds,
    },
    options: questionData.options,
    timeLimit: room.gameSettings.roundTime,
  };

  // Save current question for reference
  room.currentQuestion = questionToSend;

  console.log(`⚠️ Emitting new_question to room ${roomCode}`);
  console.log(`⚠️ Question data:`, JSON.stringify(questionToSend));

  // Enviar la pregunta a todos los clientes en la sala
  io.to(roomCode).emit('new_question', questionToSend);

  // Comenzar el temporizador para la pregunta
  let timeRemaining = room.gameSettings.roundTime;
  const timer = setInterval(() => {
    timeRemaining--;
    io.to(roomCode).emit('timer_update', timeRemaining);

    if (timeRemaining <= 0) {
      clearInterval(timer);
      console.log(`⚠️ Time's up for question in room ${roomCode}`);

      // Asegurarse de que todos reciban el ID de la respuesta correcta
      io.to(roomCode).emit('question_ended', {
        correctAnswer: questionData.correctOptionId,
      });

      // Progresión automática si no hay controladores móviles
      if (room.mobileControllers.length === 0) {
        room.currentRound++;
        if (room.currentRound <= room.gameSettings.totalRounds) {
          setTimeout(() => {
            startNewQuestion(io, roomCode);
          }, 5000);
        } else {
          endGame(io, roomCode);
        }
      }
    }
  }, 1000);
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

  // Check if this is from a mobile controller
  const isMobileController = room.mobileControllers.some(
    (c) => c.id === socket.id
  );

  // Verificar si tenemos una pregunta actual
  if (!room.currentQuestion || !room.currentQuestion.question) {
    socket.emit('error', { message: 'No current question available' });
    return;
  }

  // Obtener la respuesta correcta de la pregunta actual
  const correctAnswer = room.currentQuestion.question.correctOptionId;
  const isCorrect = correctAnswer === answer;

  console.log(
    `Answer submitted by ${socket.id}: ${answer} (Correct: ${isCorrect})`
  );

  if (isMobileController) {
    const controller = room.mobileControllers.find((c) => c.id === socket.id);
    if (controller) {
      // Send result to the controller
      socket.emit('answer_result', {
        correct: isCorrect,
        correctAnswer: correctAnswer,
      });

      // Broadcast to everyone else
      io.to(roomCode).emit('player_answered', {
        playerId: socket.id,
        nickname: controller.nickname,
        answer,
        isCorrect,
      });
    }
  } else {
    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      // Update player score if answer is correct
      if (isCorrect) {
        player.score += 100;
        player.correctAnswers += 1;
      } else {
        player.wrongAnswers += 1;
      }

      // Enviar resultado al jugador
      socket.emit('answer_result', {
        correct: isCorrect,
        correctAnswer: correctAnswer,
      });

      // Broadcast to everyone else
      io.to(roomCode).emit('player_answered', {
        playerId: player.id,
        nickname: player.nickname,
        answer,
        isCorrect,
      });
    }
  }
}

export function endGame(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;

  // Use the status value defined in the Room interface ('ended')
  room.status = 'finished';

  // Prepare results
  const results: GameResult = {};
  room.players.forEach((player) => {
    results[player.id] = {
      nickname: player.nickname,
      score: player.score,
      correctAnswers: player.correctAnswers,
      totalAnswers: player.correctAnswers + player.wrongAnswers,
    };
  });

  // Also include mobile controllers in results
  room.mobileControllers.forEach((controller) => {
    // We don't track scores for controllers in this implementation
    // but we could add that feature
    results[controller.id] = {
      nickname: controller.nickname,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
    };
  });

  io.to(roomCode).emit('game_ended', {
    results,
  });
}
