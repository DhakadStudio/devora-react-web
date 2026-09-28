import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CourseSummary,
  Lesson,
  LessonBlock,
  LessonRef,
  ModuleSummary,
  PathSummary
} from '../../engines/curriculum'

vi.mock('../../lib/supabase', () => ({ getSupabase: vi.fn() }))

type Row = Record<string, unknown>

interface FakeQueryCall {
  table: string
  select?: string
  eq?: [string, unknown]
  order?: string
}

function makeFakeSupabase(tables: Record<string, Row[]>) {
  const calls: FakeQueryCall[] = []
  const client = {
    from(table: string) {
      const call: FakeQueryCall = { table }
      calls.push(call)
      let rows: Row[] = tables[table] ?? []
      const builder: Record<string, unknown> = {
        select(cols: string) {
          call.select = cols
          return builder
        },
        eq(col: string, value: unknown) {
          call.eq = [col, value]
          rows = rows.filter((row) => row[col] === value)
          return builder
        },
        order(col: string) {
          call.order = col
          return builder
        },
        maybeSingle() {
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        },
        then(
          onFulfilled?: (value: { data: Row[] | null; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected)
        }
      }
      return builder
    }
  }
  return { client: client as unknown as SupabaseClient, calls }
}

function makeFailingSupabase() {
  const calls: FakeQueryCall[] = []
  const error = { message: 'database unavailable', code: '54300', details: null, hint: null }
  const client = {
    from(table: string) {
      calls.push({ table })
      const builder: Record<string, unknown> = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        order() {
          return builder
        },
        maybeSingle() {
          return Promise.resolve({ data: null, error })
        },
        then(
          onFulfilled?: (value: { data: Row[] | null; error: typeof error }) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          return Promise.reject(new Error('database unavailable')).then(onFulfilled, onRejected)
        }
      }
      return builder
    }
  }
  return { client: client as unknown as SupabaseClient, calls }
}

async function setup(tables: Record<string, Row[]>) {
  const { client, calls } = makeFakeSupabase(tables)
  const supabase = await import('../../lib/supabase')
  vi.mocked(supabase.getSupabase).mockReturnValue(client)
  const engine = await import('../../engines/curriculum')
  return { engine, calls }
}

const PATH_COLUMNS = 'id, title, summary, level, hours, prerequisites, outcomes'
const LIST_COLUMNS = 'id, title, summary, position'

const pathRows: Row[] = [
  {
    id: 'path-web',
    title: 'Web Foundations',
    summary: 'Build for the browser',
    level: 'beginner',
    hours: 12,
    prerequisites: null,
    outcomes: ['Ship a static site', 'Style with confidence', 42, null]
  },
  {
    id: 'path-js',
    title: 'JavaScript Basics',
    summary: null,
    level: null,
    hours: null,
    prerequisites: 'Web Foundations',
    outcomes: {}
  }
]

const courseRows: Row[] = [
  { id: 'course-html', path_id: 'path-web', title: 'HTML & CSS', summary: null, position: 1 },
  { id: 'course-js', path_id: 'path-js', title: 'JavaScript Basics', summary: 'The language', position: 2 }
]

const moduleRows: Row[] = [
  { id: 'module-1', course_id: 'course-html', title: 'Selectors', summary: 'Target anything', position: 1 },
  { id: 'module-2', course_id: 'course-js', title: 'Values', summary: null, position: 2 }
]

const knownBlocksContent = {
  id: 'lesson-1',
  kind: 'lesson',
  objective: 'Understand CSS selectors',
  blocks: [
    { type: 'explanation', body: 'Selectors target elements.' },
    { type: 'example', code: 'h1 { color: red; }', caption: 'A simple rule', language: 'css' },
    { type: 'interactive', language: 'css', description: 'Try selectors live', starterCode: 'h1 {}' },
    {
      type: 'question',
      prompt: 'What does .btn target?',
      options: ['a class', 'an id'],
      answerIndex: 0,
      explanation: 'A dot prefix means class.'
    },
    { type: 'exercise', exerciseId: 'exercise-1' },
    { type: 'reflection', prompt: 'Where would you use an id instead?' }
  ]
}

