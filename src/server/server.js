// src/server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const quizRoutes = require('../routes/quizRoutes');

// Load environment variables
dotenv.config();

// Initialize Socket.io with our game socket handler
const initializeGameSocket = require('../socket/gameSocket').default;

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: '*', // In production, you should restrict this
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-app')
  .then(() => {
    console.log('Successfully connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// Configure Socket.io
const io = new Server(server, {
  cors: corsOptions,
  path: '/socket.io',
  connectTimeout: 30000,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  perMessageDeflate: true,
  maxHttpBufferSize: 1e8,
});

// Add middleware for logging connections
io.use((socket, next) => {
  const address = socket.handshake.address;
  console.log(`New socket connection from IP: ${address} - ID: ${socket.id}`);
  next();
});

// Add handler for connection errors
io.engine.on('connection_error', (err) => {
  console.log(
    `Connection error: ${err.code} - ${err.message} - ${err.context}`
  );
});

// Initialize the socket event handlers
initializeGameSocket(io);

// Basic routes
app.get('/', (req, res) => {
  res.send('Quiz App Server is running');
});

// API routes
app.use('/api/quiz', quizRoutes);

// Diagnostic route for listing active rooms
app.get('/api/diagnostics/rooms', (req, res) => {
  try {
    const socketIds = Array.from(io.sockets.adapter.sids.keys());
    const roomsInfo = Array.from(io.sockets.adapter.rooms.keys())
      .filter((room) => !socketIds.includes(room))
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
    console.error('Error getting room information:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Controller routes
app.post('/api/control/:roomCode/:action', (req, res) => {
  const { roomCode, action } = req.params;
  const { direction } = req.body;

  console.log(`API received command: ${action} ${direction || ''} for room ${roomCode}`);

  // Forward through socket.io
  if (action === 'direction' && direction) {
    io.to(roomCode).emit('controller_direction', { direction });
  } else if (action === 'enter') {
    io.to(roomCode).emit('controller_enter', {});
  }

  res.json({ success: true });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Socket.IO available at http://localhost:${PORT}/socket.io`);
  console.log(`📚 Quiz API available at http://localhost:${PORT}/api/quiz`);
});

module.exports = server;