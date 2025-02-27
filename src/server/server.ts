import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { errorHandler } from '../middlewares/errorHandler';
import initializeSocket from '../socket/gameSocket';

const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(
  cors({
    origin: '*', // In production, change this to your specific domain
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, change this to your specific domain
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.use(errorHandler);

initializeSocket(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Socket.IO server ready for WebSocket connections`);
});