const unknownBlockContent = {
  id: 'lesson-2',
  kind: 'lesson',
  objective: 'Unknown blocks stay as data',
  blocks: [
    { type: 'explanation', body: 'Still renders fine.' },
    { type: 'video', src: 'https://example.com/selectors.mp4' }
  ]
}

const lessonRows: Row[] = [
  { id: 'lesson-1', module_id: 'module-1', title: 'Selectors 101', position: 1, content: knownBlocksContent },
  { id: 'lesson-2', module_id: 'module-1', title: 'Forward-compatible lesson', position: 2, content: unknownBlockContent },
  {
    id: 'lesson-3',
    module_id: 'module-1',
    title: 'Missing objective',
    position: 3,
    content: { id: 'lesson-3', kind: 'lesson', blocks: [] }
  },
  {
    id: 'lesson-4',
    module_id: 'module-1',
    title: 'Blocks not an array',
    position: 4,
    content: { id: 'lesson-4', kind: 'lesson', objective: 'x', blocks: 'nope' }
  },
  { id: 'lesson-5', module_id: 'module-1', title: 'No content', position: 5, content: null },
  {
    id: 'lesson-6',
    module_id: 'module-1',
    title: 'Invalid known block',
    position: 6,
    content: {
      id: 'lesson-6',
      kind: 'lesson',
      objective: 'One broken block among good ones',
      blocks: [{ type: 'question', prompt: 'q', answerIndex: 0 }]
    }
  },
  { id: 'lesson-7', module_id: 'module-2', title: 'Other module lesson', position: 7, content: null }
]

const exerciseContent = {
  id: 'exercise-1',
  kind: 'exercise',
  type: 'free-code',
  language: 'css',
  instructions: 'Make the button red.',
  starterCode: '.btn {}',
  tests: [
    { kind: 'exercise-test', description: 'button is red', expectedOutput: 'PASS' },
    { kind: 'exercise-test', description: 'uses the class selector', stdin: '.btn', expectedOutput: 'PASS' },
    { kind: 'wrong-kind', description: 'junk entry', expectedOutput: 'PASS' }
  ],
  hints: ['Use color', 7],
  options: null,
  answerIndex: null,
  expectedBehavior: 'The button turns red',
  referenceSolution: '.btn { color: red; }',
  completionCriteria: 'All tests pass'
}

const multipleChoiceContent = {
  id: 'exercise-2',
  kind: 'exercise',
  type: 'multiple-choice',
  instructions: 'Pick the class selector.',
  tests: [],
  options: ['.btn', '#btn'],
  answerIndex: 1
}

const exerciseRows: Row[] = [
  { id: 'exercise-1', lesson_id: 'lesson-1', title: 'Style a button', position: 1, content: exerciseContent },
  { id: 'exercise-2', lesson_id: 'lesson-1', title: 'Pick a selector', position: 2, content: multipleChoiceContent },
  {
    id: 'exercise-3',
    lesson_id: 'lesson-1',
    title: 'Unknown kind',
    position: 3,
    content: { id: 'exercise-3', kind: 'exercise', type: 'fill-in-the-blank', instructions: 'Fill it.' }
  },
  { id: 'exercise-4', lesson_id: 'lesson-1', title: 'No content', position: 4, content: null }
]

