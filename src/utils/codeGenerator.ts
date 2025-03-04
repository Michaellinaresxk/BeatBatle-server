/**
 * Generates a random room code
 * @returns A random 6-character uppercase alphanumeric code
 */
export function generateRoomCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  console.log(`🎲 Generated Room Code: ${result}`);
  return result;
}
