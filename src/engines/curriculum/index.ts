import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../../lib/supabase'
import type { Database, Json } from '../../lib/types/db.generated'
import {
  parseExerciseContent,
  parseLessonContent,
  type ExerciseContent,
  type LessonContent
} from './content'

export type {
  ExerciseContent,
  ExerciseTest,
  ExerciseType,
  LessonBlock,
  LessonContent,
  ParseResult
} from './content'

export interface PathSummary {
  id: string
  title: string
  summary: string
  level: string
  hours: number
  prerequisites: string
  outcomes: string[]
}

export interface CourseSummary {
  id: string
  title: string
  summary: string
  position: number
}

export interface ModuleSummary {
  id: string
  title: string
  summary: string
  position: number
}

export interface LessonRef {
  id: string
  title: string
  position: number
}

export interface Lesson extends LessonRef {
  moduleId: string
  content: LessonContent | null
}

export interface Exercise {
  id: string
  title: string
  position: number
  lessonId: string
  content: ExerciseContent | null
}

type DbClient = SupabaseClient<Database>

const cache = new Map<string, unknown>()

const PATH_COLUMNS = 'id, title, summary, level, hours, prerequisites, outcomes'
const LIST_COLUMNS = 'id, title, summary, position'
const LESSON_REF_COLUMNS = 'id, title, position'
const LESSON_COLUMNS = 'id, title, position, module_id, content'
const EXERCISE_COLUMNS = 'id, title, position, lesson_id, content'

function requireClient(): DbClient {
  const client = getSupabase()
  if (!client) throw new Error('supabase client is unavailable')
  return client as unknown as DbClient
}

async function cachedQuery<T>(key: string, fallback: T, run: (client: DbClient) => Promise<T>): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T
  try {
    const value = await run(requireClient())
    cache.set(key, value)
    return value
  } catch {
    return fallback
  }
}

function jsonToStringArray(value: Json): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function mapPath(row: {
  id: string
  title: string
  summary: string | null
  level: string | null
  hours: number | null
  prerequisites: string | null
  outcomes: Json
}): PathSummary {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? '',
    level: row.level ?? '',
    hours: row.hours ?? 0,
    prerequisites: row.prerequisites ?? '',
    outcomes: jsonToStringArray(row.outcomes)
  }
}

function mapSummary(row: { id: string; title: string; summary: string | null; position: number }) {
  return { id: row.id, title: row.title, summary: row.summary ?? '', position: row.position }
}

export async function listPaths(): Promise<PathSummary[]> {
  return cachedQuery('paths', [], async (client) => {
    const { data, error } = await client.from('learning_paths').select(PATH_COLUMNS).order('title')
    if (error) throw error
    return (data ?? []).map(mapPath)
  })
}

export async function getPath(id: string): Promise<PathSummary | null> {
  return cachedQuery(`path:${id}`, null, async (client) => {
    const { data, error } = await client.from('learning_paths').select(PATH_COLUMNS).eq('id', id).maybeSingle()
    if (error) throw error
    return data === null ? null : mapPath(data)
  })
}

export async function listCourses(pathId: string): Promise<CourseSummary[]> {
  return cachedQuery(`courses:${pathId}`, [], async (client) => {
    const { data, error } = await client
      .from('courses')
      .select(LIST_COLUMNS)
      .eq('path_id', pathId)
      .order('position')
    if (error) throw error
    return (data ?? []).map(mapSummary)
  })
}

export async function getCourse(id: string): Promise<CourseSummary | null> {
  return cachedQuery(`course:${id}`, null, async (client) => {
    const { data, error } = await client.from('courses').select(LIST_COLUMNS).eq('id', id).maybeSingle()
    if (error) throw error
    return data === null ? null : mapSummary(data)
  })
}

export async function listModules(courseId: string): Promise<ModuleSummary[]> {
  return cachedQuery(`modules:${courseId}`, [], async (client) => {
    const { data, error } = await client
      .from('modules')
      .select(LIST_COLUMNS)
      .eq('course_id', courseId)
      .order('position')
    if (error) throw error
    return (data ?? []).map(mapSummary)
  })
}

export async function listLessons(moduleId: string): Promise<LessonRef[]> {
  return cachedQuery(`lessons:${moduleId}`, [], async (client) => {
    const { data, error } = await client
      .from('lessons')
      .select(LESSON_REF_COLUMNS)
      .eq('module_id', moduleId)
      .order('position')
    if (error) throw error
    return (data ?? []).map((row) => ({ id: row.id, title: row.title, position: row.position }))
  })
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  return cachedQuery(`lesson:${lessonId}`, null, async (client) => {
    const { data, error } = await client.from('lessons').select(LESSON_COLUMNS).eq('id', lessonId).maybeSingle()
    if (error) throw error
    if (data === null) return null
    const parsed = parseLessonContent(data.content)
    return {
      id: data.id,
      title: data.title,
      position: data.position,
      moduleId: data.module_id,
      content: parsed.ok ? parsed.data : null
    }
  })
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  return cachedQuery(`exercise:${exerciseId}`, null, async (client) => {
    const { data, error } = await client
      .from('exercises')
      .select(EXERCISE_COLUMNS)
      .eq('id', exerciseId)
      .maybeSingle()
    if (error) throw error
    if (data === null) return null
    const parsed = parseExerciseContent(data.content)
    return {
      id: data.id,
      title: data.title,
      position: data.position,
      lessonId: data.lesson_id,
      content: parsed.ok ? parsed.data : null
    }
  })
}
