/**
 * Generates a random room code
 * @returns A random 6-character uppercase alphanumeric code
 */
export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
