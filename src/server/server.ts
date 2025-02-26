// import express from 'express';
// import http from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import { errorHandler } from '../middlewares/errorHandler';
// import gameRoutes from '../routes/gameRoutes';
// import initializeSocket from '../socket/gameSocket';
// import path from 'path';
// import dotenv from 'dotenv';

// dotenv.config();

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: '*', // MUY IMPORTANTE: Permite todas las conexiones para desarrollo
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//     credentials: true,
//   },
// });

// // Middleware CORS para Express
// app.use(
//   cors({
//     origin: '*', // IMPORTANTE: Permite todas las conexiones para desarrollo
//     credentials: true,
//   })
// );

// app.get('/cors-test', (req, res) => {
//   res.json({
//     status: 'ok',
//     cors: 'CORS is working',
//     origin: req.headers.origin || 'unknown',
//     time: new Date().toISOString(),
//   });
// });

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Servir archivos estáticos del frontend en producción
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../../client/build')));
// }

// // Rutas API
// app.use('/api/game', gameRoutes);

// app.get('/test', (req, res) => {
//   res.json({
//     status: 'ok',
//     message: 'Servidor funcionando correctamente',
//     time: new Date().toISOString(),
//   });
// });

// app.get('/ping', (req, res) => {
//   res.send('pong');
// });

// // Ruta para todas las otras solicitudes en producción
// if (process.env.NODE_ENV === 'production') {
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../../client/build/index.html'));
//   });
// }

// // Manejo de errores
// app.use(errorHandler);

// // Inicializar sockets
// initializeSocket(io);

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Servidor ejecutándose en puerto ${PORT}`);
//   console.log(`Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
// });

// // Manejar cierre apropiado
// process.on('SIGINT', () => {
//   console.log('Cerrando servidor...');
//   server.close(() => {
//     console.log('Servidor cerrado correctamente');
//     process.exit(0);
//   });
// });
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { errorHandler } from '../middlewares/errorHandler';
import gameRoutes from '../routes/gameRoutes';
import initializeSocket from '../socket/gameSocket';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['*'], // Allow all headers
  },
  transports: ['websocket', 'polling'], // Allow both transports for compatibility
});

// Middleware CORS para Express

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.get('/cors-test', (req, res) => {
  res.json({
    status: 'ok',
    cors: 'CORS is working',
    origin: req.headers.origin || 'unknown',
    time: new Date().toISOString(),
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
}

// Rutas API
app.use('/api/game', gameRoutes);

app.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor funcionando correctamente',
    time: new Date().toISOString(),
  });
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

// Ruta para todas las otras solicitudes en producción
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
}

// Manejo de errores
app.use(errorHandler);

// Inicializar sockets
initializeSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
});

// Manejar cierre apropiado
process.on('SIGINT', () => {
  console.log('Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});
