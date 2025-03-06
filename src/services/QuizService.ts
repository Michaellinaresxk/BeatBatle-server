class QuizService {
  // Category Methods
  async createCategory(categoryData) {
    try {
      return await QuizCategory.create(categoryData);
    } catch (error) {
      throw new Error(`Error creating category: ${error.message}`);
    }
  }

  async getCategories(filter = {}) {
    return await QuizCategory.find({ ...filter, isActive: true });
  }

  async updateCategory(categoryId, updateData) {
    return await QuizCategory.findByIdAndUpdate(
      categoryId,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    );
  }

  // Question Methods
  async createQuestion(questionData) {
    try {
      return await QuizQuestion.create(questionData);
    } catch (error) {
      throw new Error(`Error creating question: ${error.message}`);
    }
  }

  async getQuestions(filter = {}, options = {}) {
    const { limit = 10, difficulty, category, subcategory } = options;

    const query = {
      ...filter,
      isActive: true,
      ...(difficulty && { difficulty }),
      ...(category && { category }),
      ...(subcategory && { subcategory }),
    };

    return await QuizQuestion.find(query).limit(limit).populate('category');
  }

  async getRandomQuestions(categoryId, options = {}) {
    const { limit = 10, difficulty = 'Medium', subcategory } = options;

    const query = {
      category: categoryId,
      difficulty,
      isActive: true,
      ...(subcategory && { subcategory }),
    };

    return await QuizQuestion.aggregate([
      { $match: query },
      { $sample: { size: limit } },
      {
        $project: {
          text: 1,
          options: {
            text: 1,
            _id: 0,
          },
          difficulty: 1,
          points: 1,
        },
      },
    ]);
  }

  async validateQuestionAnswer(questionId, selectedAnswer) {
    const question = await QuizQuestion.findById(questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    const correctOption = question.options.find((option) => option.isCorrect);

    return {
      isCorrect: correctOption.text === selectedAnswer,
      correctAnswer: correctOption.text,
      explanation: question.explanation,
      points: question.points,
    };
  }

  // Quiz Session Management
  async createQuizSession(categoryId, options = {}) {
    const { difficulty = 'Medium', limit = 10, subcategory } = options;

    // Get random questions for the quiz
    const questions = await this.getRandomQuestions(categoryId, {
      difficulty,
      limit,
      subcategory,
    });

    return {
      categoryId,
      questions,
      totalQuestions: questions.length,
      difficulty,
    };
  }
}

module.exports = new QuizService();
