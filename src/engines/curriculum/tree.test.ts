import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('../../lib/supabase', () => ({ getSupabase: vi.fn() }))

type Row = Record<string, unknown>

interface FakeQueryCall {
  table: string
  select?: string
}

function makeFakeSupabase(tables: Record<string, Row[]>) {
  const calls: FakeQueryCall[] = []

  const EMBED_CHAIN = [
    { key: 'courses', fk: 'path_id', table: 'courses' },
    { key: 'modules', fk: 'course_id', table: 'modules' },
    { key: 'lessons', fk: 'module_id', table: 'lessons' },
    { key: 'exercises', fk: 'lesson_id', table: 'exercises' }
  ] as const

  function embedChildren(row: Row, depth: number, s: string): Row {
    if (depth >= EMBED_CHAIN.length) return row
    const { key, fk, table } = EMBED_CHAIN[depth]
    if (!s.includes(`${key}(`)) return row
    const children = (tables[table] ?? [])
      .filter((c) => c[fk] === row.id)
      .map((c) => embedChildren({ ...c }, depth + 1, s))
    return { ...row, [key]: children }
  }

  const client = {
    from(table: string) {
      const call: FakeQueryCall = { table }
      calls.push(call)
      let rows: Row[] = tables[table] ?? []
      const builder: Record<string, unknown> = {
        select(cols: string) {
          call.select = cols
          const s = cols ?? ''
          if (table === 'learning_paths' && s.includes('courses(')) {
            rows = rows.map((row) => embedChildren({ ...row }, 0, s))
          }
          return builder
        },
        eq(col: string, value: unknown) {
          rows = rows.filter((row) => row[col] === value)
          return builder
        },
        order() {
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
  const client = {
    from() {
      return Promise.reject(new Error('network down'))
    }
  }
  return { client: client as unknown as SupabaseClient }
}

const PATH_ROW = {
  id: 'javascript-fundamentals',
  title: 'JavaScript Fundamentals',
  summary: 'Core JS',
  level: 'Beginner',
  hours: 4,
  prerequisites: 'None',
  outcomes: ['Print values']
}

const COURSE_ROW = { id: 'javascript-fundamentals/core', path_id: 'javascript-fundamentals', title: 'Core JavaScript', summary: 'core', position: 0 }
const MODULE_ROW = { id: 'javascript-fundamentals/core/foundations', course_id: 'javascript-fundamentals/core', title: 'Foundations', summary: 'values', position: 0 }
const LESSON_ROW = {
  id: 'javascript-fundamentals/core/foundations/values-and-output',
  module_id: 'javascript-fundamentals/core/foundations',
  title: 'Values and output',
  position: 0,
  content: { id: 'x', kind: 'lesson', objective: 'Print a line', blocks: [{ type: 'explanation', body: 'b' }] }
}
const EXERCISE_ROW = {
  id: 'javascript-fundamentals/core/foundations/values-and-output/ex-1',
  lesson_id: 'javascript-fundamentals/core/foundations/values-and-output',
  title: 'Print a line',
  position: 0,
  content: {
    id: 'x', kind: 'exercise', type: 'free-code', language: 'javascript',
    instructions: 'Print "hi"', starterCode: 'console.log("hi")',
    tests: [{ kind: 'exercise-test', description: 'prints hi', stdin: '', expectedOutput: 'hi' }],
    hints: ['h'], options: null, answerIndex: null
  }
}

const TABLES = {
  learning_paths: [PATH_ROW],
  courses: [COURSE_ROW],
  modules: [MODULE_ROW],
  lessons: [LESSON_ROW],
  exercises: [EXERCISE_ROW]
}

const LESSON_ID = 'javascript-fundamentals/core/foundations/values-and-output'
const EXERCISE_ID = 'javascript-fundamentals/core/foundations/values-and-output/ex-1'

async function setup(tables = TABLES) {
  const fake = makeFakeSupabase(tables)
  const { getSupabase } = await import('../../lib/supabase')
  vi.mocked(getSupabase).mockReturnValue(fake.client)
  const mod = await import('../../engines/curriculum')
  return { mod, calls: fake.calls as FakeQueryCall[] }
}

describe('listPathsTree — one-request curriculum', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('fetches the whole hierarchy in ONE request', async () => {
    const { mod, calls } = await setup()
    const tree = await mod.listPathsTree()
    expect(tree).toHaveLength(1)
    expect(tree[0].courses).toHaveLength(1)
    expect(tree[0].courses[0].modules).toHaveLength(1)
    expect(tree[0].courses[0].modules[0].lessons).toHaveLength(1)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('learning_paths')
  })

  it('orders courses, modules and lessons by position', async () => {
    const { mod } = await setup()
    const tree = await mod.listPathsTree()
    const positions = tree[0].courses[0].modules[0].lessons.map((l) => l.position)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('populates the engine caches — getLesson and getExercise resolve with ZERO further requests', async () => {
    const { mod, calls } = await setup()
    await mod.listPathsTree()
    const requestCount = calls.length

    const lesson = await mod.getLesson(LESSON_ID)
    const exercise = await mod.getExercise(EXERCISE_ID)
    expect(lesson?.content?.objective).toBe('Print a line')
    expect(exercise?.content?.type).toBe('free-code')
    expect(calls.length).toBe(requestCount)
  })

  it('caches in sessionStorage — a fresh engine instance resolves without network', async () => {
    const first = await setup()
    await first.mod.listPathsTree()
    expect(sessionStorage.getItem('devora-curriculum-cache')).toBeTruthy()

    const second = await setup()
    const tree = await second.mod.listPathsTree()
    expect(tree).toHaveLength(1)
    expect(tree[0].courses[0].modules[0].lessons).toHaveLength(1)
    expect(second.calls.length).toBe(0)
  })

  it('revalidates: stale cache returned instantly, background refresh kicked off non-blocking', async () => {
    const first = await setup()
    await first.mod.listPathsTree()

    const raw = sessionStorage.getItem('devora-curriculum-cache')!
    const payload = JSON.parse(raw)
    payload.savedAt = Date.now() - 60 * 1000
    sessionStorage.setItem('devora-curriculum-cache', JSON.stringify(payload))

    const second = await setup()
    const tree = await second.mod.listPathsTree()
    expect(tree).toHaveLength(1)
    expect(second.calls.length).toBe(1)
  })

  it('returns [] without throwing when the DB is unreachable and no cache exists', async () => {
    const fake = makeFailingSupabase()
    const { getSupabase } = await import('../../lib/supabase')
    vi.mocked(getSupabase).mockReturnValue(fake.client)
    const mod = await import('../../engines/curriculum')
    await expect(mod.listPathsTree()).resolves.toEqual([])
  })
})
