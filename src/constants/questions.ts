export const questionsByCategory: Record<string, any[]> = {
  'rock-70': [
    {
      question:
        'Which band released the album "Dark Side of the Moon" in 1973?',
      options: {
        A: 'Led Zeppelin',
        B: 'Pink Floyd',
        C: 'The Rolling Stones',
        D: 'The Who',
      },
      correctOptionId: 'B',
      audioUrl: 'https://example.com/songs/dark-side-of-the-moon.mp3',
    },
    {
      question: 'Who was the lead guitarist of Led Zeppelin?',
      options: {
        A: 'Jimmy Page',
        B: 'Eric Clapton',
        C: 'Jimi Hendrix',
        D: 'Keith Richards',
      },
      correctOptionId: 'A',
      audioUrl: 'https://example.com/songs/stairway-to-heaven.mp3',
    },
  ],
  'rock-80': [
    {
      question: 'Which Michael Jackson album contains the hit "Billie Jean"?',
      options: {
        A: 'Bad',
        B: 'Thriller',
        C: 'Off the Wall',
        D: 'Dangerous',
      },
      correctOptionId: 'B',
      audioUrl: 'https://example.com/songs/billie-jean.mp3',
    },
    {
      question: 'Which band released "Sweet Child O\' Mine"?',
      options: {
        A: 'Aerosmith',
        B: 'Def Leppard',
        C: "Guns N' Roses",
        D: 'AC/DC',
      },
      correctOptionId: 'C',
      audioUrl: 'https://example.com/songs/sweet-child-o-mine.mp3',
    },
  ],
  funk: [
    {
      question: 'Which artist is known as the "Godfather of Soul"?',
      options: {
        A: 'James Brown',
        B: 'George Clinton',
        C: 'Stevie Wonder',
        D: 'Prince',
      },
      correctOptionId: 'A',
      audioUrl: 'https://example.com/songs/i-feel-good.mp3',
    },
    {
      question: 'Which funk band created the hit "Superstition"?',
      options: {
        A: 'Earth, Wind & Fire',
        B: 'Parliament-Funkadelic',
        C: 'Kool & The Gang',
        D: 'Stevie Wonder',
      },
      correctOptionId: 'D',
      audioUrl: 'https://example.com/songs/superstition.mp3',
    },
  ],
  rap: [
    {
      question: 'Who released the album "To Pimp a Butterfly"?',
      options: {
        A: 'Kendrick Lamar',
        B: 'Jay-Z',
        C: 'Drake',
        D: 'Kanye West',
      },
      correctOptionId: 'A',
      audioUrl: 'https://example.com/songs/alright.mp3',
    },
    {
      question: 'Which rap group released "Straight Outta Compton"?',
      options: {
        A: 'Public Enemy',
        B: 'Wu-Tang Clan',
        C: 'N.W.A.',
        D: 'Run-DMC',
      },
      correctOptionId: 'C',
      audioUrl: 'https://example.com/songs/straight-outta-compton.mp3',
    },
  ],
  latin: [
    {
      question: 'Who sang "Despacito"?',
      options: {
        A: 'Enrique Iglesias',
        B: 'Luis Fonsi ft. Daddy Yankee',
        C: 'Ricky Martin',
        D: 'J Balvin',
      },
      correctOptionId: 'B',
      audioUrl: 'https://example.com/songs/despacito.mp3',
    },
    {
      question: 'Which artist is known as the "Queen of Latin Pop"?',
      options: {
        A: 'Shakira',
        B: 'Jennifer Lopez',
        C: 'Gloria Estefan',
        D: 'Selena',
      },
      correctOptionId: 'C',
      audioUrl: 'https://example.com/songs/conga.mp3',
    },
  ],
};

// Default questions
export const defaultQuestions = [
  {
    question: 'What is the capital of France?',
    options: {
      A: 'London',
      B: 'Paris',
      C: 'Berlin',
      D: 'Madrid',
    },
    correctOptionId: 'B',
  },
  {
    question: 'Which planet is known as the Red Planet?',
    options: {
      A: 'Venus',
      B: 'Mars',
      C: 'Jupiter',
      D: 'Saturn',
    },
    correctOptionId: 'B',
  },
];
