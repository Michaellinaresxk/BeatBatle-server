// src/routes/quizRoutes.js (Versión CommonJS para compatibilidad)
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// Obtener todos los tipos de cuestionario
router.get('/types', quizController.getQuizTypes);

// Obtener todas las categorías de cuestionario
router.get('/categories', quizController.getQuizCategories);

// Obtener preguntas por categoría
router.get(
  '/questions/category/:categoryId',
  quizController.getQuestionsByCategory
);

// Obtener todas las preguntas agrupadas por categoría
router.get('/questions/all', quizController.getAllQuestionsByCategory);

// Obtener preguntas predeterminadas
router.get('/questions/default', quizController.getDefaultQuestions);

module.exports = router;
