// Mejoras para server.ts - Configuraciones del servidor Socket.IO

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import initializeSocket from '../socket/gameSocket';

const app = express();
const server = http.createServer(app);

// Configurar CORS apropiadamente para Express y Socket.IO
const corsOptions = {
  origin: '*', // En producción, deberías restringir esto
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Crear el servidor Socket.IO con configuración mejorada
const io = new Server(server, {
  cors: corsOptions,
  path: '/socket.io',
  connectTimeout: 30000, // Aumentar timeout a 30 segundos
  pingTimeout: 60000, // Aumentar ping timeout a 60 segundos
  pingInterval: 25000, // Aumentar ping interval a 25 segundos
  transports: ['websocket', 'polling'], // Permitir ambos modos pero websocket es preferido
  allowUpgrades: true,
  perMessageDeflate: true, // Compresión para mejor rendimiento
  maxHttpBufferSize: 1e8, // 100 MB para soportar archivos más grandes si es necesario
});

// Añadir middleware para registrar conexiones y manejo de errores
io.use((socket, next) => {
  const address = socket.handshake.address;
  console.log(`Nueva conexión socket desde IP: ${address} - ID: ${socket.id}`);

  // Puedes añadir validación de autenticación aquí si es necesario

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

// Ruta básica para comprobar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Beat Battle Server está funcionando');
});

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

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en puerto ${PORT}`);
  console.log(`🔗 Socket.IO disponible en http://localhost:${PORT}`);
});

export default server;
