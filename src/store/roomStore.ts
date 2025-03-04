import type { Room } from '../types/gameTypes';

const rooms: Map<string, Room> = new Map();

export function addRoom(room: Room): void {
  rooms.set(room.roomCode, room);
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function removeRoom(roomCode: string): void {
  rooms.delete(roomCode);
}

export function getRooms(): Map<string, Room> {
  return rooms;
}
