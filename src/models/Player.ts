import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  socketId: string;
  nickname: string;
  score: number;
  isHost: boolean;
  roomId: string;
  lastAnswer: Date;
  correctAnswers: number;
  wrongAnswers: number;
}

const PlayerSchema: Schema = new Schema({
  socketId: {
    type: String,
    required: true,
    unique: true,
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  isHost: {
    type: Boolean,
    default: false,
  },
  roomId: {
    type: String,
    required: true,
  },
  lastAnswer: {
    type: Date,
    default: null,
  },
  correctAnswers: {
    type: Number,
    default: 0,
  },
  wrongAnswers: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model<IPlayer>('Player', PlayerSchema);
