const quizCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['General Knowledge', 'Music'],
      required: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Middleware to update 'updatedAt' timestamp
quizCategorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active categories
quizCategorySchema.statics.findActiveCategories = function () {
  return this.find({ isActive: true });
};

// Create and export the model
const QuizCategory = mongoose.model('QuizCategory', quizCategorySchema);

module.exports = QuizCategory;
