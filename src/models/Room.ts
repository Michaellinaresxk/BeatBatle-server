import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: string[];
  currentSong: {
    title: string;
    artist: string;
    startTime: Date;
  };
  gameSettings: {
    maxPlayers: number;
    roundTime: number;
    totalRounds: number;
  };
  currentRound: number;
  scores: Map<string, number>;
  createdAt: Date;
}

const RoomSchema: Schema = new Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
  },
  hostId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
  },
  players: [
    {
      type: String,
      ref: 'Player',
    },
  ],
  currentSong: {
    title: String,
    artist: String,
    startTime: Date,
  },
  gameSettings: {
    maxPlayers: {
      type: Number,
      default: 8,
    },
    roundTime: {
      type: Number,
      default: 30, // segundos
    },
    totalRounds: {
      type: Number,
      default: 10,
    },
  },
  currentRound: {
    type: Number,
    default: 0,
  },
  scores: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // La sala se elimina después de 1 hora
  },
});

export default mongoose.model<IRoom>('Room', RoomSchema);
