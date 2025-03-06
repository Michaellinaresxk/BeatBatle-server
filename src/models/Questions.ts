const mongoose = require('mongoose');
const quizQuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizCategory',
      required: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    options: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    points: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    explanation: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
quizQuestionSchema.index({ category: 1, difficulty: 1 });

// Middleware to update 'updatedAt' timestamp
quizQuestionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find questions by category and difficulty
quizQuestionSchema.statics.findByFilter = function (
  category,
  difficulty,
  limit = 10
) {
  return this.find({
    category,
    difficulty,
    isActive: true,
  }).limit(limit);
};

// Method to validate answer
quizQuestionSchema.methods.checkAnswer = function (selectedAnswer) {
  const correctOption = this.options.find((option) => option.isCorrect);
  return {
    isCorrect: correctOption.text === selectedAnswer,
    correctAnswer: correctOption.text,
  };
};

// Create and export the model
const QuizQuestion = mongoose.model('QuizQuestion', quizQuestionSchema);

module.exports = QuizQuestion;
