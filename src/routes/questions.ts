import express from 'express';
import Question from '../models/question';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().populate('category', 'name');
    res.json(questions);
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ message: 'Error getting question' });
  }
});

router.get('/category/:categoryId', async (req, res) => {
  try {
    const questions = await Question.find({
      category: req.params.categoryId,
    }).populate('category', 'name');

    res.json(questions);
  } catch (error) {
    console.error('Error getting questions by category:', error);
    res.status(500).json({ message: 'Error getting questions by category' });
  }
});

router.get('/difficulty/:level', async (req, res) => {
  try {
    const questions = await Question.find({
      difficulty: req.params.level,
    }).populate('category', 'name');

    res.json(questions);
  } catch (error) {
    console.error('Error getting questions by difficulty:', error);
    res.status(500).json({ message: 'Error getting questions by difficulty' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate(
      'category',
      'name'
    );

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ message: 'Error getting question' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { text, options, category, difficulty, explanation } = req.body;

    const newQuestion = new Question({
      text,
      options,
      category,
      difficulty,
      explanation,
    });

    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Error creating question' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { text, options, category, difficulty, explanation } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { text, options, category, difficulty, explanation },
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Error updating question' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question correctly eliminated' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
});

export default router;
