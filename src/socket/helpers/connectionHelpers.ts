import type { Socket } from 'socket.io';
import { getRooms } from '../../store/roomStore';
import { Room } from '../../types/gameTypes';

export function handleDisconnect(socket: Socket): void {
  console.log('📴 Client disconnected:', socket.id);

  try {
    const rooms = getRooms();

    // Iterate through rooms to find and remove disconnected player/controller
    for (const [roomCode, room] of rooms.entries()) {
      // Check if it's a player
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        handlePlayerDisconnect(socket, room, roomCode, playerIndex);
        return;
      }

      // Check if it's a mobile controller
      const controllerIndex = room.mobileControllers.findIndex(
        (c) => c.id === socket.id
      );
      if (controllerIndex !== -1) {
        handleControllerDisconnect(socket, room, roomCode, controllerIndex);
        return;
      }
    }
  } catch (error) {
    console.error('❌ Error during disconnect handling:', error);
  }
}

function handlePlayerDisconnect(
  socket: Socket,
  room: Room,
  roomCode: string,
  playerIndex: number
): void {
  const player = room.players[playerIndex];
  console.log(`🚪 Player ${player.nickname} left room ${roomCode}`);

  // Remove player from room
  room.players.splice(playerIndex, 1);

  // Notify other room members
  socket.to(roomCode).emit('player_left', {
    playerId: player.id,
    nickname: player.nickname,
  });

  // Transfer host if needed
  if (player.isHost && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].id;

    socket.to(roomCode).emit('new_host', {
      playerId: room.players[0].id,
      nickname: room.players[0].nickname,
    });
  }

  // Clean up room if empty
  cleanUpRoomIfEmpty(room, roomCode);
}

function handleControllerDisconnect(
  socket: Socket,
  room: Room,
  roomCode: string,
  controllerIndex: number
): void {
  const controller = room.mobileControllers[controllerIndex];
  console.log(`🎮 Controller ${controller.nickname} left room ${roomCode}`);

  // Remove controller from room
  room.mobileControllers.splice(controllerIndex, 1);

  // Notify other room members
  socket.to(roomCode).emit('controller_left', {
    id: controller.id,
    nickname: controller.nickname,
  });

  // Clean up room if empty
  cleanUpRoomIfEmpty(room, roomCode);
}

function cleanUpRoomIfEmpty(room: Room, roomCode: string): void {
  // Remove room if no players or controllers remain
  if (room.players.length === 0 && room.mobileControllers.length === 0) {
    console.log(
      `🗑️ Room ${roomCode} deleted due to no remaining players/controllers`
    );
    getRooms().delete(roomCode);
  }
}
