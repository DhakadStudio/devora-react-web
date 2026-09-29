import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LessonPage } from '../pages/Lesson'
import { getLesson, getExercise, listLessons, type Exercise, type Lesson, type LessonRef } from '../engines/curriculum'

// The curriculum engine is replaced wholesale so the probe never touches
// Supabase. Types still resolve to the real module (type imports are static).
vi.mock('../engines/curriculum', () => ({
  getLesson: vi.fn(),
  getExercise: vi.fn(),
  listLessons: vi.fn()
}))

// Monaco cannot mount in jsdom (no ResizeObserver); the probe stubs it so the
// loop assertion is about the page, not the editor.
vi.mock('@monaco-editor/react', () => ({
  default: function MockEditor() {
    return <div data-testid="mock-monaco" />
  }
}))

const lesson: Lesson = {
  id: 'lesson-1',
  title: 'First lesson',
  position: 0,
  moduleId: 'module-1',
  content: {
    id: 'lesson-1',
    kind: 'lesson',
    objective: 'Print a line',
    blocks: [
      { type: 'explanation', body: 'console.log prints a line.' },
      { type: 'exercise', exerciseId: 'exercise-1' },
      { type: 'reflection', prompt: 'What did you learn?' }
    ]
  }
}

const exercise: Exercise = {
  id: 'exercise-1',
  title: 'Print a line',
  position: 0,
  lessonId: 'lesson-1',
  content: {
    id: 'exercise-1',
    kind: 'exercise',
    type: 'free-code',
    language: 'javascript',
    instructions: 'Print "hi"',
    starterCode: 'console.log("hi")\n',
    tests: [{ kind: 'exercise-test', description: 'prints hi', stdin: '', expectedOutput: 'hi' }],
    hints: ['Use console.log'],
    options: null,
    answerIndex: null
  }
}

const siblings: LessonRef[] = [
  { id: 'lesson-1', title: 'First lesson', position: 0 },
  { id: 'lesson-2', title: 'Second lesson', position: 1 }
]

describe('LessonPage mount (critical-loop render probe)', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockResolvedValue(lesson)
    vi.mocked(getExercise).mockResolvedValue(exercise)
    vi.mocked(listLessons).mockResolvedValue(siblings)
  })

  it('mounts without an update loop and reaches the exercise workspace', async () => {
    const errors: string[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })

    try {
      const { getByRole, getByText, queryByText } = render(
        <MemoryRouter initialEntries={['/lesson/lesson-1']}>
          <Routes>
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
          </Routes>
        </MemoryRouter>
      )

      // Loading state first, then the workspace with the critical-loop controls.
      await waitFor(() => expect(getByRole('button', { name: /run/i })).toBeTruthy())
      expect(getByRole('button', { name: /submit/i })).toBeTruthy()
      expect(getByRole('button', { name: /reset/i })).toBeTruthy()
      expect(getByText('Print "hi"')).toBeTruthy()
      expect(queryByText(/Maximum update depth/i)).toBeNull()

      // The loop would also spam console.error with React's depth warning.
      const loopErrors = errors.filter((e) => /Maximum update depth|Too many re-renders/i.test(e))
      expect(loopErrors).toEqual([])
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('shows the educational empty state when content cannot be parsed', async () => {
    vi.mocked(getLesson).mockResolvedValue({ ...lesson, content: null })
    const { getByRole, findByText } = render(
      <MemoryRouter initialEntries={['/lesson/lesson-1']}>
        <Routes>
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await findByText('Lesson content unavailable')).toBeTruthy()
    expect(getByRole('link', { name: /browse paths/i })).toBeTruthy()
  })
})