describe('curriculum engine', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  describe('listPaths', () => {
    it('maps learning_paths rows to PathSummary with defaults for nulls', async () => {
      const { engine, calls } = await setup({ learning_paths: pathRows })
      const paths: PathSummary[] = await engine.listPaths()
      expect(paths).toEqual([
        {
          id: 'path-web',
          title: 'Web Foundations',
          summary: 'Build for the browser',
          level: 'beginner',
          hours: 12,
          prerequisites: '',
          outcomes: ['Ship a static site', 'Style with confidence']
        },
        {
          id: 'path-js',
          title: 'JavaScript Basics',
          summary: '',
          level: '',
          hours: 0,
          prerequisites: 'Web Foundations',
          outcomes: []
        }
      ])
      expect(calls).toEqual([{ table: 'learning_paths', select: PATH_COLUMNS, order: 'title' }])
    })

    it('returns [] without crashing when the database errors', async () => {
      const failing = makeFailingSupabase()
      const supabase = await import('../../lib/supabase')
      vi.mocked(supabase.getSupabase).mockReturnValue(failing.client)
      const engine = await import('../../engines/curriculum')
      await expect(engine.listPaths()).resolves.toEqual([])
    })
  })

  describe('getPath', () => {
    it('returns a mapped path when it exists', async () => {
      const { engine, calls } = await setup({ learning_paths: pathRows })
      const path: PathSummary | null = await engine.getPath('path-web')
      expect(path).toEqual({
        id: 'path-web',
        title: 'Web Foundations',
        summary: 'Build for the browser',
        level: 'beginner',
        hours: 12,
        prerequisites: '',
        outcomes: ['Ship a static site', 'Style with confidence']
      })
      expect(calls).toEqual([{ table: 'learning_paths', select: PATH_COLUMNS, eq: ['id', 'path-web'] }])
    })

    it('returns null when the path does not exist', async () => {
      const { engine } = await setup({ learning_paths: pathRows })
      await expect(engine.getPath('missing')).resolves.toBeNull()
    })
  })

  describe('listCourses', () => {
    it('returns mapped course summaries filtered by path_id', async () => {
      const { engine, calls } = await setup({ courses: courseRows })
      const courses: CourseSummary[] = await engine.listCourses('path-web')
      expect(courses).toEqual([{ id: 'course-html', title: 'HTML & CSS', summary: '', position: 1 }])
      expect(calls).toEqual([
        { table: 'courses', select: LIST_COLUMNS, eq: ['path_id', 'path-web'], order: 'position' }
      ])
    })
  })

  describe('getCourse', () => {
    it('returns a mapped course when it exists', async () => {
      const { engine, calls } = await setup({ courses: courseRows })
      const course: CourseSummary | null = await engine.getCourse('course-html')
      expect(course).toEqual({ id: 'course-html', title: 'HTML & CSS', summary: '', position: 1 })
      expect(calls).toEqual([{ table: 'courses', select: LIST_COLUMNS, eq: ['id', 'course-html'] }])
    })

    it('returns null when the course does not exist', async () => {
      const { engine } = await setup({ courses: courseRows })
      await expect(engine.getCourse('missing')).resolves.toBeNull()
    })
  })

  describe('listModules', () => {
    it('returns mapped module summaries filtered by course_id', async () => {
      const { engine, calls } = await setup({ modules: moduleRows })
      const modules: ModuleSummary[] = await engine.listModules('course-html')
      expect(modules).toEqual([{ id: 'module-1', title: 'Selectors', summary: 'Target anything', position: 1 }])
      expect(calls).toEqual([
        { table: 'modules', select: LIST_COLUMNS, eq: ['course_id', 'course-html'], order: 'position' }
      ])
    })
  })

  describe('listLessons', () => {
    it('returns lesson refs for the module filtered by module_id', async () => {
      const { engine, calls } = await setup({ lessons: lessonRows })
      const lessons: LessonRef[] = await engine.listLessons('module-1')
      expect(lessons).toEqual([
        { id: 'lesson-1', title: 'Selectors 101', position: 1 },
        { id: 'lesson-2', title: 'Forward-compatible lesson', position: 2 },
        { id: 'lesson-3', title: 'Missing objective', position: 3 },
        { id: 'lesson-4', title: 'Blocks not an array', position: 4 },
        { id: 'lesson-5', title: 'No content', position: 5 },
        { id: 'lesson-6', title: 'Invalid known block', position: 6 }
      ])
      expect(calls).toEqual([
        { table: 'lessons', select: 'id, title, position', eq: ['module_id', 'module-1'], order: 'position' }
      ])
    })
  })

  describe('getLesson', () => {
    it('returns the lesson with parsed content covering every block type', async () => {
      const { engine } = await setup({ lessons: lessonRows })
      const lesson: Lesson | null = await engine.getLesson('lesson-1')
      expect(lesson).toEqual({
        id: 'lesson-1',
        title: 'Selectors 101',
        position: 1,
        moduleId: 'module-1',
        content: {
          id: 'lesson-1',
          kind: 'lesson',
          objective: 'Understand CSS selectors',
          blocks: [
            { type: 'explanation', body: 'Selectors target elements.' },
            { type: 'example', code: 'h1 { color: red; }', caption: 'A simple rule', language: 'css' },
            { type: 'interactive', language: 'css', description: 'Try selectors live', starterCode: 'h1 {}' },
            {
              type: 'question',
              prompt: 'What does .btn target?',
              options: ['a class', 'an id'],
              answerIndex: 0,
              explanation: 'A dot prefix means class.'
            },
            { type: 'exercise', exerciseId: 'exercise-1' },
            { type: 'reflection', prompt: 'Where would you use an id instead?' }
          ]
        }
      })
    })

    it('keeps unknown block types as data instead of crashing', async () => {
      const { engine } = await setup({ lessons: lessonRows })
      const lesson: Lesson | null = await engine.getLesson('lesson-2')
      expect(lesson).toEqual({
        id: 'lesson-2',
        title: 'Forward-compatible lesson',
        position: 2,
        moduleId: 'module-1',
        content: {
          id: 'lesson-2',
          kind: 'lesson',
          objective: 'Unknown blocks stay as data',
          blocks: [
            { type: 'explanation', body: 'Still renders fine.' },
            { type: 'video', src: 'https://example.com/selectors.mp4' }
          ]
        }
      })
      const blocks: LessonBlock[] = lesson?.content?.blocks ?? []
      expect(blocks[1].type).toBe('video')
    })

    it('demotes known-type blocks with invalid required fields to unknown data instead of crashing', async () => {
      const { engine } = await setup({ lessons: lessonRows })
      const lesson: Lesson | null = await engine.getLesson('lesson-6')
      expect(lesson).toEqual({
        id: 'lesson-6',
        title: 'Invalid known block',
        position: 6,
        moduleId: 'module-1',
        content: {
          id: 'lesson-6',
          kind: 'lesson',
          objective: 'One broken block among good ones',
          blocks: [{ prompt: 'q', answerIndex: 0, type: '' }]
        }
      })
    })

    it('returns null content for malformed content (missing objective)', async () => {
      const { engine } = await setup({ lessons: lessonRows })
      const lesson: Lesson | null = await engine.getLesson('lesson-3')
      expect(lesson).toEqual({
        id: 'lesson-3',
        title: 'Missing objective',
        position: 3,
        moduleId: 'module-1',
        content: null
      })
    })

    it('returns null content for non-array blocks', async () => {
      const { engine } = await setup({ lessons: lessonRows })
      const lesson: Lesson | null = await engine.getLesson('lesson-4')
      expect(lesson).toEqual({
        id: 'lesson-4',
        title: 'Blocks not an array',
        position: 4,
        moduleId: 'module-1',
        content: null
      })
    })

    it('returns null content when content is null', async () => {
      const { engine } = await setup({ lessons: lessonRows })
      const lesson: Lesson | null = await engine.getLesson('lesson-5')
      expect(lesson).toEqual({
        id: 'lesson-5',
        title: 'No content',
        position: 5,
        moduleId: 'module-1',
        content: null
      })
    })

    it('returns null when the lesson does not exist', async () => {
      const { engine } = await setup({ lessons: lessonRows })
      await expect(engine.getLesson('missing')).resolves.toBeNull()
    })
  })

  describe('getExercise', () => {
    it('parses free-code content and normalizes absent stdin to an empty string', async () => {
      const { engine } = await setup({ exercises: exerciseRows })
      const exercise = await engine.getExercise('exercise-1')
      expect(exercise).toEqual({
        id: 'exercise-1',
        title: 'Style a button',
        position: 1,
        lessonId: 'lesson-1',
        content: {
          id: 'exercise-1',
          kind: 'exercise',
          type: 'free-code',
          language: 'css',
          instructions: 'Make the button red.',
          starterCode: '.btn {}',
          tests: [
            { kind: 'exercise-test', description: 'button is red', stdin: '', expectedOutput: 'PASS' },
            { kind: 'exercise-test', description: 'uses the class selector', stdin: '.btn', expectedOutput: 'PASS' }
          ],
          hints: ['Use color'],
          options: null,
          answerIndex: null,
          expectedBehavior: 'The button turns red',
          referenceSolution: '.btn { color: red; }',
          completionCriteria: 'All tests pass'
        }
      })
    })

    it('parses multiple-choice content with null language and no tests', async () => {
      const { engine } = await setup({ exercises: exerciseRows })
      const exercise = await engine.getExercise('exercise-2')
      expect(exercise).toEqual({
        id: 'exercise-2',
        title: 'Pick a selector',
        position: 2,
        lessonId: 'lesson-1',
        content: {
          id: 'exercise-2',
          kind: 'exercise',
          type: 'multiple-choice',
          language: null,
          instructions: 'Pick the class selector.',
          starterCode: null,
          tests: [],
          hints: null,
          options: ['.btn', '#btn'],
          answerIndex: 1
        }
      })
    })

    it('returns null content for unknown exercise types', async () => {
      const { engine } = await setup({ exercises: exerciseRows })
      const exercise = await engine.getExercise('exercise-3')
      expect(exercise).toEqual({
        id: 'exercise-3',
        title: 'Unknown kind',
        position: 3,
        lessonId: 'lesson-1',
        content: null
      })
    })

    it('returns null content when content is null', async () => {
      const { engine } = await setup({ exercises: exerciseRows })
      const exercise = await engine.getExercise('exercise-4')
      expect(exercise).toEqual({
        id: 'exercise-4',
        title: 'No content',
        position: 4,
        lessonId: 'lesson-1',
        content: null
      })
    })

    it('returns null when the exercise does not exist', async () => {
      const { engine } = await setup({ exercises: exerciseRows })
      await expect(engine.getExercise('missing')).resolves.toBeNull()
    })
  })

  describe('session cache', () => {
    it('resolves a second identical call from cache without a new query', async () => {
      const { engine, calls } = await setup({ learning_paths: pathRows })
      await engine.listPaths()
      await engine.listPaths()
      expect(calls).toHaveLength(1)
    })

    it('caches per query key, so distinct queries fetch separately', async () => {
      const { engine, calls } = await setup({ learning_paths: pathRows })
      await engine.listPaths()
      await engine.getPath('path-web')
      expect(calls).toHaveLength(2)
      await engine.getPath('path-web')
      expect(calls).toHaveLength(2)
    })
  })

  it('returns empty results without crashing when supabase is unavailable', async () => {
    const supabase = await import('../../lib/supabase')
    vi.mocked(supabase.getSupabase).mockReturnValue(null)
    const engine = await import('../../engines/curriculum')
    await expect(engine.listPaths()).resolves.toEqual([])
    await expect(engine.getPath('path-web')).resolves.toBeNull()
    await expect(engine.getLesson('lesson-1')).resolves.toBeNull()
    await expect(engine.getExercise('exercise-1')).resolves.toBeNull()
  })
})
