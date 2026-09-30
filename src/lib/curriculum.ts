export interface Challenge {
  id: string
  title: string
  difficulty: 'Beginner' | 'Intermediate'
  topic: string
  minutes: number
  teaser: string
  statement: string
  ioSpec: { input: string; output: string; constraints: string }
  examples: { in: string; out: string }[]
  starter: string
  tests: { name: string; fnSource: string }[]
  hints: string[]
  anotherApproach?: string
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'ch-fizzbuzz',
    title: 'The FizzBuzz warm-up',
    difficulty: 'Beginner',
    topic: 'Conditions',
    minutes: 10,
    teaser: 'Print numbers, but replace some with words.',
    statement: 'Print the numbers 1 to 5 on separate lines — replace multiples of 3 with "Fizz", multiples of 5 with "Buzz". The starter already counts i from 1 to 5 for you; you write the decision inside.',
    ioSpec: {
      input: 'nothing',
      output: '1, 2, Fizz, 4, Buzz — one per line',
      constraints: 'exact output, one entry per line'
    },
    examples: [
      { in: 'range 1..5', out: '1\n2\nFizz\n4\nBuzz' }
    ],
    starter: `for (let i = 1; i <= 5; i++) {\n  // your condition here — this loop runs i from 1 to 5\n}\n`,
    tests: [
      {
        name: 'exact sequence printed',
        fnSource: '(printed) => printed.join(",") === "1,2,Fizz,4,Buzz"'
      }
    ],
    hints: [
      'i % 3 means "the remainder of i ÷ 3". So i % 3 === 0 means "i is divisible by 3". Check that first.',
      'Chain two checks: if (i % 3 === 0) print "Fizz", else if (i % 5 === 0) print "Buzz", else print i.'
    ],
    anotherApproach: 'Build the word first (s = "" + Fizz? + Buzz?) and fall back to i — one condition, no chain.'
  },
  {
    id: 'ch-reverse-word',
    title: 'Say it backwards',
    difficulty: 'Beginner',
    topic: 'Strings',
    minutes: 8,
    teaser: 'Reverse a word without a library helper.',
    statement: 'Write reverse("code") so it prints "edoc".',
    ioSpec: {
      input: 'one word, all lowercase',
      output: 'the same word, letters reversed',
      constraints: 'build it letter by letter in a loop — no shortcut helpers'
    },
    examples: [{ in: '"code"', out: '"edoc"' }],
    starter: `function reverse(word) {\n  // build the answer backwards, one letter at a time\n}\nconsole.log(reverse("code"));\n`,
    tests: [{ name: 'reverse("code") is "edoc"', fnSource: '() => reverse("code") === "edoc"' }],
    hints: [
      'word.length is how many letters a word has; word[0] is its first letter. Try printing those first.',
      'Start with let out = "" — then keep adding letters from the end: out = word[i] + out, counting i down from word.length - 1.'
    ]
  },
  {
    id: 'ch-largest',
    title: 'Find the biggest of three',
    difficulty: 'Intermediate',
    topic: 'Algorithms',
    minutes: 15,
    teaser: 'Compare three numbers with only two arms (if).',
    statement: 'max3(4, 9, 7) should return 9. Only if-conditions allowed.',
    ioSpec: {
      input: 'three numbers, any order',
      output: 'the largest',
      constraints: 'no Math.max'
    },
    examples: [{ in: 'max3(4, 9, 7)', out: '9' }],
    starter: `function max3(a, b, c) {\n  // two ifs are enough\n}\n\nconsole.log(max3(4, 9, 7));\n`,
    tests: [
      { name: 'max3(4,9,7) is 9', fnSource: '() => max3(4, 9, 7) === 9' },
      { name: 'max3(10,2,5) is 10', fnSource: '() => max3(10, 2, 5) === 10' }
    ],
    hints: ['Keep the biggest seen so far in a variable.', 'Update it after each comparison.']
  }
]

export function findChallenge(id: string) {
  return CHALLENGES.find((c) => c.id === id) ?? null
}
