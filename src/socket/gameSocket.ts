import { Server, Socket } from 'socket.io';
import Room from '../models/Room';
import Player from '../models/Player';

// Mapeo de salas a dispositivos de visualización
const displaySockets = new Map<string, string>(); // roomCode -> socketId
const controllerSockets = new Map<string, Set<string>>(); // roomCode -> Set<socketId>

const inMemoryRooms = new Map();
const inMemoryPlayers = new Map();



export default function initializeSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(
      'Nuevo cliente conectado',
      socket.id,
      'desde',
      socket.handshake.address
    );

    socket.on('disconnect', () => {
      console.log('Desconexión:', socket.id);
    });

    socket.on('ping_test', (data) => {
      console.log('Ping recibido de cliente:', data);
      socket.emit('pong_test', {
        message: 'Servidor respondiendo a ping',
        originalTimestamp: data.timestamp,
        serverTime: new Date().toISOString(),
      });
    });

    // Anfitrión crea una sala (desde la SPA)
    socket.on('create_room', async () => {
      try {
        const roomCode = generateRoomCode();

        // En lugar de crear en DB, almacenamos en memoria
        inMemoryRooms.set(roomCode, {
          roomCode,
          hostId: socket.id,
          status: 'waiting',
          players: [],
          gameSettings: {
            maxPlayers: 8,
            roundTime: 30,
            totalRounds: 10,
          },
        });

        // Guardar socket del display (SPA)
        displaySockets.set(roomCode, socket.id);

        // Inicializar conjunto de controladores para esta sala
        controllerSockets.set(roomCode, new Set());

        socket.join(roomCode);
        socket.emit('room_created', {
          roomCode,
          hostId: socket.id,
        });

        console.log(`Sala creada: ${roomCode}`);
      } catch (error) {
        console.error('Error al crear sala:', error);
        socket.emit('error', { message: 'Error al crear sala' });
      }
    });

    // Pantalla (SPA) se conecta a una sala existente
    socket.on('join_display', async (data: { roomCode: string }) => {
      try {
        const room = await Room.findOne({ roomCode: data.roomCode });

        if (!room) {
          return socket.emit('error', { message: 'Sala no encontrada' });
        }

        // Actualizar el socket del display para esta sala
        displaySockets.set(data.roomCode, socket.id);

        socket.join(data.roomCode);
        socket.emit('display_joined', {
          roomCode: data.roomCode,
          status: room.status,
          currentPlayers: room.players.length,
          gameSettings: room.gameSettings,
        });

        console.log(`Display unido a sala: ${data.roomCode}`);
      } catch (error) {
        console.error('Error al unir display:', error);
        socket.emit('error', { message: 'Error al unir display' });
      }
    });

    // Controlador (Expo) se une a una sala
    socket.on(
      'join_controller',
      async (data: { roomCode: string; nickname: string }) => {
        try {
          const { roomCode, nickname } = data;
          const room = await Room.findOne({ roomCode });

          if (!room) {
            return socket.emit('error', { message: 'Sala no encontrada' });
          }

          if (room.status !== 'waiting') {
            return socket.emit('error', {
              message: 'El juego ya ha comenzado',
            });
          }

          // Crear jugador en la base de datos
          const player = await Player.create({
            socketId: socket.id,
            nickname,
            roomId: roomCode,
            isHost: room.players.length === 0, // Primer jugador es el anfitrión
          });

          // Añadir jugador a la sala
          room.players.push(player.id);
          await room.save();

          // Registrar este socket como controlador
          if (!controllerSockets.has(roomCode)) {
            controllerSockets.set(roomCode, new Set());
          }
          const controllers = controllerSockets.get(roomCode);
          if (controllers) {
            controllers.add(socket.id);
          }

          socket.join(roomCode);

          // Notificar al display que un nuevo jugador se ha unido
          const displaySocketId = displaySockets.get(roomCode);
          if (displaySocketId) {
            io.to(displaySocketId).emit('player_joined', {
              playerId: player.id,
              nickname,
              isHost: player.isHost,
            });
          }

          socket.emit('controller_joined', {
            playerId: player.id,
            nickname,
            isHost: player.isHost,
            roomCode,
          });

          // Notificar a todos los controladores sobre el nuevo jugador
          socket.to(roomCode).emit('player_joined_broadcast', {
            playerId: player.id,
            nickname,
            isHost: player.isHost,
          });

          console.log(
            `Controlador unido a sala: ${roomCode}, Jugador: ${nickname}`
          );
        } catch (error) {
          console.error('Error al unir controlador:', error);
          socket.emit('error', { message: 'Error al unir controlador' });
        }
      }
    );

    // Host inicia el juego
    socket.on('start_game', async () => {
      try {
        // Encontrar en qué sala está este socket como host
        const player = await Player.findOne({
          socketId: socket.id,
          isHost: true,
        });
        if (!player)
          return socket.emit('error', {
            message: 'No eres el anfitrión de ninguna sala',
          });

        const room = await Room.findOne({ roomCode: player.roomId });
        if (!room)
          return socket.emit('error', { message: 'Sala no encontrada' });

        // Cambiar estado a jugando
        room.status = 'playing';
        room.currentRound = 1;
        await room.save();

        // Notificar a todos en la sala
        io.to(room.roomCode).emit('game_started', {
          currentRound: room.currentRound,
          totalRounds: room.gameSettings.totalRounds,
        });

        // Iniciar primera pregunta
        startNewQuestion(io, room.roomCode);

        console.log(`Juego iniciado en sala: ${room.roomCode}`);
      } catch (error) {
        console.error('Error al iniciar juego:', error);
        socket.emit('error', { message: 'Error al iniciar juego' });
      }
    });

    // Controlador envía un comando de dirección (arriba, abajo, izquierda, derecha, enter)
    socket.on('control_input', async (data: { direction: string }) => {
      try {
        const player = await Player.findOne({ socketId: socket.id });
        if (!player) return;

        const room = await Room.findOne({ roomCode: player.roomId });
        if (!room) return;

        // Obtener el socket del display
        const displaySocketId = displaySockets.get(room.roomCode);
        if (displaySocketId) {
          // Enviar el comando al display (SPA)
          io.to(displaySocketId).emit('control_action', {
            playerId: player.id,
            nickname: player.nickname,
            isHost: player.isHost,
            action: data.direction,
          });
        }

        console.log(`Control input de ${player.nickname}: ${data.direction}`);
      } catch (error) {
        console.error('Error al procesar control input:', error);
      }
    });

    // Jugador envía respuesta a una pregunta
    socket.on('submit_answer', async (data: { answer: string }) => {
      try {
        const player = await Player.findOne({ socketId: socket.id });
        if (!player) return;

        const room = await Room.findOne({ roomCode: player.roomId });
        if (!room || room.status !== 'playing') return;

        // Aquí implementarías lógica para evaluar la respuesta
        const isCorrect = evaluateAnswer(room, data.answer);

        // Actualizar puntuación del jugador
        let pointsEarned = 0;
        if (isCorrect) {
          pointsEarned = 100; // Puntos base
          player.correctAnswers += 1;
          player.score += pointsEarned;
        } else {
          player.wrongAnswers += 1;
        }

        player.lastAnswer = new Date();
        await player.save();

        // Notificar al jugador sobre su resultado
        socket.emit('answer_result', {
          correct: isCorrect,
          points: pointsEarned,
          totalScore: player.score,
        });

        // Notificar al display
        const displaySocketId = displaySockets.get(room.roomCode);
        if (displaySocketId) {
          io.to(displaySocketId).emit('player_answered', {
            playerId: player.id,
            nickname: player.nickname,
            answer: data.answer,
            correct: isCorrect,
            points: pointsEarned,
          });
        }

        console.log(
          `Respuesta de ${player.nickname}: ${data.answer}, Correcta: ${isCorrect}`
        );
      } catch (error) {
        console.error('Error al procesar respuesta:', error);
      }
    });

    // Manejo de desconexión
    socket.on('disconnect', async () => {
      try {
        // Verificar si era un jugador
        const player = await Player.findOne({ socketId: socket.id });

        if (player) {
          const roomCode = player.roomId;

          // Eliminar de controllerSockets
          const controllers = controllerSockets.get(roomCode);
          if (controllers) {
            controllers.delete(socket.id);
          }

          // Si era host, designar nuevo host o terminar juego
          if (player.isHost) {
            const room = await Room.findOne({ roomCode });

            if (room) {
              // Encontrar otro jugador para ser host
              const nextPlayer = await Player.findOne({
                roomId: roomCode,
                socketId: { $ne: socket.id },
              });

              if (nextPlayer) {
                // Promover a nuevo host
                nextPlayer.isHost = true;
                await nextPlayer.save();

                // Notificar al nuevo host
                io.to(nextPlayer.socketId).emit('promoted_to_host');

                // Notificar a todos
                io.to(roomCode).emit('host_changed', {
                  playerId: nextPlayer.id,
                  nickname: nextPlayer.nickname,
                });
              } else {
                // No hay más jugadores, terminar juego
                io.to(roomCode).emit('game_ended', {
                  reason: 'no_players',
                });

                await Room.deleteOne({ roomCode });
                displaySockets.delete(roomCode);
                controllerSockets.delete(roomCode);
              }
            }
          }

          // Eliminar jugador
          await Player.deleteOne({ socketId: socket.id });

          // Notificar desconexión a todos
          io.to(roomCode).emit('player_disconnected', {
            playerId: player.id,
            nickname: player.nickname,
          });

          console.log(
            `Jugador desconectado: ${player.nickname} de sala ${roomCode}`
          );
        }
        // Verificar si era un display
        else {
          // Buscar en displaySockets
          for (const [roomCode, sockId] of displaySockets.entries()) {
            if (sockId === socket.id) {
              displaySockets.delete(roomCode);
              console.log(`Display desconectado de sala ${roomCode}`);

              // Notificar a los controladores
              if (controllerSockets.has(roomCode)) {
                const controllers = controllerSockets.get(roomCode);
                if (controllers) {
                  for (const controllerSocketId of controllers) {
                    io.to(controllerSocketId).emit('display_disconnected');
                  }
                }
              }

              break;
            }
          }
        }
      } catch (error) {
        console.error('Error al manejar desconexión:', error);
      }
    });
  });
}

