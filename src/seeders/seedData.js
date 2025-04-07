const fs = require('fs');
const path = require('path');
const MongoDBConnection = require('../config/mongodb-connection.ts');
require('dotenv').config();

// Create questions data directly in this file to avoid import/require issues
// In a real app, you would refactor your files to use consistent module systems

/**
 * Sample quiz questions data
 */
const questionsByCategory = {
  // 70s Rock questions
  'rock-70': [
    {
      question: 'Which band released the album "Dark Side of the Moon" in 1973?',
      options: {
        A: 'Pink Floyd',
        B: 'Led Zeppelin',
        C: 'The Rolling Stones',
        D: 'The Who'
      },
      correctOptionId: 'A'
    },
    {
      question: 'Who was the lead vocalist of Queen in the 1970s?',
      options: {
        A: 'Roger Taylor',
        B: 'Freddie Mercury',
        C: 'Brian May',
        D: 'John Deacon'
      },
      correctOptionId: 'B'
    }
  ],

  'rock-80': [
    {
      question: 'Which band released the hit song "Sweet Child O\' Mine"?',
      options: {
        A: 'Metallica',
        B: 'Guns N\' Roses',
        C: 'AC/DC',
        D: 'Def Leppard'
      },
      correctOptionId: 'B'
    }
  ],

  'funk': [
    {
      question: 'Who is known as the "Godfather of Funk"?',
      options: {
        A: 'James Brown',
        B: 'George Clinton',
        C: 'Bootsy Collins',
        D: 'Sly Stone'
      },
      correctOptionId: 'A'
    }
  ],

  'rap': [
    {
      question: 'Which rapper released the album "The Chronic" in 1992?',
      options: {
        A: 'Snoop Dogg',
        B: 'Dr. Dre',
        C: 'Ice Cube',
        D: 'Tupac Shakur'
      },
      correctOptionId: 'B'
    }
  ],

  'latin': [
    {
      question: 'Which artist is known as the "Queen of Salsa"?',
      options: {
        A: 'Gloria Estefan',
        B: 'Shakira',
        C: 'Celia Cruz',
        D: 'Jennifer Lopez'
      },
      correctOptionId: 'C'
    }
  ]
};

// Default general knowledge questions
const defaultQuestions = [
  {
    question: 'What is the capital of France?',
    options: {
      A: 'London',
      B: 'Berlin',
      C: 'Paris',
      D: 'Madrid'
    },
    correctOptionId: 'C'
  },
  {
    question: 'Who painted the Mona Lisa?',
    options: {
      A: 'Vincent van Gogh',
      B: 'Leonardo da Vinci',
      C: 'Pablo Picasso',
      D: 'Michelangelo'
    },
    correctOptionId: 'B'
  }
];

// Quiz types data
const quizTypesData = [
  {
    name: 'General Knowledge Quiz',
    description: 'Test your knowledge about various topics',
    type: 'General Knowledge',
    icon: 'globe',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Music Quiz',
    description: 'Challenge your music knowledge across different genres',
    type: 'Music',
    icon: 'music-note',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedDatabase() {
  let client;

  try {
    // Connect to MongoDB
    client = await MongoDBConnection.connect();

    // Get the database
    const db = MongoDBConnection.getDatabase('quiz-app');

    console.log('Connected to MongoDB');

    // Get collections
    const quizTypesCollection = db.collection('quizTypes');
    const quizCategoriesCollection = db.collection('quizCategories');
    const quizQuestionsCollection = db.collection('quizQuestions');

    // Clear existing collections
    await quizTypesCollection.deleteMany({});
    await quizCategoriesCollection.deleteMany({});
    await quizQuestionsCollection.deleteMany({});

    console.log('Existing data cleared');

    // Insert quiz types
    const insertedTypesResult = await quizTypesCollection.insertMany(quizTypesData);
    console.log(`${Object.keys(insertedTypesResult.insertedIds).length} quiz types inserted`);

    // Quiz categories data
    const quizCategoriesData = [
      {
        name: '70s Rock',
        description: 'Test your knowledge about 70s rock music',
        type: 'Music',
        icon: 'music-note',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '80s Rock',
        description: 'Test your knowledge about 80s rock music',
        type: 'Music',
        icon: 'music-note',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Funk',
        description: 'Test your knowledge about funk music',
        type: 'Music',
        icon: 'music-note',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Rap',
        description: 'Test your knowledge about rap music',
        type: 'Music',
        icon: 'music-note',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Latin',
        description: 'Test your knowledge about Latin music',
        type: 'Music',
        icon: 'music-note',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'General Knowledge',
        description: 'Test your general knowledge',
        type: 'General Knowledge',
        icon: 'globe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert categories
    const insertedCategoriesResult = await quizCategoriesCollection.insertMany(quizCategoriesData);
    console.log(`${Object.keys(insertedCategoriesResult.insertedIds).length} categories inserted`);

    // Create a map of category names to IDs for easy lookup
    const categoryMap = {};
    const insertedCategories = await quizCategoriesCollection.find({}).toArray();

    insertedCategories.forEach(category => {
      const lowerCaseName = category.name.toLowerCase();
      categoryMap[lowerCaseName] = category._id;

      // Additional mappings for compatibility
      if (lowerCaseName === '70s rock') categoryMap['rock-70'] = category._id;
      if (lowerCaseName === '80s rock') categoryMap['rock-80'] = category._id;
    });

    // Function to convert question format
    function convertQuestionFormat(question, categoryId, subcategory = null) {
      const options = [];

      // Convert options from {A: 'Option A'} to [{text: 'Option A', isCorrect: true/false}]
      for (const [key, text] of Object.entries(question.options)) {
        options.push({
          text,
          isCorrect: key === question.correctOptionId
        });
      }

      return {
        text: question.question,
        category: categoryId,
        subcategory,
        options,
        difficulty: 'Medium',
        points: 1,
        isActive: true,
        tags: [subcategory || 'general'],
        source: 'Initial seed',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Prepare all questions
    const allQuestions = [];

    // Process questions by category
    for (const [categoryKey, categoryQuestions] of Object.entries(questionsByCategory)) {
      const categoryId = categoryMap[categoryKey.toLowerCase()];
      if (categoryId) {
        const formattedQuestions = categoryQuestions.map(q =>
          convertQuestionFormat(q, categoryId, categoryKey)
        );
        allQuestions.push(...formattedQuestions);
      } else {
        console.log(`Category not found for key: ${categoryKey}`);
      }
    }

    // Process default questions
    if (defaultQuestions && defaultQuestions.length) {
      const categoryId = categoryMap['general knowledge'];
      if (categoryId) {
        const generalQuestions = defaultQuestions.map(q =>
          convertQuestionFormat(q, categoryId, 'general')
        );
        allQuestions.push(...generalQuestions);
      }
    }

    // Insert all questions
    if (allQuestions.length > 0) {
      const insertedQuestionsResult = await quizQuestionsCollection.insertMany(allQuestions);
      console.log(`${Object.keys(insertedQuestionsResult.insertedIds).length} questions inserted`);
    } else {
      console.log('No questions found to insert');
    }

    console.log('Database seeding process completed successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Disconnect from MongoDB
    if (client) {
      await MongoDBConnection.disconnect();
    }
    console.log('Disconnected from MongoDB');
  }
}

// Execute the seeding function
seedDatabase();