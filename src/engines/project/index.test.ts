import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GuidedProject } from '../../engines/project'

vi.mock('../../lib/supabase', () => ({ getSupabase: vi.fn() }))

type Row = Record<string, unknown>

const PROJECT_COLUMNS = 'id, module_id, title, brief, rubric, guide_level'

interface QueryCall {
  table: string
  select?: string
  eq?: [string, unknown]
  limit?: number
  insert?: Row
}

function makeFakeSupabase(tables: Record<string, Row[]>) {
  const calls: QueryCall[] = []
  const client = {
    from(table: string) {
      const call: QueryCall = { table }
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
        limit(n: number) {
          call.limit = n
          return builder
        },
        maybeSingle() {
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        },
        insert(values: Row) {
          call.insert = values
          return Promise.resolve({ data: null, error: null })
        }
      }
      return builder
    }
  }
  return { client: client as unknown as SupabaseClient, calls }
}

function makeErrorSupabase(options: { selectError?: boolean; insertError?: boolean; throwOnSelect?: boolean }) {
  const calls: QueryCall[] = []
  const dbError = { message: 'database unavailable', code: '54300', details: null, hint: null }
  const client = {
    from(table: string) {
      calls.push({ table })
      const builder: Record<string, unknown> = {
        select() {
          if (options.throwOnSelect) throw new Error('database unavailable')
          return builder
        },
        eq() {
          return builder
        },
        limit() {
          return builder
        },
        maybeSingle() {
          if (options.selectError) return Promise.resolve({ data: null, error: dbError })
          return Promise.resolve({ data: null, error: null })
        },
        insert() {
          if (options.insertError) return Promise.resolve({ data: null, error: dbError })
          return Promise.reject(new Error('database unavailable'))
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
  const engine = await import('../../engines/project')
  return { engine, calls }
}

async function setupError(options: { selectError?: boolean; insertError?: boolean; throwOnSelect?: boolean }) {
  const { client } = makeErrorSupabase(options)
  const supabase = await import('../../lib/supabase')
  vi.mocked(supabase.getSupabase).mockReturnValue(client)
  const engine = await import('../../engines/project')
  return { engine }
}

const projectRows: Row[] = [
  {
    id: 'project-intro-card',
    module_id: 'module-intro',
    title: 'Intro Card',
    brief: 'Build a card that introduces you.',
    rubric: [
      {
        kind: 'requirement',
        label: 'Card prints a heading with your name in it',
        hint: 'Use console.log with a template string.'
      },
      { kind: 'requirement', label: 'Card shows three skills you are learning' }
    ],
    guide_level: 'guided'
  },
  {
    id: 'project-mixed-rubric',
    module_id: 'module-mixed',
    title: 'Mixed Rubric',
    brief: null,
    rubric: [
      { kind: 'requirement', label: 'Valid requirement', hint: 'Do the thing.' },
      'not an object',
      42,
      null,
      { kind: 'requirement', hint: 'no label here' },
      { label: 7 },
      { label: 'Another valid one' }
    ],
    guide_level: 'partially-guided'
  },
  {
    id: 'project-no-rubric',
    module_id: 'module-norubric',
    title: 'No Rubric',
    brief: null,
    rubric: null,
    guide_level: 'independent'
  },
  {
    id: 'project-bad-rubric',
    module_id: 'module-badrubric',
    title: 'Bad Rubric Shape',
    brief: 'Brief text.',
    rubric: { nope: true },
    guide_level: 'portfolio'
  }
]

describe('project engine', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  describe('getProjectForModule', () => {
    it('returns the project with a parsed rubric, keeping label and optional hint', async () => {
      const { engine, calls } = await setup({ projects: projectRows })
      const project: GuidedProject | null = await engine.getProjectForModule('module-intro')
      expect(project).toEqual({
        id: 'project-intro-card',
        moduleId: 'module-intro',
        title: 'Intro Card',
        brief: 'Build a card that introduces you.',
        guideLevel: 'guided',
        rubric: [
          {
            label: 'Card prints a heading with your name in it',
            hint: 'Use console.log with a template string.'
          },
          { label: 'Card shows three skills you are learning' }
        ]
      })
      expect(calls).toEqual([
        { table: 'projects', select: PROJECT_COLUMNS, eq: ['module_id', 'module-intro'], limit: 1 }
      ])
    })

    it('drops non-conforming rubric entries and ignores unknown keys', async () => {
      const { engine } = await setup({ projects: projectRows })
      const project = await engine.getProjectForModule('module-mixed')
      expect(project).toEqual({
        id: 'project-mixed-rubric',
        moduleId: 'module-mixed',
        title: 'Mixed Rubric',
        brief: null,
        guideLevel: 'partially-guided',
        rubric: [
          { label: 'Valid requirement', hint: 'Do the thing.' },
          { label: 'Another valid one' }
        ]
      })
    })

    it('returns an empty rubric when rubric is null', async () => {
      const { engine } = await setup({ projects: projectRows })
      const project = await engine.getProjectForModule('module-norubric')
      expect(project).toEqual({
        id: 'project-no-rubric',
        moduleId: 'module-norubric',
        title: 'No Rubric',
        brief: null,
        guideLevel: 'independent',
        rubric: []
      })
    })

    it('returns an empty rubric when rubric is not an array', async () => {
      const { engine } = await setup({ projects: projectRows })
      const project = await engine.getProjectForModule('module-badrubric')
      expect(project).toEqual({
        id: 'project-bad-rubric',
        moduleId: 'module-badrubric',
        title: 'Bad Rubric Shape',
        brief: 'Brief text.',
        guideLevel: 'portfolio',
        rubric: []
      })
    })

    it('returns null when no project row exists for the module', async () => {
      const { engine } = await setup({ projects: projectRows })
      await expect(engine.getProjectForModule('module-missing')).resolves.toBeNull()
    })

    it('returns null without throwing when the query returns an error', async () => {
      const { engine } = await setupError({ selectError: true })
      await expect(engine.getProjectForModule('module-intro')).resolves.toBeNull()
    })

    it('returns null without throwing when the database throws', async () => {
      const { engine } = await setupError({ throwOnSelect: true })
      await expect(engine.getProjectForModule('module-intro')).resolves.toBeNull()
    })

    it('returns null when supabase is not configured', async () => {
      const supabase = await import('../../lib/supabase')
      vi.mocked(supabase.getSupabase).mockReturnValue(null)
      const engine = await import('../../engines/project')
      await expect(engine.getProjectForModule('module-intro')).resolves.toBeNull()
    })
  })

  describe('getProject', () => {
    it('returns the project row by id with a parsed rubric, keeping label and optional hint', async () => {
      const { engine, calls } = await setup({ projects: projectRows })
      const project: GuidedProject | null = await engine.getProject('project-intro-card')
      expect(project).toEqual({
        id: 'project-intro-card',
        moduleId: 'module-intro',
        title: 'Intro Card',
        brief: 'Build a card that introduces you.',
        guideLevel: 'guided',
        rubric: [
          {
            label: 'Card prints a heading with your name in it',
            hint: 'Use console.log with a template string.'
          },
          { label: 'Card shows three skills you are learning' }
        ]
      })
      expect(calls).toEqual([
        { table: 'projects', select: PROJECT_COLUMNS, eq: ['id', 'project-intro-card'], limit: 1 }
      ])
    })

    it('drops non-conforming rubric entries when loading by id', async () => {
      const { engine } = await setup({ projects: projectRows })
      const project = await engine.getProject('project-mixed-rubric')
      expect(project).toEqual({
        id: 'project-mixed-rubric',
        moduleId: 'module-mixed',
        title: 'Mixed Rubric',
        brief: null,
        guideLevel: 'partially-guided',
        rubric: [
          { label: 'Valid requirement', hint: 'Do the thing.' },
          { label: 'Another valid one' }
        ]
      })
    })

    it('returns null when no project exists with that id', async () => {
      const { engine } = await setup({ projects: projectRows })
      await expect(engine.getProject('project-missing')).resolves.toBeNull()
    })

    it('returns null without throwing when the query returns an error', async () => {
      const { engine } = await setupError({ selectError: true })
      await expect(engine.getProject('project-intro-card')).resolves.toBeNull()
    })

    it('returns null without throwing when the database throws', async () => {
      const { engine } = await setupError({ throwOnSelect: true })
      await expect(engine.getProject('project-intro-card')).resolves.toBeNull()
    })

    it('returns null when supabase is not configured', async () => {
      const supabase = await import('../../lib/supabase')
      vi.mocked(supabase.getSupabase).mockReturnValue(null)
      const engine = await import('../../engines/project')
      await expect(engine.getProject('project-intro-card')).resolves.toBeNull()
    })
  })

  describe('submitProject', () => {
    it('inserts a submission with status submitted and returns ok true', async () => {
      const { engine, calls } = await setup({ projects: projectRows })
      const result = await engine.submitProject('user-1', 'project-intro-card', 'console.log("Hi, Ada")')
      expect(result).toEqual({ ok: true })
      expect(calls).toEqual([
        {
          table: 'project_submissions',
          insert: {
            user_id: 'user-1',
            project_id: 'project-intro-card',
            status: 'submitted',
            submitted_artifact: 'console.log("Hi, Ada")'
          }
        }
      ])
    })

    it('returns ok false with an error message when the insert fails', async () => {
      const { engine } = await setupError({ insertError: true })
      const result = await engine.submitProject('user-1', 'project-intro-card', 'artifact')
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.error?.length ?? 0).toBeGreaterThan(0)
    })

    it('returns ok false without throwing when the insert throws', async () => {
      const { engine } = await setupError({})
      const result = await engine.submitProject('user-1', 'project-intro-card', 'artifact')
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
    })

    it('returns ok false when supabase is not configured', async () => {
      const supabase = await import('../../lib/supabase')
      vi.mocked(supabase.getSupabase).mockReturnValue(null)
      const engine = await import('../../engines/project')
      const result = await engine.submitProject('user-1', 'project-intro-card', 'artifact')
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
    })
  })
})
