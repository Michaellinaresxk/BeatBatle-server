import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameSettings, Player, QuestionData } from '../types/gameTypes';
import { defaultQuestions, questionsByCategory } from '../constants/questions';

// First, let's properly define the Room interface with currentQuestion

interface Room {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'ended';
  players: Player[];
  gameSettings: GameSettings;
  currentRound: number;
  scores: Map<string, number>;
  category: string | null;
  mobileControllers: any[]; // Replace with actual controller type
  currentQuestion?: QuestionData | null; // Make this optional to fix the TypeScript error
}

const rooms = new Map<string, Room>();

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
        const room = rooms.get(data.roomCode);

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

      const room = rooms.get(roomCode);
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

    // Answer submission
    socket.on('submit_answer', (data: { roomCode: string; answer: string }) => {
      submitAnswer(io, socket, data.roomCode, data.answer);
    });

    // Request next question
    socket.on('request_next_question', (data: { roomCode: string }) => {
      const room = rooms.get(data.roomCode);
      if (room && room.status === 'playing') {
        room.currentRound++;
        if (room.currentRound <= room.gameSettings.totalRounds) {
          startNewQuestion(io, data.roomCode);
        } else {
          endGame(io, data.roomCode);
        }
      }
    });

    // En tu gameSocket.ts, añade este evento
    socket.on('toggle_ready', (data) => {
      const { roomCode, isReady } = data;
      console.log('⚠️ Recibido toggle_ready:', {
        roomCode,
        isReady,
        socketId: socket.id,
      });

      const room = rooms.get(roomCode);
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

// Fix the function signature with proper types
function checkAllReady(io: Server, room: Room) {
  const allReady =
    room.mobileControllers.length > 0 &&
    room.mobileControllers.every((c: any) => c.isReady);

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
  }
}

function createRoom(socket: Socket, category?: string) {
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

  rooms.set(roomCode, room);
  socket.join(roomCode);
  socket.emit('room_created', {
    roomCode,
    hostId: socket.id,
    category: room.category,
  });
}

function joinRoom(
  socket: Socket,
  roomCode: string,
  nickname: string,
  isMobileController = false
) {
  console.log(
    `⚠️ Joining room ${roomCode} as ${
      isMobileController ? 'controller' : 'player'
    } with nickname ${nickname}`
  );

  const room = rooms.get(roomCode);
  if (!room) {
    console.log(`⚠️ Room ${roomCode} not found`);
    socket.emit('error', { message: 'Room not found' });
    return;
  }

  // Solo verificar el estado para jugadores regulares, permitir que los controladores se unan en cualquier momento
  if (!isMobileController && room.status !== 'waiting') {
    console.log(
      `⚠️ Game in room ${roomCode} has already started, regular player can't join`
    );
    socket.emit('error', { message: 'Game has already started' });
    return;
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
}

function startGame(
  io: Server,
  socket: Socket,
  roomCode: string,
  category?: string
) {
  const room = rooms.get(roomCode);
  if (!room || room.hostId !== socket.id) {
    socket.emit('error', {
      message: 'You do not have permission to start the game',
    });
    return;
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
}

function submitAnswer(
  io: Server,
  socket: Socket,
  roomCode: string,
  answer: string
) {
  const room = rooms.get(roomCode);
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

function handleDisconnect(socket: Socket) {
  console.log('Client disconnected', socket.id);

  for (const [roomCode, room] of rooms.entries()) {
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

      if (room.players.length === 0 && room.mobileControllers.length === 0) {
        rooms.delete(roomCode);
      }
      return;
    }

    // Check if it's a mobile controller
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

      if (room.players.length === 0 && room.mobileControllers.length === 0) {
        rooms.delete(roomCode);
      }
      return;
    }
  }
}

function leaveRoom(socket: Socket, roomCode: string) {
  const room = rooms.get(roomCode);
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
      rooms.delete(roomCode);
    }
  }
  socket.leave(roomCode);
}

function startNewQuestion(io: Server, roomCode: string) {
  const room = rooms.get(roomCode);
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

  const questionToSend = {
    question: {
      id: questionId,
      question: questionData.question,
      correctOptionId: questionData.correctOptionId,
      // audioUrl: questionData.audioUrl || null,
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

function endGame(io: Server, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.status = 'ended';

  // Prepare results
  const results: Record<string, any> = {};
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

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
