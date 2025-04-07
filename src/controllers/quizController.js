// src/controllers/quizController.js
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-app';
const dbName = 'quiz-app';

// Controlador para obtener todos los tipos de quiz
const getQuizTypes = async (req, res) => {
  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const quizTypesCollection = db.collection('quizTypes');

    const quizTypes = await quizTypesCollection.find({}).toArray();

    res.status(200).json(quizTypes);
  } catch (error) {
    console.error('Error al obtener tipos de quiz:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

// Controlador para obtener todas las categorías de quiz
const getQuizCategories = async (req, res) => {
  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const categoriesCollection = db.collection('quizCategories');

    // Filtrar por tipo si se proporciona en la consulta
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const categories = await categoriesCollection.find(filter).toArray();

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error al obtener categorías de quiz:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

// Controlador para obtener preguntas por categoría
const getQuestionsByCategory = async (req, res) => {
  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const questionsCollection = db.collection('quizQuestions');

    const categoryId = req.params.categoryId;

    // Validar que el ID de categoría sea un ObjectId válido
    let objectId;
    try {
      objectId = new ObjectId(categoryId);
    } catch (error) {
      return res.status(400).json({ message: 'ID de categoría inválido' });
    }

    // Obtener límite de preguntas (opcional)
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;

    // Buscar preguntas por categoría
    const query = { category: objectId };
    let questions;

    if (limit > 0) {
      // Si se especifica un límite, obtener preguntas aleatorias
      questions = await questionsCollection.aggregate([
        { $match: query },
        { $sample: { size: limit } },
        { $project: { _id: 1, text: 1, options: 1, difficulty: 1, points: 1 } }
      ]).toArray();
    } else {
      // Si no hay límite, obtener todas las preguntas
      questions = await questionsCollection.find(query).toArray();
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error('Error al obtener preguntas por categoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

// Controlador para obtener todas las preguntas agrupadas por categoría
const getAllQuestionsByCategory = async (req, res) => {
  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const questionsCollection = db.collection('quizQuestions');
    const categoriesCollection = db.collection('quizCategories');

    // Obtener todas las categorías
    const categories = await categoriesCollection.find({}).toArray();

    // Crear un mapa de categorías para buscar nombres
    const categoryMap = new Map();
    categories.forEach(category => {
      categoryMap.set(category._id.toString(), category.name);
    });

    // Obtener todas las preguntas
    const questions = await questionsCollection.find({}).toArray();

    // Agrupar preguntas por categoría
    const questionsByCategory = {};

    questions.forEach(question => {
      const categoryId = question.category.toString();
      const categoryName = categoryMap.get(categoryId) || 'Uncategorized';

      if (!questionsByCategory[categoryName]) {
        questionsByCategory[categoryName] = [];
      }

      questionsByCategory[categoryName].push(question);
    });

    res.status(200).json(questionsByCategory);
  } catch (error) {
    console.error('Error al obtener todas las preguntas por categoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

// Controlador para obtener preguntas predeterminadas
const getDefaultQuestions = async (req, res) => {
  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const questionsCollection = db.collection('quizQuestions');

    // Buscar preguntas con la etiqueta "general"
    const defaultQuestions = await questionsCollection
      .find({ tags: 'general' })
      .toArray();

    res.status(200).json(defaultQuestions);
  } catch (error) {
    console.error('Error al obtener preguntas predeterminadas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

module.exports = {
  getQuizTypes,
  getQuizCategories,
  getQuestionsByCategory,
  getAllQuestionsByCategory,
  getDefaultQuestions
};