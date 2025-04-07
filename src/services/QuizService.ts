// services/quizService.js
const QuizType = require('../models/QuizType');

/**
 * Servicio para manejar operaciones relacionadas con cuestionarios
 */
class QuizService {
  /**
   * Obtiene todos los tipos de cuestionarios activos
   * @returns {Promise<Array>} Lista de tipos de cuestionarios
   */
  async getQuizTypes() {
    try {
      return await QuizType.find({ isActive: true }).lean();
    } catch (error) {
      console.error('Error al obtener tipos de cuestionarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las categorías de cuestionarios activas
   * @returns {Promise<Array>} Lista de categorías de cuestionarios
   */
  async getQuizCategories() {
    try {
      return await QuizCategory.find({ isActive: true }).lean();
    } catch (error) {
      console.error('Error al obtener categorías de cuestionarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene las preguntas por categoría
   * @param {string} categoryId - ID de la categoría
   * @param {number} limit - Número máximo de preguntas a devolver
   * @returns {Promise<Array>} Lista de preguntas
   */
  async getQuestionsByCategory(categoryId, limit = 10) {
    try {
      const questions = await QuizQuestion.find({
        category: categoryId,
        isActive: true,
      })
        .limit(limit)
        .lean();

      // Convertir al formato esperado por el cliente
      return questions.map((q) => ({
        question: q.text,
        options: this._convertOptionsFormat(q.options),
        correctOptionId: this._getCorrectOptionId(q.options),
      }));
    } catch (error) {
      console.error('Error al obtener preguntas por categoría:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las preguntas en forma de objeto por categoría
   * @returns {Promise<Object>} Objeto con preguntas agrupadas por categoría
   */
  async getAllQuestionsByCategory() {
    try {
      // Obtener todas las categorías
      const categories = await this.getQuizCategories();

      // Crear el objeto de resultado
      const result = {};

      // Para cada categoría, obtener sus preguntas
      for (const category of categories) {
        // Obtener el key a usar (para mantener compatibilidad con el formato anterior)
        const key = this._getCategoryKey(category.name);

        // Obtener preguntas de esta categoría (sin límite)
        const questions = await this.getQuestionsByCategory(category._id, 100);

        // Agregar al resultado
        result[key] = questions;
      }

      return result;
    } catch (error) {
      console.error(
        'Error al obtener todas las preguntas por categoría:',
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene las preguntas predeterminadas (general knowledge)
   * @param {number} limit - Número máximo de preguntas a devolver
   * @returns {Promise<Array>} Lista de preguntas predeterminadas
   */
  async getDefaultQuestions(limit = 20) {
    try {
      // Buscar la categoría "General Knowledge"
      const generalCategory = await QuizCategory.findOne({
        name: 'General Knowledge',
        isActive: true,
      });

      if (!generalCategory) {
        throw new Error('Categoría "General Knowledge" no encontrada');
      }

      return this.getQuestionsByCategory(generalCategory._id, limit);
    } catch (error) {
      console.error('Error al obtener preguntas predeterminadas:', error);
      throw error;
    }
  }

  /**
   * Convierte las opciones del formato de BD al formato esperado por el cliente
   * @private
   * @param {Array} options - Opciones en formato de BD
   * @returns {Object} Opciones en formato {A: 'texto', B: 'texto', ...}
   */
  _convertOptionsFormat(options) {
    const optionIds = ['A', 'B', 'C', 'D'];
    const result = {};

    options.forEach((option, index) => {
      if (index < optionIds.length) {
        result[optionIds[index]] = option.text;
      }
    });

    return result;
  }

  /**
   * Obtiene el ID de la opción correcta
   * @private
   * @param {Array} options - Opciones en formato de BD
   * @returns {string} ID de la opción correcta (A, B, C, D)
   */
  _getCorrectOptionId(options) {
    const optionIds = ['A', 'B', 'C', 'D'];
    const correctIndex = options.findIndex((option) => option.isCorrect);

    return correctIndex >= 0 && correctIndex < optionIds.length
      ? optionIds[correctIndex]
      : null;
  }

  /**
   * Obtiene la clave para la categoría (para mantener compatibilidad)
   * @private
   * @param {string} categoryName - Nombre de la categoría
   * @returns {string} Clave para la categoría
   */
  _getCategoryKey(categoryName) {
    const name = categoryName.toLowerCase();

    // Mapear nombres a claves
    const keyMap = {
      '70s rock': 'rock-70',
      '80s rock': 'rock-80',
      funk: 'funk',
      rap: 'rap',
      latin: 'latin',
      'general knowledge': 'default',
    };

    return keyMap[name] || name.replace(/\s+/g, '-').toLowerCase();
  }
}

module.exports = new QuizService();
