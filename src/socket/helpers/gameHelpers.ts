import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type { Room, QuestionData, GameResult } from '../../types/gameTypes';
import { getRoom } from '../../store/roomStore';
import {
  defaultQuestions,
  questionsByCategory,
} from '../../constants/questions';

/**
 * Starts a game in a room
 */
export function startGame(
  io: Server,
  socket: Socket,
  roomCode: string,
  category?: string
): boolean {
  const room = getRoom(roomCode);
  if (!room || room.hostId !== socket.id) {
    socket.emit('error', {
      message: 'You do not have permission to start the game',
    });
    return false;
  }

  // Update category if provided
  if (category && !room.category) {
    room.category = category;
  }

  room.status = 'playing';
  room.currentRound = 1;
  io.to(roomCode).emit('game_started', {
    currentRound: room.currentRound,
    totalRounds: room.gameSettings.totalRounds,
    category: room.category,
  });

  startNewQuestion(io, roomCode);
  return true;
}

/**
 * Checks if all controllers are ready and starts the game if they are
 */
export function checkAllReady(io: Server, room: Room): boolean {
  const allReady =
    room.mobileControllers.length > 0 &&
    room.mobileControllers.every((c) => c.isReady);

  console.log('⚠️ Todos listos?', allReady);

  if (allReady && room.status === 'waiting') {
    console.log('⚠️ Starting game!');
    room.status = 'playing';
    room.currentRound = 1;

    // IMPORTANTE: guardar la pregunta en la sala para nuevos jugadores
    const questionId = uuidv4();
    const questions =
      room.category && questionsByCategory[room.category]
        ? questionsByCategory[room.category]
        : defaultQuestions;

    const questionData = questions[0];
    room.currentQuestion = {
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

    // Notificar a todos
    io.to(room.roomCode).emit('game_started', {
      currentRound: room.currentRound,
      totalRounds: room.gameSettings.totalRounds,
      category: room.category,
    });

    // Iniciar primera pregunta
    startNewQuestion(io, room.roomCode);
    return true;
  }

  return false;
}

/**
 * Starts a new question in a room
 */
export function startNewQuestion(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) {
    console.log(`⚠️ Room ${roomCode} not found for new question`);
    return;
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

  // Seleccionar una pregunta basada en el round actual
  const questionIndex = (room.currentRound - 1) % questions.length;
  const questionData = questions[questionIndex];

  console.log(`⚠️ Selected question: ${questionData.question}`);

  const questionId = uuidv4();

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

  io.to(roomCode).emit('new_question', questionToSend);

  // Iniciar el temporizador
  let timeRemaining = room.gameSettings.roundTime;
  const timer = setInterval(() => {
    timeRemaining--;
    io.to(roomCode).emit('timer_update', timeRemaining);

    if (timeRemaining <= 0) {
      clearInterval(timer);
      console.log(`⚠️ Time's up for question in room ${roomCode}`);

      // Notificar a todos que la pregunta ha terminado
      io.to(roomCode).emit('question_ended', {
        correctAnswer: questionData.correctOptionId,
      });

      // Si no hay controllers móviles, avanzar automáticamente
      if (room.mobileControllers.length === 0) {
        // Verificar si necesitamos iniciar un nuevo round o terminar el juego
        room.currentRound++;
        if (room.currentRound <= room.gameSettings.totalRounds) {
          // Iniciar siguiente pregunta después de un delay
          setTimeout(() => {
            startNewQuestion(io, roomCode);
          }, 5000); // 5 segundos de delay entre preguntas
        } else {
          // Terminar el juego
          endGame(io, roomCode);
        }
      }
      // Si hay controllers móviles, esperar a que ellos soliciten la siguiente pregunta
    }
  }, 1000);
}

/**
 * Processes an answer submission
 */
export function submitAnswer(
  io: Server,
  socket: Socket,
  roomCode: string,
  answer: string
): void {
  const room = getRoom(roomCode);
  if (!room || room.status !== 'playing') return;

  // Check if this is from a mobile controller
  const isMobileController = room.mobileControllers.some(
    (c) => c.id === socket.id
  );

  // Find the current question to check if answer is correct
  let questions = defaultQuestions;
  if (room.category && questionsByCategory[room.category]) {
    questions = questionsByCategory[room.category];
  }

  const questionIndex = (room.currentRound - 1) % questions.length;
  const currentQuestion = questions[questionIndex];
  const isCorrect = currentQuestion.correctOptionId === answer;

  if (isMobileController) {
    const controller = room.mobileControllers.find((c) => c.id === socket.id);
    if (controller) {
      // Send result to the controller
      socket.emit('answer_result', {
        correct: isCorrect,
        correctAnswer: currentQuestion.correctOptionId,
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

      io.to(roomCode).emit('player_answered', {
        playerId: player.id,
        nickname: player.nickname,
        answer,
        isCorrect,
      });
    }
  }
}

/**
 * Ends a game and sends results to all players
 */
export function endGame(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;

  room.status = 'ended';

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
