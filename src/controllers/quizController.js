// controllers/quizController.js
const quizService = require('../services/quizService');

/**
 * Controlador para manejar las rutas relacionadas con cuestionarios
 */
class QuizController {
  /**
   * Obtiene todos los tipos de cuestionarios
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getQuizTypes(req, res) {
    try {
      const types = await quizService.getQuizTypes();
      res.json(types);
    } catch (error) {
      console.error('Error en getQuizTypes:', error);
      res.status(500).json({
        error: 'Error al obtener tipos de cuestionarios',
        message: error.message
      });
    }
  }

  /**
   * Obtiene todas las categorías de cuestionarios
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getQuizCategories(req, res) {
    try {
      const categories = await quizService.getQuizCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error en getQuizCategories:', error);
      res.status(500).json({
        error: 'Error al obtener categorías de cuestionarios',
        message: error.message
      });
    }
  }

  /**
   * Obtiene preguntas por categoría
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getQuestionsByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const questions = await quizService.getQuestionsByCategory(categoryId, limit);
      res.json(questions);
    } catch (error) {
      console.error('Error en getQuestionsByCategory:', error);
      res.status(500).json({
        error: 'Error al obtener preguntas por categoría',
        message: error.message
      });
    }
  }

  /**
   * Obtiene todas las preguntas agrupadas por categoría
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getAllQuestionsByCategory(req, res) {
    try {
      const questions = await quizService.getAllQuestionsByCategory();
      res.json(questions);
    } catch (error) {
      console.error('Error en getAllQuestionsByCategory:', error);
      res.status(500).json({
        error: 'Error al obtener todas las preguntas por categoría',
        message: error.message
      });
    }
  }

  /**
   * Obtiene las preguntas predeterminadas
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getDefaultQuestions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const questions = await quizService.getDefaultQuestions(limit);
      res.json(questions);
    } catch (error) {
      console.error('Error en getDefaultQuestions:', error);
      res.status(500).json({
        error: 'Error al obtener preguntas predeterminadas',
        message: error.message
      });
    }
  }
}

module.exports = new QuizController();