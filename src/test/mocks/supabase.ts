import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/types/db.generated'

type LessonProgressInsert = Database['public']['Tables']['lesson_progress']['Insert']
type ExerciseAttemptInsert = Database['public']['Tables']['exercise_attempts']['Insert']

/** Row shapes mirror the live DB (snake_case columns; JSONB content as raw
 *  objects) so the real curriculum engine's parser consumes them unchanged. */
export type MockRow = Record<string, unknown>

export interface MockSupabaseUser {
  id: string
  aud: string
  email?: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  created_at: string
}

export interface MockSupabaseSession {
  user: MockSupabaseUser
  access_token: string
  token_type: string
  expires_in: number
}

export interface MockSupabaseTables {
  learning_paths?: MockRow[]
  courses?: MockRow[]
  modules?: MockRow[]
  lessons?: MockRow[]
  exercises?: MockRow[]
  lesson_progress?: MockRow[]
  exercise_attempts?: MockRow[]
}

export interface MockSupabaseConfig extends MockSupabaseTables {
  /** What auth.getSession answers — null for a guest, a session for a
   *  signed-in user (drives the real AuthProvider in tests). */
  session?: MockSupabaseSession | null
}

export interface MockSupabaseCaptures {
  upserts: { table: string; row: MockRow; options: unknown }[]
  inserts: { table: string; row: MockRow }[]
  lessonProgressUpserts: LessonProgressInsert[]
  exerciseAttemptInserts: ExerciseAttemptInsert[]
}

export interface MockSupabase {
  client: SupabaseClient
  captures: MockSupabaseCaptures
}

export interface MockQueryResult {
  data: unknown
  error: { code?: string; message: string; details?: unknown; hint?: unknown } | null
}

export interface MockQueryBuilder extends PromiseLike<MockQueryResult> {
  select: (columns?: string) => MockQueryBuilder
  eq: (column: string, value: unknown) => MockQueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder
  single: () => Promise<MockQueryResult>
  maybeSingle: () => Promise<MockQueryResult>
  upsert: (row: MockRow, options?: unknown) => Promise<MockQueryResult>
  insert: (row: MockRow) => Promise<MockQueryResult>
  then: <TResult1 = MockQueryResult, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => PromiseLike<TResult1 | TResult2>
}

function filteredRows(
  state: { table: string; filters: { column: string; value: unknown }[]; orderColumn: string | null },
  tables: MockSupabaseTables
): MockRow[] {
  let rows = (tables[state.table as keyof MockSupabaseTables] ?? []).map((row) => ({ ...row }))
  for (const { column, value } of state.filters) {
    rows = rows.filter((row) => row[column] === value)
  }
  if (state.orderColumn !== null) {
    const column = state.orderColumn
    rows.sort((a, b) => Number(a[column]) - Number(b[column]))
  }
  return rows
}

function queryBuilder(
  state: { table: string; filters: { column: string; value: unknown }[]; orderColumn: string | null },
  tables: MockSupabaseTables,
  captures: MockSupabaseCaptures
): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select() {
      return builder
    },
    eq(column: string, value: unknown) {
      state.filters.push({ column, value })
      return builder
    },
    order(column: string) {
      state.orderColumn = column
      return builder
    },
    async single() {
      const rows = filteredRows(state, tables)
      return rows.length > 0
        ? { data: rows[0], error: null }
        : { data: null, error: { code: 'PGRST116', message: 'no rows returned', details: null, hint: null } }
    },
    async maybeSingle() {
      const rows = filteredRows(state, tables)
      return { data: rows[0] ?? null, error: null }
    },
    async upsert(row: MockRow, options?: unknown) {
      captures.upserts.push({ table: state.table, row, options })
      const rows = Array.isArray(row) ? row : [row]
      if (state.table === 'lesson_progress') {
        captures.lessonProgressUpserts.push(...(rows as LessonProgressInsert[]))
      }
      return { data: null, error: null }
    },
    async insert(row: MockRow) {
      captures.inserts.push({ table: state.table, row })
      const rows = Array.isArray(row) ? row : [row]
      if (state.table === 'exercise_attempts') {
        captures.exerciseAttemptInserts.push(...(rows as ExerciseAttemptInsert[]))
      }
      return { data: null, error: null }
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: filteredRows(state, tables), error: null }).then(onFulfilled, onRejected)
    }
  }
  return builder
}

function authNamespace(session: MockSupabaseSession | null) {
  return {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: session?.user ?? null }, error: null }),
    onAuthStateChange: (_callback: (event: string, session: unknown) => void) => ({
      data: { subscription: { unsubscribe: () => {} } }
    }),
    signOut: async () => ({ error: null })
  }
}

export function createMockSupabase(config: MockSupabaseConfig = {}): MockSupabase {  const tables: MockSupabaseTables = {
    learning_paths: config.learning_paths ?? [],
    courses: config.courses ?? [],
    modules: config.modules ?? [],
    lessons: config.lessons ?? [],
    exercises: config.exercises ?? [],
    lesson_progress: config.lesson_progress ?? [],
    exercise_attempts: config.exercise_attempts ?? []
  }
  const captures: MockSupabaseCaptures = {
    upserts: [],
    inserts: [],
    lessonProgressUpserts: [],
    exerciseAttemptInserts: []
  }
  const client = {
    from: (table: string) =>
      queryBuilder({ table, filters: [], orderColumn: null }, tables, captures),
    auth: authNamespace(config.session ?? null)
  } as unknown as SupabaseClient
  return { client, captures }
}

let current: MockSupabase | null = null

export function fakeUser(id: string): MockSupabaseUser {
  return {
    id,
    aud: 'authenticated',
    email: `${id}@example.com`,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString()
  }
}


export function installMockSupabase(config: MockSupabaseConfig = {}): MockSupabase {
  current = createMockSupabase(config)
  return current
}

export function mockGetSupabase(): SupabaseClient | null {
  return current?.client ?? null
}

export function getMockSupabase(): MockSupabase | null {
  return current
}
