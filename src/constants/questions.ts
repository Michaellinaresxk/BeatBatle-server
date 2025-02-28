import { QuizQuestion } from '../types/gameTypes';

export const questionsByCategory: Record<string, QuizQuestion[]> = {
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
    },
    {
      question: 'Which band is known for the song "Bohemian Rhapsody"?',
      options: {
        A: 'The Beatles',
        B: 'Rolling Stones',
        C: 'Queen',
        D: 'The Eagles',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Who was the lead singer of Black Sabbath in the 1970s?',
      options: {
        A: 'Ronnie James Dio',
        B: 'Robert Plant',
        C: 'Ian Gillan',
        D: 'Ozzy Osbourne',
      },
      correctOptionId: 'D',
    },
    {
      question:
        'Which rock band formed in 1973 featured Steven Tyler as lead vocalist?',
      options: {
        A: 'Aerosmith',
        B: 'KISS',
        C: 'Journey',
        D: 'Rush',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which 1975 album by Bruce Springsteen includes "Born to Run"?',
      options: {
        A: 'Darkness on the Edge of Town',
        B: 'Born to Run',
        C: 'The River',
        D: 'Nebraska',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Who wrote and performed "Rocket Man" in 1972?',
      options: {
        A: 'David Bowie',
        B: 'Paul McCartney',
        C: 'Elton John',
        D: 'Rod Stewart',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Which rock band released "Hotel California" in 1976?',
      options: {
        A: 'Fleetwood Mac',
        B: 'The Eagles',
        C: 'Lynyrd Skynyrd',
        D: 'The Doors',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Who was the drummer for The Who during the 1970s?',
      options: {
        A: 'Ringo Starr',
        B: 'John Bonham',
        C: 'Keith Moon',
        D: 'Neil Peart',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Which band released the album "Rumours" in 1977?',
      options: {
        A: 'Fleetwood Mac',
        B: 'Eagles',
        C: 'Steely Dan',
        D: 'The Police',
      },
      correctOptionId: 'A',
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
    },
    {
      question: 'Who released the song "Like a Virgin" in 1984?',
      options: {
        A: 'Cyndi Lauper',
        B: 'Madonna',
        C: 'Whitney Houston',
        D: 'Pat Benatar',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which band performed "Don\'t Stop Believin\'"?',
      options: {
        A: 'Journey',
        B: 'Foreigner',
        C: 'REO Speedwagon',
        D: 'Boston',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which rock band featured Jon Bon Jovi as the lead singer?',
      options: {
        A: 'Poison',
        B: 'Whitesnake',
        C: 'Bon Jovi',
        D: 'Mötley Crüe',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Which U2 album was released in 1987?',
      options: {
        A: 'War',
        B: 'The Joshua Tree',
        C: 'Achtung Baby',
        D: 'Boy',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which band released "Every Breath You Take" in 1983?',
      options: {
        A: 'Duran Duran',
        B: 'The Cure',
        C: 'The Police',
        D: 'INXS',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Who sang "I Wanna Dance with Somebody"?',
      options: {
        A: 'Madonna',
        B: 'Whitney Houston',
        C: 'Janet Jackson',
        D: 'Tina Turner',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which band performed "Pour Some Sugar on Me"?',
      options: {
        A: 'Def Leppard',
        B: 'Poison',
        C: 'Whitesnake',
        D: 'Aerosmith',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Who wrote and performed "Purple Rain"?',
      options: {
        A: 'Michael Jackson',
        B: 'David Bowie',
        C: 'Prince',
        D: 'George Michael',
      },
      correctOptionId: 'C',
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
    },
    {
      question: 'Which band released the funk classic "Play That Funky Music"?',
      options: {
        A: 'Wild Cherry',
        B: 'KC and the Sunshine Band',
        C: 'Sly and the Family Stone',
        D: 'The Gap Band',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which funk group performed "Brick House"?',
      options: {
        A: 'Earth, Wind & Fire',
        B: 'The Commodores',
        C: 'Kool & The Gang',
        D: 'Ohio Players',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Who recorded the funk hit "Super Freak"?',
      options: {
        A: 'Isaac Hayes',
        B: 'Curtis Mayfield',
        C: 'Rick James',
        D: 'George Clinton',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Which band is known for the funk hit "Jungle Boogie"?',
      options: {
        A: 'The Meters',
        B: 'Kool & The Gang',
        C: 'The Gap Band',
        D: 'Zapp',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Who recorded the funk classic "Flash Light"?',
      options: {
        A: 'Parliament',
        B: 'The Brothers Johnson',
        C: 'Earth, Wind & Fire',
        D: 'The Isley Brothers',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which funk band is known for "September"?',
      options: {
        A: 'Funkadelic',
        B: 'Earth, Wind & Fire',
        C: 'The Bar-Kays',
        D: 'Cameo',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which artist recorded "I Want You Back" in 1969?',
      options: {
        A: 'Marvin Gaye',
        B: 'Four Tops',
        C: 'The Temptations',
        D: 'The Jackson 5',
      },
      correctOptionId: 'D',
    },
    {
      question:
        'Who released the funk anthem "Give Up the Funk (Tear the Roof off the Sucker)"?',
      options: {
        A: 'Parliament',
        B: 'Funkadelic',
        C: 'Parliament-Funkadelic',
        D: 'James Brown',
      },
      correctOptionId: 'A',
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
    },
    {
      question: 'Who released the album "The Chronic" in 1992?',
      options: {
        A: 'Snoop Dogg',
        B: 'Dr. Dre',
        C: 'Ice Cube',
        D: 'Tupac Shakur',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which rappers debut album was "Reasonable Doubt"?',
      options: {
        A: 'Nas',
        B: 'Jay-Z',
        C: 'The Notorious B.I.G.',
        D: 'Eminem',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Who performed "Lose Yourself" for the 8 Mile soundtrack?',
      options: {
        A: '50 Cent',
        B: 'Dr. Dre',
        C: 'Eminem',
        D: 'Jay-Z',
      },
      correctOptionId: 'C',
    },
    {
      question:
        'Which rap group released the album "Enter the Wu-Tang (36 Chambers)"?',
      options: {
        A: 'Wu-Tang Clan',
        B: 'A Tribe Called Quest',
        C: 'Outkast',
        D: 'Public Enemy',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which female rapper released "Queen" in 2018?',
      options: {
        A: 'Cardi B',
        B: 'Nicki Minaj',
        C: 'Megan Thee Stallion',
        D: 'Missy Elliott',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Who collaborated with Daft Punk on "Stronger"?',
      options: {
        A: 'Drake',
        B: 'Jay-Z',
        C: 'Kanye West',
        D: 'Lil Wayne',
      },
      correctOptionId: 'C',
    },
    {
      question:
        'Which album by Nas is often considered one of the greatest rap albums of all time?',
      options: {
        A: 'Illmatic',
        B: 'It Was Written',
        C: 'Stillmatic',
        D: "God's Son",
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which rapper is known for the "ASTROWORLD" album?',
      options: {
        A: 'Travis Scott',
        B: 'Future',
        C: 'Young Thug',
        D: 'Playboi Carti',
      },
      correctOptionId: 'A',
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
    },
    {
      question:
        'Which song by Shakira became a global hit during the 2010 FIFA World Cup?',
      options: {
        A: "Hips Don't Lie",
        B: 'Whenever, Wherever',
        C: 'Waka Waka (This Time for Africa)',
        D: 'La Tortura',
      },
      correctOptionId: 'C',
    },
    {
      question: 'Who performs "Vivir Mi Vida"?',
      options: {
        A: 'Marc Anthony',
        B: 'Romeo Santos',
        C: 'Juanes',
        D: 'Enrique Iglesias',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Which Mexican singer released "Como La Flor"?',
      options: {
        A: 'Thalía',
        B: 'Selena',
        C: 'Paulina Rubio',
        D: 'Gloria Trevi',
      },
      correctOptionId: 'B',
    },
    {
      question:
        'Which Latin pop song by Enrique Iglesias featuring Descemer Bueno and Gente de Zona was a hit in 2014?',
      options: {
        A: 'El Perdón',
        B: 'Bailando',
        C: 'Súbeme la Radio',
        D: 'Duele el Corazón',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which artist collaborated with Cardi B on "I Like It"?',
      options: {
        A: 'Bad Bunny and J Balvin',
        B: 'Daddy Yankee and Nicky Jam',
        C: 'Ozuna and Anuel AA',
        D: 'Maluma and Farruko',
      },
      correctOptionId: 'A',
    },
    {
      question: 'Who performed "La Bamba"?',
      options: {
        A: 'Carlos Santana',
        B: 'Ritchie Valens',
        C: 'Julio Iglesias',
        D: 'José Feliciano',
      },
      correctOptionId: 'B',
    },
    {
      question:
        'Which Colombian singer is known for hits like "La Camisa Negra"?',
      options: {
        A: 'Carlos Vives',
        B: 'Juanes',
        C: 'Maluma',
        D: 'J Balvin',
      },
      correctOptionId: 'B',
    },
    {
      question: 'Which Puerto Rican artist released "Gasolina"?',
      options: {
        A: 'Daddy Yankee',
        B: 'Don Omar',
        C: 'Wisin & Yandel',
        D: 'Bad Bunny',
      },
      correctOptionId: 'A',
    },
  ],
};

// Default questions
export const defaultQuestions: QuizQuestion[] = [
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
  {
    question: 'Who painted the Mona Lisa?',
    options: {
      A: 'Vincent van Gogh',
      B: 'Pablo Picasso',
      C: 'Leonardo da Vinci',
      D: 'Michelangelo',
    },
    correctOptionId: 'C',
  },
  {
    question: 'Which country is home to the kangaroo?',
    options: {
      A: 'New Zealand',
      B: 'South Africa',
      C: 'Australia',
      D: 'Brazil',
    },
    correctOptionId: 'C',
  },
  {
    question: 'What is the largest ocean on Earth?',
    options: {
      A: 'Atlantic Ocean',
      B: 'Indian Ocean',
      C: 'Arctic Ocean',
      D: 'Pacific Ocean',
    },
    correctOptionId: 'D',
  },
  {
    question: 'Who wrote the play "Romeo and Juliet"?',
    options: {
      A: 'Charles Dickens',
      B: 'William Shakespeare',
      C: 'Jane Austen',
      D: 'Mark Twain',
    },
    correctOptionId: 'B',
  },
  {
    question: 'What is the chemical symbol for gold?',
    options: {
      A: 'Go',
      B: 'Gd',
      C: 'Au',
      D: 'Ag',
    },
    correctOptionId: 'C',
  },
  {
    question: 'Which country is known as the Land of the Rising Sun?',
    options: {
      A: 'China',
      B: 'Korea',
      C: 'Thailand',
      D: 'Japan',
    },
    correctOptionId: 'D',
  },
  {
    question: 'Who is the author of "Harry Potter" series?',
    options: {
      A: 'J.R.R. Tolkien',
      B: 'J.K. Rowling',
      C: 'Stephen King',
      D: 'George R.R. Martin',
    },
    correctOptionId: 'B',
  },
  {
    question: 'What is the smallest prime number?',
    options: {
      A: '0',
      B: '1',
      C: '2',
      D: '3',
    },
    correctOptionId: 'C',
  },
  {
    question: 'Which of these is not a primary color?',
    options: {
      A: 'Red',
      B: 'Blue',
      C: 'Green',
      D: 'Yellow',
    },
    correctOptionId: 'D',
  },
  {
    question: 'What year did the Titanic sink?',
    options: {
      A: '1912',
      B: '1905',
      C: '1921',
      D: '1898',
    },
    correctOptionId: 'A',
  },
  {
    question: 'Who was the first person to step on the moon?',
    options: {
      A: 'Buzz Aldrin',
      B: 'Yuri Gagarin',
      C: 'Neil Armstrong',
      D: 'John Glenn',
    },
    correctOptionId: 'C',
  },
  {
    question: 'What is the capital of Japan?',
    options: {
      A: 'Seoul',
      B: 'Beijing',
      C: 'Tokyo',
      D: 'Bangkok',
    },
    correctOptionId: 'C',
  },
  {
    question: 'Which element has the chemical symbol "O"?',
    options: {
      A: 'Osmium',
      B: 'Oxygen',
      C: 'Oganesson',
      D: 'Ozone',
    },
    correctOptionId: 'B',
  },
  {
    question: 'Which of these animals is not a mammal?',
    options: {
      A: 'Whale',
      B: 'Bat',
      C: 'Crocodile',
      D: 'Elephant',
    },
    correctOptionId: 'C',
  },
  {
    question: 'In which year did World War II end?',
    options: {
      A: '1942',
      B: '1945',
      C: '1950',
      D: '1939',
    },
    correctOptionId: 'B',
  },
  {
    question: 'What is the capital of Brazil?',
    options: {
      A: 'Rio de Janeiro',
      B: 'São Paulo',
      C: 'Brasília',
      D: 'Buenos Aires',
    },
    correctOptionId: 'C',
  },
  {
    question: 'Who wrote "The Theory of Relativity"?',
    options: {
      A: 'Isaac Newton',
      B: 'Galileo Galilei',
      C: 'Stephen Hawking',
      D: 'Albert Einstein',
    },
    correctOptionId: 'D',
  },
  {
    question: 'Which mountain is the tallest in the world?',
    options: {
      A: 'K2',
      B: 'Mount Everest',
      C: 'Mount Kilimanjaro',
      D: 'Mont Blanc',
    },
    correctOptionId: 'B',
  },
];
