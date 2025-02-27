import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { errorHandler } from '../middlewares/errorHandler';
import initializeSocket from '../socket/gameSocket';

const app = express();
const httpServer = createServer(app);

// Improved CORS configuration for mobile clients
app.use(
  cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    credentials: true,
  })
);

// Socket.IO configuration with WebSocket prioritized for Expo
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // For Expo compatibility, prioritize WebSocket
  transports: ['websocket', 'polling'],
  // Path (make sure it matches client)
  path: '/socket.io/',
  // Increased timeouts
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  // Max buffer size
  maxHttpBufferSize: 1e8, // 100MB
});

// Add a debug middleware to log all Socket.IO connections
io.use((socket, next) => {
  console.log('New socket connection attempt:', socket.id);
  console.log('Transport used:', socket.conn.transport.name);
  console.log('Request origin:', socket.handshake.headers.origin || 'Unknown');
  console.log('Query params:', socket.handshake.query);
  next();
});

// Add a simple ping handler to test connectivity
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('ping_test', (callback) => {
    if (typeof callback === 'function') {
      callback({
        status: 'success',
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    } else {
      socket.emit('pong_test', {
        status: 'success',
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
  });
});

app.use(express.json());

// More CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Enhanced health check endpoint with more details for debugging
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      socketio: {
        transports: ['polling', 'websocket'],
        connected: Object.keys(io.sockets.sockets).length,
      },
    },
  });
});

// Simple ping/pong for connection testing
app.get('/api/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    time: new Date().toISOString(),
    headers: req.headers['user-agent'],
  });
});

// Debug endpoint with proper error handling
app.get('/debug/rooms', (req, res) => {
  try {
    // This will need to be implemented based on your room storage mechanism
    // For now, return a basic success message
    res.json({
      success: true,
      message: 'Debug info would go here',
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in debug/rooms endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Add socket testing endpoint
app.get('/websocket-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WebSocket Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          #status { padding: 10px; border-radius: 4px; }
          .connected { background-color: #d4edda; color: #155724; }
          .disconnected { background-color: #f8d7da; color: #721c24; }
          #log { height: 200px; overflow-y: auto; background: #f8f8f8; padding: 10px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>WebSocket Connection Test</h1>
        <p>Testing raw WebSocket connection to detect network issues</p>
        
        <div id="status">Disconnected</div>
        <button id="connect">Connect WebSocket</button>
        <button id="disconnect" disabled>Disconnect</button>
        
        <h2>Log</h2>
        <div id="log"></div>
        
        <script>
          const log = document.getElementById('log');
          const status = document.getElementById('status');
          const connectBtn = document.getElementById('connect');
          const disconnectBtn = document.getElementById('disconnect');
          
          let ws = null;
          
          function logMessage(msg) {
            const line = document.createElement('div');
            line.textContent = new Date().toLocaleTimeString() + ' - ' + msg;
            log.appendChild(line);
            log.scrollTop = log.scrollHeight;
          }
          
          connectBtn.addEventListener('click', () => {
            try {
              // Connect directly to the WebSocket endpoint
              const wsUrl = location.origin.replace(/^http/, 'ws') + '/socket.io/?EIO=4&transport=websocket';
              logMessage('Connecting to: ' + wsUrl);
              
              ws = new WebSocket(wsUrl);
              
              ws.onopen = () => {
                logMessage('WebSocket connected!');
                status.textContent = 'Connected';
                status.className = 'connected';
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                
                // Send a Socket.IO v4 connection packet
                ws.send('40');
              };
              
              ws.onmessage = (event) => {
                logMessage('Received: ' + event.data);
                
                // If we get a ping, send a pong
                if (event.data === '2') {
                  ws.send('3');
                  logMessage('Sent pong response');
                }
              };
              
              ws.onerror = (error) => {
                logMessage('Error: ' + JSON.stringify(error));
                status.textContent = 'Error';
                status.className = 'disconnected';
              };
              
              ws.onclose = (event) => {
                logMessage('Closed: ' + event.code + ' ' + event.reason);
                status.textContent = 'Disconnected';
                status.className = 'disconnected';
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
                ws = null;
              };
            } catch (err) {
              logMessage('Exception: ' + err.message);
            }
          });
          
          disconnectBtn.addEventListener('click', () => {
            if (ws) {
              ws.close();
              logMessage('Disconnected by user');
              status.textContent = 'Disconnected';
              status.className = 'disconnected';
              connectBtn.disabled = false;
              disconnectBtn.disabled = true;
            }
          });
        </script>
      </body>
    </html>
  `);
});

// Global error handler
app.use(errorHandler);

// Initialize socket with better error handling
try {
  initializeSocket(io);
  console.log('Socket.IO initialized successfully');
} catch (error) {
  console.error('Failed to initialize Socket.IO:', error);
}

// Improved global error handlers with more details
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  // Don't exit the process to maintain availability
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit the process to maintain availability
});

const PORT = process.env.PORT || 3000;
// No longer using HOST variable since it causes TypeScript errors

// Use a different approach to listen on all interfaces to avoid TypeScript errors
httpServer.listen(
  {
    port: PORT,
    host: '0.0.0.0', // Listen on all available network interfaces
  },
  () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(
      `📱 Socket.IO server ready for connections at http://localhost:${PORT}/socket.io/`
    );
    console.log(`✅ Health check available at http://localhost:${PORT}/health`);
    console.log(
      `🔍 Test page available at http://localhost:${PORT}/socket-test`
    );
  }
);

// For graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
