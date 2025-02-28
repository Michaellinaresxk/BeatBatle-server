import type { Socket } from 'socket.io';
import { getRooms } from '../../store/roomStore';

/**
 * Handles a client disconnection
 */
export function handleDisconnect(socket: Socket): void {
  console.log('Client disconnected', socket.id);

  const rooms = getRooms();
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
