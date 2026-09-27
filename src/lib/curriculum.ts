export type LessonType = 'exercise' | 'concept' | 'debugging' | 'project'

export interface Lesson {
  id: string
  module: string
  title: string
  type: LessonType
  skill: string
  minutes: number
  instructions: string[]
  starter: string
  solutionExample?: string
  hints: string[]
  explanation: string
  tests: { name: string; fnSource: string }[]
  conceptBody?: string
  projectSteps?: { label: string; done?: boolean }[]
  reflectPrompt: string
}

export interface Path {
  id: string
  title: string
  description: string
  level: 'Beginner' | 'Core' | 'Next'
  hours: number
  prerequisites: string
  outcomes: string[]
  milestones: string[]
  finalProjectId: string
  lessons: Lesson[]
}

export const PATHS: Path[] = [
  {
    id: 'web-foundations',
    title: 'JavaScript Basics: your first programs',
    description: 'Variables, printing, string joining and fixing bugs — real code from minute one, zero experience needed.',
    level: 'Beginner',
    hours: 3,
    prerequisites: 'No experience needed — this is the on-ramp.',
    outcomes: [
      'Store and print values with variables',
      'Join text together with +',
      'Fix a broken program yourself'
    ],
    milestones: ['First program runs', 'First bug fixed', 'Intro card shipped'],
    finalProjectId: 'wf-final-site',
    lessons: [
      {
        id: 'wf-hello-heading',
        module: 'First Lines',
        title: 'Your first line of code',
        type: 'exercise',
        skill: 'Variables',
        minutes: 8,
        instructions: [
          'Create a variable named greeting that holds the text "Hello, Devora".',
          'Then print it to the output pane with console.log.'
        ],
        starter: `// create the greeting here\n\n// print it here\n`,
        solutionExample: `let greeting = "Hello, Devora";\nconsole.log(greeting);`,
        hints: [
          'A variable is a named box for a value. Declare it with: let greeting = "Hello, Devora"',
          'console.log(greeting) prints whatever the box holds.',
          'Two lines: let greeting = "Hello, Devora" then console.log(greeting)'
        ],
        explanation:
          'let declares a variable — a named container. console.log prints any value you hand it to the output pane.',
        tests: [
          { name: 'greeting exists as a variable', fnSource: '() => typeof greeting !== "undefined"' },
          {
            name: 'prints "Hello, Devora" exactly',
            fnSource: '(printed) => printed.includes("Hello, Devora")'
          }
        ],
        reflectPrompt: 'In your own words, what does console.log do?'
      },
      {
        id: 'wf-why-html',
        module: 'First Lines',
        title: 'How a program thinks',
        type: 'concept',
        skill: 'Variables',
        minutes: 6,
        instructions: ['Read the note, then continue to the code task below it.'],
        starter: `// nothing to write here yet`,
        hints: ['Concept lessons are read-only on purpose. The editor unlocks on the next exercise.'],
        explanation:
          'A program is a recipe: it can only do exactly what it has stored in front of it, in order, line by line.',
        conceptBody:
          'A computer never guesses. It reads your program top to bottom, one line at a time, and it only knows what you have *stored* — that is what variables are for. If a value matters later, put it in a named box first (let). If you want to see a value, print it (console.log). Everything you will ever build is made of those two moves, repeated and combined.',
        tests: [],
        reflectPrompt: 'Why does the order of lines in a program matter?'
      },
      {
        id: 'wf-broken-greeting',
        module: 'First Lines',
        title: 'Fix the broken greeting card',
        type: 'debugging',
        skill: 'Debugging',
        minutes: 10,
        instructions: [
          'The greeting card below should print: Hi, Ada! — but it crashes.',
          'Run it, read the error, find the missing piece, fix it and Run again.'
        ],
        starter: `// the greeting card (broken)\nlet person = "Ada";\nlet message = "Hi, "  person + "!";\nconsole.log(message);\n`,
        solutionExample: `let person = "Ada";\nlet message = "Hi, " + person + "!";\nconsole.log(message);`,
        hints: [
          'Piece of advice first: joining text uses the + operator, like "a" + "b".',
          'Look at the line that combines the texts. One + is missing between two pieces.',
          'Write: "Hi, " + person + "!"'
        ],
        explanation:
          'A missing operator is one of the most common beginner errors. Reading the error message from left to right is the debugging skill.',
        tests: [
          { name: 'prints exactly "Hi, Ada!"', fnSource: '() => message === "Hi, Ada!"' }
        ],
        reflectPrompt: 'What clue told you which line was broken?'
      },
      {
        id: 'wf-projects',
        module: 'Your Programs',
        title: 'Build a greeting generator',
        type: 'project',
        skill: 'Variables',
        minutes: 15,
        instructions: [
          'Check off each step as you finish it. You write real code in the editor; only use what lessons 1–3 taught: let, console.log, joining with +.'
        ],
        starter: `// greeting generator\n`,
        hints: [
          'Store with: let name = "your name". Print with: console.log(name).',
          'Join text with +: "Hi, " + name + "!',
          'Need a second line? Just write another console.log on the next line.'
        ],
        explanation: 'Projects combine everything so far into something you made yourself.',
        projectSteps: [
          { label: 'A variable holding your name' },
          { label: 'Print a greeting that uses it (like "Hi, Sam!")' },
          { label: 'Print a second line with your favorite hobby' }
        ],
        tests: [],
        reflectPrompt: 'What was the first thing that surprised you while building this?'
      },
      {
        id: 'wf-final-site',
        module: 'Your Programs',
        title: 'Capstone: the intro card',
        type: 'project',
        skill: 'Variables',
        minutes: 20,
        instructions: [
          'Print a short intro card about yourself — only let, console.log and + needed.'
        ],
        starter: `// intro card\n`,
        hints: [
          'One variable per fact: let name = "...", let age = ...',
          'console.log("I am " + name) joins text and the variable.',
          'Three lines of output is the whole goal. Keep it small.'
        ],
        explanation: 'This is the program you will show a friend. Everything else was practice for this.',
        projectSteps: [
          { label: 'Variables for your name and age' },
          { label: 'Print one intro line that mentions both' },
          { label: 'Print a closing line of your choice' }
        ],
        tests: [],
        reflectPrompt: 'If you could add one thing to this card, what would it be?'
      }
    ]
  },
  {
    id: 'javascript',
    title: 'JavaScript: from zero to programs',
    description: 'Variables, conditions, functions, data — the skills every program is built from.',
    level: 'Core',
    hours: 18,
    prerequisites: 'No experience needed — we start from writing your first line.',
    outcomes: [
      'Store and reuse values with variables',
      'Make decisions with conditions',
      'Group steps into functions',
      'Fix a broken program yourself'
    ],
    milestones: ['First function', 'Debugging badge', 'The Number Guessing Game'],
    finalProjectId: 'js-final-game',
    lessons: [
      {
        id: 'js-variables',
        module: 'Variables',
        title: 'Let the computer remember',
        type: 'exercise',
        skill: 'Variables',
        minutes: 7,
        instructions: ['Create a variable `score` holding 42, then print it.'],
        starter: `// store a score\n\n// print it\n`,
        solutionExample: `let score = 42;\nconsole.log(score);`,
        hints: ['let name = value; creates the box.', 'console.log(score); prints it.'],
        explanation: 'Variables are the smallest real superpower: names that hold values.',
    tests: [
          { name: 'score holds 42', fnSource: '() => score === 42' },
          { name: 'score was printed', fnSource: '(printed) => printed.includes("42")' }
        ],
        reflectPrompt: 'Why do programs need names for values at all?'
      },
      {
        id: 'js-conditions',
        module: 'Conditions',
        title: 'Teach it to decide',
        type: 'exercise',
        skill: 'Conditions',
        minutes: 10,
        instructions: [
          'Given `age`, print "adult" if age is 18 or more, else print "minor".'
        ],
        starter: `let age = 20;\n\n// your condition here\n`,
        solutionExample: `let age = 20;\nif (age >= 18) console.log("adult");\nelse console.log("minor");`,
        hints: [
          'A condition reads like English: if (something is true) do X, else do Y.',
          'Compare with >= ; strings go in quotes.'
        ],
        explanation: 'if/else is how programs choose between two paths.',
        tests: [
          { name: 'prints "adult" for age 20', fnSource: '(printed) => printed.includes("adult")' }
        ],
        reflectPrompt: 'Describe a real-life rule that would be an if/else.'
      },
      {
        id: 'js-functions',
        module: 'Functions',
        title: 'Name a whole action',
        type: 'exercise',
        skill: 'Functions',
        minutes: 12,
        instructions: [
          'Write a function double(n) that returns n * 2. Then print double(21).'
        ],
        starter: `// write double(n) here\n\n// print double(21)\n`,
        solutionExample: `function double(n) {\n  return n * 2;\n}\nconsole.log(double(21));`,
        hints: [
          'function name(parameters) { return value; }',
          'return sends a value back to whoever called the function.',
          'double(21) means "run double with 21".'
        ],
        explanation: 'Functions name a group of steps so you can run them on demand, with inputs.',
        tests: [
          { name: 'double(21) is 42', fnSource: '() => double(21) === 42' },
          { name: 'double exists', fnSource: '() => typeof double === "function"' }
        ],
        reflectPrompt: 'In your own words, what does this function do?'
      },
      {
        id: 'js-fix-loop',
        module: 'Debugging',
        title: 'The runaway counter',
        type: 'debugging',
        skill: 'Debugging',
        minutes: 12,
        instructions: [
          'This loop was supposed to print 1 to 5, then "done". Run it — it only prints "done".',
          'That means the loop never ran. Find why, fix it, and Run again to confirm.'
        ],
        starter: `let i = 6;\nwhile (i <= 5) {\n  console.log(i);\n  i = i + 1;\n}\nconsole.log("done");\n`,
        solutionExample: `let i = 1;\nwhile (i <= 5) {\n  console.log(i);\n  i = i + 1;\n}\nconsole.log("done");`,
        hints: [
          'A while loop only runs if its condition is true. It checks BEFORE the very first line inside.',
          'The first check here is "6 <= 5" — already false. So the body never runs once.',
          'Start at 1, not 6: let i = 1'
        ],
        explanation: 'Loops with the wrong start value silently do nothing — reading output first is the fix.',
        tests: [
          {
            name: 'prints 1..5 then done',
            fnSource: '(printed) => printed.join(",") === "1,2,3,4,5,done"'
          }
        ],
        reflectPrompt: 'What made the loop skip every line?'
      },
      {
        id: 'js-final-game',
        module: 'Your Game',
        title: 'Capstone: the Number Guessing Game',
        type: 'project',
        skill: 'Programs',
        minutes: 40,
        instructions: [
          'Goal: pick a secret number, tell the player if each guess is too high or low.'
        ],
        starter: `// Number Guessing Game\nlet secret = 7;\n// your code\n`,
        hints: ['Start with one hard-coded guess. Get ONE if/else working before looping.'],
        explanation: 'A real program: input, decision, output, repeat.',
        projectSteps: [
          { label: 'One guess → high/low message' },
          { label: 'Ask again until right' },
          { label: 'Congratulate at the end' }
        ],
        tests: [],
        reflectPrompt: 'Which part of the game felt most like real programming?'
      }
    ]
  },
  /* NOTE: the Python path is intentionally not listed in PATHS yet — the
     in-browser runner executes JavaScript only, and a Python lesson failing
     with JS errors is a broken promise to a beginner. Re-add this entry once
     a Python runner (e.g. Pyodide) is wired into lib/runner.ts.
  {
    id: 'python',
    title: 'Python for real-world scripts',
    description: 'The friendliest first language: files, data and automation from day one.',
    level: 'Next',
    hours: 10,
    prerequisites: 'Web Foundations or JavaScript path makes this easier, but neither is required.',
    outcomes: ['Read and write files', 'Process text and numbers', 'Automate a boring task'],
    milestones: ['First script', 'Automation!'],
    finalProjectId: 'py-final-automation',
    lessons: [
      {
        id: 'py-hello',
        module: 'First Script',
        title: 'print and be printed',
        type: 'exercise',
        skill: 'IO',
        minutes: 6,
        instructions: ['Print your name to the console.'],
        starter: `# print your name\n`,
        hints: ['Python uses print("...") — one word, no semicolon.'],
        explanation: 'print() is Python’s hello to the console.',
        tests: [],
        reflectPrompt: 'What did print() actually do?'
      },
      {
        id: 'py-automation',
        module: 'Automation',
        title: 'Rename 100 files by yourself',
        type: 'concept',
        skill: 'Automation',
        minutes: 9,
        instructions: ['Read why automation beats clicking 100 times.'],
        starter: '',
        hints: ['Concept lesson — the next one is hands-on.'],
        explanation: 'Scripts are the reason programming exists: boring work becomes one command.',
        conceptBody:
          'If you renamed 100 holiday photos one by one, it would take an hour. A 5-line script does it in a second, always correctly, every time. That is the entire argument for learning to code.',
        tests: [],
        reflectPrompt: 'Name one task on your computer you wish was automated.'
      }
    ]
  }
  */
]

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

export function findLesson(id: string) {
  for (const p of PATHS) for (const l of p.lessons) if (l.id === id) return { path: p, lesson: l }
  return null
}

export function findChallenge(id: string) {
  return CHALLENGES.find((c) => c.id === id) ?? null
}
