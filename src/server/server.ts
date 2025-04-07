// Mejoras para server.ts - Configuraciones del servidor Socket.IO

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import initializeSocket from '../socket/gameSocket';

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Conexión exitosa a MongoDB');
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err);
  });

const app = express();
const server = http.createServer(app);

// Configurar CORS apropiadamente para Express y Socket.IO
const corsOptions = {
  origin: '*', // En producción, deberías restringir esto
  methods: ['GET', 'POST', 'OPTIONS'], // Añadir OPTIONS para preflight requests
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // Agregar 'Accept'
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions,
  path: '/socket.io',
  connectTimeout: 30000,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'], // Invertir el orden: primero polling, luego websocket
  allowUpgrades: true,
  perMessageDeflate: true,
  maxHttpBufferSize: 1e8,
});

// Añadir middleware para registrar conexiones y manejo de errores
io.use((socket, next) => {
  const address = socket.handshake.address;
  console.log(`Nueva conexión socket desde IP: ${address} - ID: ${socket.id}`);
  next();
});

// Añadir manejo para errores a nivel de socket engine
io.engine.on('connection_error', (err) => {
  console.log(
    `Error de conexión: ${err.code} - ${err.message} - ${err.context}`
  );
});

// Inicializar los manejadores de socket
initializeSocket(io);

// Rutas básicas
app.get('/', (req, res) => {
  res.send('Quiz App Server está funcionando');
});

// Integrar rutas de la API
app.use('/api/quiz', quizRoutes);

// Ruta de diagnóstico para listar las salas activas
app.get('/api/diagnostics/rooms', (req, res) => {
  try {
    // Obtener todas las salas y filtrar las que son realmente salas (no conexiones individuales)
    const socketIds = Array.from(io.sockets.adapter.sids.keys());
    const roomsInfo = Array.from(io.sockets.adapter.rooms.keys())
      .filter((room) => !socketIds.includes(room)) // Filtrar salas que no son IDs de socket
      .map((roomId) => {
        const clientsInRoom = Array.from(
          io.sockets.adapter.rooms.get(roomId) || []
        );
        return {
          roomId,
          clientCount: clientsInRoom.length,
          clients: clientsInRoom,
        };
      });

    res.json({
      totalRooms: roomsInfo.length,
      rooms: roomsInfo,
    });
  } catch (error) {
    console.error('Error al obtener información de salas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas para el controlador
app.post('/api/control/:roomCode/:action', (req, res) => {
  const { roomCode, action } = req.params;
  const { direction } = req.body;

  console.log(
    `API recibió comando: ${action} ${direction || ''} para sala ${roomCode}`
  );

  // Reenviar a través de socket.io
  if (action === 'direction' && direction) {
    io.to(roomCode).emit('controller_direction', { direction });
  } else if (action === 'enter') {
    io.to(roomCode).emit('controller_enter', {});
  }

  res.json({ success: true });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en puerto ${PORT}`);
  console.log(`🔗 Socket.IO disponible en http://localhost:${PORT}/socket.io`);
  console.log(`📚 API de Quiz disponible en http://localhost:${PORT}/api/quiz`);
});

export default server;
