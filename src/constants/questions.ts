// Define types for our question data structure
export type QuizOption = {
  text: string;
  isCorrect: boolean;
};

export type QuizQuestion = {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOptionId: string;
};

// Define the valid category keys
export type QuizCategoryKey =
  | 'rock-70'
  | 'rock-80'
  | 'funk'
  | 'rap'
  | 'latin'
  | string;

// Quiz questions organized by category
export const questionsByCategory: Record<QuizCategoryKey, QuizQuestion[]> = {
  'rock-70': [
    {
      question:
        'Which band released the album "Dark Side of the Moon" in 1973?',
      options: {
        A: 'Pink Floyd',
        B: 'Led Zeppelin',
        C: 'The Rolling Stones',
        D: 'The Who',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Who was the lead vocalist of Queen in the 1970s?',
      options: {
        A: 'Roger Taylor',
        B: 'Freddie Mercury',
        C: 'Brian May',
        D: 'John Deacon',
      },
      correctOptionId: 'B',
    },
  ],
  'rock-80': [
    {
      question: 'Which band released the hit song "Sweet Child O\' Mine"?',
      options: {
        A: 'Metallica',
        B: "Guns N' Roses",
        C: 'AC/DC',
        D: 'Def Leppard',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which 80s rock band featured Axl Rose as the lead vocalist?',
      options: {
        A: 'Mötley Crüe',
        B: 'Bon Jovi',
        C: "Guns N' Roses",
        D: 'Aerosmith',
      },
      correctOptionId: 'C',
    },
  ],
  funk: [
    {
      question: 'Who is known as the "Godfather of Funk"?',
      options: {
        A: 'James Brown',
        B: 'George Clinton',
        C: 'Bootsy Collins',
        D: 'Sly Stone',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which funk band is known for the hit "Flashlight"?',
      options: {
        A: 'Earth, Wind & Fire',
        B: 'Parliament',
        C: 'Kool & the Gang',
        D: 'The Brothers Johnson',
      },
      correctOptionId: 'B',
    },
  ],
  rap: [
    {
      question: 'Which rapper released the album "The Chronic" in 1992?',
      options: {
        A: 'Snoop Dogg',
        B: 'Dr. Dre',
        C: 'Ice Cube',
        D: 'Tupac Shakur',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which rap group released the album "Straight Outta Compton"?',
      options: {
        A: 'Public Enemy',
        B: 'Wu-Tang Clan',
        C: 'N.W.A',
        D: 'A Tribe Called Quest',
      },
      correctOptionId: 'C',
    },
  ],
  latin: [
    {
      question: 'Which artist is known as the "Queen of Salsa"?',
      options: {
        A: 'Gloria Estefan',
        B: 'Shakira',
        C: 'Celia Cruz',
        D: 'Jennifer Lopez',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Which Latin music genre originated in Argentina?',
      options: {
        A: 'Salsa',
        B: 'Tango',
        C: 'Samba',
        D: 'Reggaeton',
      },
      correctOptionId: 'B',
    },
  ],
};

export const defaultQuestions: QuizQuestion[] = [
  {
    question: 'What is the capital of France?',
    options: {
      A: 'London',
      B: 'Berlin',
      C: 'Paris',
      D: 'Madrid',
    },
    correctOptionId: 'C',
  },
  {
    question: 'Who painted the Mona Lisa?',
    options: {
      A: 'Vincent van Gogh',
      B: 'Leonardo da Vinci',
      C: 'Pablo Picasso',
      D: 'Michelangelo',
    },
    correctOptionId: 'B',
  },
  {
    question: 'Which planet is known as the Red Planet?',
    options: {
      A: 'Venus',
      B: 'Jupiter',
      C: 'Mars',
      D: 'Saturn',
    },
    correctOptionId: 'C',
  },
];