// Generar código de sala aleatorio
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Datos de ejemplo para preguntas
const sampleQuestions = [
  {
    text: '¿Cuál es la capital de Francia?',
    options: {
      A: 'Londres',
      B: 'Madrid',
      C: 'París',
      D: 'Berlín',
    },
    correctAnswer: 'C',
  },
  {
    text: '¿En qué año comenzó la Segunda Guerra Mundial?',
    options: {
      A: '1939',
      B: '1941',
      C: '1945',
      D: '1918',
    },
    correctAnswer: 'A',
  },
  {
    text: '¿Qué planeta es conocido como el planeta rojo?',
    options: {
      A: 'Venus',
      B: 'Júpiter',
      C: 'Marte',
      D: 'Saturno',
    },
    correctAnswer: 'C',
  },
];

// Variables para seguimiento del estado del juego
const roomQuestions = new Map<string, any>(); // roomCode -> pregunta actual

// Iniciar nueva pregunta
async function startNewQuestion(io: Server, roomCode: string) {
  try {
    const room = await Room.findOne({ roomCode });
    if (!room) return;

    // Seleccionar una pregunta aleatoria
    const questionIndex = Math.floor(Math.random() * sampleQuestions.length);
    const question = sampleQuestions[questionIndex];

    // Guardar pregunta actual para esta sala
    roomQuestions.set(roomCode, question);

    // Obtener tiempo límite de las configuraciones
    const timeLimit = room.gameSettings.roundTime;

    // Enviar la pregunta a todos en la sala
    io.to(roomCode).emit('new_question', {
      questionNumber: room.currentRound,
      totalQuestions: room.gameSettings.totalRounds,
      question: {
        text: question.text,
        options: question.options,
      },
      timeLimit,
    });

    // Iniciar temporizador
    let timeLeft = timeLimit;
    const timer = setInterval(() => {
      timeLeft--;

      // Actualizar tiempo restante
      io.to(roomCode).emit('timer_update', { timeLeft });

      // Finalizar tiempo
      if (timeLeft <= 0) {
        clearInterval(timer);

        // Revelar respuesta correcta
        io.to(roomCode).emit('question_ended', {
          correctAnswer: question.correctAnswer,
        });

        // Esperar antes de la siguiente pregunta
        setTimeout(async () => {
          const currentRoom = await Room.findOne({ roomCode });
          if (!currentRoom) return;

          // Avanzar a la siguiente ronda
          if (currentRoom.currentRound < currentRoom.gameSettings.totalRounds) {
            currentRoom.currentRound += 1;
            await currentRoom.save();

            startNewQuestion(io, roomCode);
          } else {
            // Fin del juego
            currentRoom.status = 'finished';
            await currentRoom.save();

            // Recuperar todos los jugadores y sus puntuaciones
            const players = await Player.find({ roomId: roomCode }).sort({
              score: -1,
            });

            io.to(roomCode).emit('game_finished', {
              leaderboard: players.map((p) => ({
                playerId: p.id,
                nickname: p.nickname,
                score: p.score,
                correctAnswers: p.correctAnswers,
                wrongAnswers: p.wrongAnswers,
              })),
            });
          }
        }, 5000);
      }
    }, 1000);
  } catch (error) {
    console.error('Error al iniciar nueva pregunta:', error);
  }
}



// Evaluar respuesta del jugador
function evaluateAnswer(room: any, answer: string): boolean {
  const currentQuestion = roomQuestions.get(room.roomCode);
  if (!currentQuestion) return false;

  return answer === currentQuestion.correctAnswer;
}
