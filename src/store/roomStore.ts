import type { Room } from '../types/gameTypes';

// In-memory store for rooms
const rooms = new Map<string, Room>();

export const getRooms = () => rooms;

export const getRoom = (roomCode: string): Room | undefined => {
  return rooms.get(roomCode);
};

export const addRoom = (room: Room): void => {
  rooms.set(room.roomCode, room);
};

export const removeRoom = (roomCode: string): boolean => {
  return rooms.delete(roomCode);
};

export const updateRoom = (
  roomCode: string,
  updates: Partial<Room>
): Room | undefined => {
  const room = rooms.get(roomCode);
  if (!room) return undefined;

  const updatedRoom = { ...room, ...updates };
  rooms.set(roomCode, updatedRoom);
  return updatedRoom;
};
