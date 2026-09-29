import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LessonPage } from '../../pages/Lesson'
import { AuthProvider } from '../../lib/auth'
import { ThemeProvider } from '../../lib/theme'
import { ToastProvider } from '../../components/Toast'
import { getProgressStore } from '../../engines/progress/store'
import {
  installMockSupabase,
  getMockSupabase,
  fakeUser,
  type MockSupabase
} from '../mocks/supabase'

/**
 * E2E critical loop (Task 11): open lesson → write code → run → pass →
 * progress saved — against the REAL Lesson page, the real learning/progress/
 * execution engines and the real stores. Only the network boundary is mocked:
 * src/lib/supabase is replaced by a configurable fake client over DB-shaped
 * fixtures (rows verbatim from the live DB), and Monaco is stubbed to a
 * textarea (src/test/mocks/editor.tsx) because it cannot mount in jsdom — the
 * real CodeEditor still renders and wires the stub. Both variants flow through
 * the real AuthProvider: the fake client's auth.getSession answers the
 * session, so the signed-in variant proves the progress engine's Supabase
 * sync (lesson_progress upsert + exercise_attempts insert), not just local
 * state. The route is a splat (/lesson/*) — real lesson ids contain slashes.
 * Lesson page + routes rather than the full App shell: the shell's
 * BrowserRouter cannot take initial entries in jsdom.
 */

vi.mock('../../lib/supabase', async () => {
  const { mockGetSupabase } = await import('../mocks/supabase')
  return {
    getSupabase: mockGetSupabase,
    OAUTH_PROVIDERS: [
      { id: 'google', label: 'Google' },
      { id: 'github', label: 'GitHub' }
    ]
  }
})

vi.mock('@monaco-editor/react', async () => {
  const { MockMonaco } = await import('../mocks/editor')
  return { default: MockMonaco }
})

// Real lesson id from the live DB.
const LESSON_ID = 'javascript-fundamentals/core/foundations/values-and-output'
const MODULE_ID = 'javascript-fundamentals/core/foundations'
const EXERCISE_ID = 'javascript-fundamentals/core/foundations/values-and-output/ex-1'
const PASSING_CODE = "console.log('Learning JavaScript!')"

// Rows verbatim from the live DB (shapes the curriculum parser consumes).
const lessonRow = {
  id: LESSON_ID,
  title: 'Values & Output',
  position: 0,
  module_id: MODULE_ID,
  content: {
    id: LESSON_ID,
    kind: 'lesson-content',
    objective: 'Understand what a value is in JavaScript and how to observe one using console.log.',
    blocks: [
      {
        type: 'example',
        language: 'javascript',
        caption: 'Three different kinds of value, printed one per line.',
        code: "console.log('Hello, world!')   // prints the text Hello, world!\nconsole.log(42)                 // prints the number 42\nconsole.log(true)               // prints true"
      },
      {
        type: 'explanation',
        body: 'A value is any single piece of data your program works with. Text like "hello" is a value. A number like 42 is a value. So is a boolean — one of the words true or false, JavaScript\'s way of answering a yes-or-no question.'
      },
      {
        type: 'explanation',
        body: '`console.log(...)` makes JavaScript show you a value while your program runs. This matters because, once your code does more than one obvious thing, you need a way to check what it actually did. Printing values is the simplest way to do that — while learning now, and when debugging bigger programs later.'
      },
      {
        type: 'interactive',
        language: 'javascript',
        description:
          'Change the text inside the quotes to your own message, then add one more console.log that prints a number or `true`.',
        starterCode: "// Try changing the text inside the quotes, then run it\nconsole.log('Hello, Devora!')\n// Add another console.log line below that prints a number or true\n"
      },
      {
        type: 'question',
        prompt: 'Which of these actually prints the message Welcome! where you can see it?',
        options: ["console.log('Welcome!')", "'Welcome!'", '// Welcome!'],
        answerIndex: 0,
        explanation:
          '`console.log(...)` is the only one that prints. Quoted text by itself is just a value with nothing done to it, and a line starting with `//` is a comment — a note for humans that JavaScript ignores.'
      },
      { type: 'exercise', exerciseId: EXERCISE_ID },
      {
        type: 'reflection',
        prompt:
          'Think of a time you needed to check what a program (or even a calculator, or a recipe) actually produced partway through, instead of just trusting it worked. How did you check?'
      }
    ]
  }
}

const siblingRows = [
  'variables',
  'conditionals',
  'functions',
  'putting-it-together'
].map((slug, i) => ({
  id: `${MODULE_ID}/${slug}`,
  title: ['Variables', 'Conditionals', 'Functions', 'Putting It Together'][i],
  position: i + 1,
  module_id: MODULE_ID,
  content: null
}))

const exerciseRow = {
  id: EXERCISE_ID,
  title: 'Print a message',
  position: 0,
  lesson_id: LESSON_ID,
  content: {
    id: EXERCISE_ID,
    kind: 'exercise-content',
    type: 'free-code',
    language: 'javascript',
    instructions: 'Write a program that logs the exact message "Learning JavaScript!" to the console.',
    starterCode: '// Write your code here\n',
    tests: [
      {
        kind: 'exercise-test',
        stdin: '',
        description: 'Prints the exact message',
        expectedOutput: 'Learning JavaScript!'
      }
    ],
    hints: ['Use console.log(...) with the exact text in quotes.'],
    options: null,
    answerIndex: null,
    expectedBehavior: 'Prints exactly "Learning JavaScript!" followed by a newline — nothing else.',
    referenceSolution: "console.log('Learning JavaScript!')",
    completionCriteria: 'all-tests-pass'
  }
}

const INSTRUCTIONS = 'Write a program that logs the exact message "Learning JavaScript!" to the console.'

function renderLessonPage() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/lesson/${LESSON_ID}`]}>
            <Routes>
              <Route path="/lesson/*" element={<LessonPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

/** The critical loop itself: workspace visible → type passing code → Run →
 *  per-case pass visible → Submit → completion state. */
async function runThroughCriticalLoop() {
  const user = userEvent.setup()

  const workspace = await screen.findByRole('region', { name: 'Exercise workspace' })
  // The real CodeEditor's lazy Monaco resolves a tick after first render,
  // swapping its fallback textarea for the stub — wait for the STABLE stub
  // node (only the stub carries this testid), or typing hits a detached node.
  const editor = await within(workspace).findByTestId('mock-editor')
  expect(within(workspace).getByRole('button', { name: 'Run' })).toBeTruthy()
  expect(within(workspace).getByRole('button', { name: 'Submit' })).toBeTruthy()
  expect(screen.getByText(INSTRUCTIONS)).toBeTruthy()

  await user.clear(editor)
  await user.type(editor, PASSING_CODE)

  await user.click(within(workspace).getByRole('button', { name: 'Run' }))
  const checks = await screen.findByRole('list', { name: 'Checks — each passes or fails on its own' })
  expect(within(checks).getByText('Prints the exact message')).toBeTruthy()
  expect(within(checks).getByText('pass')).toBeTruthy()
  expect(await screen.findByText('All tests passed')).toBeTruthy()

  await user.click(within(workspace).getByRole('button', { name: 'Submit' }))
  expect(await screen.findByText('Lesson complete!')).toBeTruthy()
  expect(await screen.findByText('done')).toBeTruthy()
}

describe('E2E critical loop — open lesson, write, run, pass, progress saved', () => {
  beforeEach(() => {
    // The progress store is a module singleton — the guest variant's state
    // must never leak into the signed-in variant (resetAll also clears
    // localStorage through the store's own emit).
    getProgressStore().resetAll()
    installMockSupabase({
      lessons: [lessonRow, ...siblingRows],
      exercises: [exerciseRow],
      session: null
    })
  })

  it('guest: full flow with progress saved to localStorage only', async () => {
    const supabase = getMockSupabase() as MockSupabase
    renderLessonPage()

    await runThroughCriticalLoop()

    // A guest's progress writes never cross the network boundary.
    expect(supabase.captures.lessonProgressUpserts).toEqual([])
    expect(supabase.captures.exerciseAttemptInserts).toEqual([])

    const saved = JSON.parse(localStorage.getItem('devora-react-progress') ?? '{}') as {
      lessons?: Record<string, { status?: string }>
    }
    const status = saved.lessons?.[LESSON_ID]?.status
    expect(status === 'passed' || status === 'completed').toBe(true)
  }, 20_000)

  it('signed-in: the same flow also syncs — lesson_progress upsert + exercise_attempts insert', async () => {
    const supabase = installMockSupabase({
      lessons: [lessonRow, ...siblingRows],
      exercises: [exerciseRow],
      session: {
        user: fakeUser('test-user-id'),
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600
      }
    })
    renderLessonPage()

    await runThroughCriticalLoop()

    const upserts = supabase.captures.lessonProgressUpserts.filter((row) => row.lesson_id === LESSON_ID)
    expect(
      upserts.some((row) => row.status === 'passed' || row.status === 'completed')
    ).toBe(true)
    expect(upserts.every((row) => row.user_id === 'test-user-id')).toBe(true)

    const attempts = supabase.captures.exerciseAttemptInserts.filter(
      (row) => row.exercise_id === EXERCISE_ID
    )
    expect(attempts.some((row) => row.status === 'passed')).toBe(true)
    expect(attempts.every((row) => row.user_id === 'test-user-id')).toBe(true)
  }, 20_000)
})
