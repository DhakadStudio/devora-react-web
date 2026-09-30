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

export interface LessonTreeItem extends LessonRef {
  moduleId: string
  content: LessonContent | null
}

export interface ModuleTree extends ModuleSummary {
  lessons: LessonTreeItem[]
}

export interface CourseTree extends CourseSummary {
  modules: ModuleTree[]
}

export interface PathTree extends PathSummary {
  courses: CourseTree[]
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

const TREE_SELECT = '*, courses(*, modules(*, lessons(*, exercises(*))))'
const TREE_CACHE_KEY = 'devora-curriculum-cache'
const TREE_REVALIDATE_MS = 30 * 1000

interface TreeCachePayload {
  savedAt: number
  tree: PathTree[]
}

function hydrateCaches(tree: PathTree[]): void {
  const paths: PathSummary[] = []
  const coursesByPath = new Map<string, CourseSummary[]>()
  const modulesByCourse = new Map<string, ModuleSummary[]>()
  const lessonsByModule = new Map<string, LessonRef[]>()

  for (const path of tree) {
    const courseSummaries: CourseSummary[] = []
    paths.push({
      id: path.id,
      title: path.title,
      summary: path.summary,
      level: path.level,
      hours: path.hours,
      prerequisites: path.prerequisites,
      outcomes: path.outcomes
    })
    cache.set(`path:${path.id}`, paths[paths.length - 1])

    for (const course of [...path.courses].sort((a, b) => a.position - b.position)) {
      courseSummaries.push({ id: course.id, title: course.title, summary: course.summary, position: course.position })
      cache.set(`course:${course.id}`, courseSummaries[courseSummaries.length - 1])

      const moduleSummaries: ModuleSummary[] = []
      for (const moduleRow of [...course.modules].sort((a, b) => a.position - b.position)) {
        moduleSummaries.push({ id: moduleRow.id, title: moduleRow.title, summary: moduleRow.summary, position: moduleRow.position })
        cache.set(`module:${moduleRow.id}`, moduleSummaries[moduleSummaries.length - 1])

        const lessonRefs: LessonRef[] = []
        for (const lesson of [...moduleRow.lessons].sort((a, b) => a.position - b.position)) {
          lessonRefs.push({ id: lesson.id, title: lesson.title, position: lesson.position })
          cache.set(`lesson:${lesson.id}`, {
            id: lesson.id,
            title: lesson.title,
            position: lesson.position,
            moduleId: lesson.moduleId,
            content: lesson.content
          })
        }
        lessonsByModule.set(moduleRow.id, lessonRefs)
      }
      modulesByCourse.set(course.id, moduleSummaries)
    }
    coursesByPath.set(path.id, courseSummaries)
  }

  for (const [pathId, courses] of coursesByPath) cache.set(`courses:${pathId}`, courses)
  for (const [courseId, modules] of modulesByCourse) cache.set(`modules:${courseId}`, modules)
  for (const [moduleId, lessons] of lessonsByModule) cache.set(`lessons:${moduleId}`, lessons)
}

function hydrateExerciseCache(row: {
  id: string
  title: string
  position: number
  lesson_id: string
  content: Json
}): void {
  const parsed = parseExerciseContent(row.content)
  cache.set(`exercise:${row.id}`, {
    id: row.id,
    title: row.title,
    position: row.position,
    lessonId: row.lesson_id,
    content: parsed.ok ? parsed.data : null
  })
}

function mapTreeRows(data: {
  id: string
  title: string
  summary: string | null
  level: string | null
  hours: number | null
  prerequisites: string | null
  outcomes: Json
  courses?: {
    id: string
    title: string
    summary: string | null
    position: number
    modules?: {
      id: string
      title: string
      summary: string | null
      position: number
      lessons?: {
        id: string
        title: string
        position: number
        module_id: string
        content: Json
        exercises?: {
          id: string
          title: string
          position: number
          lesson_id: string
          content: Json
        }[]
      }[]
    }[]
  }[]
}[]): PathTree[] {
  return (data ?? []).map((pathRow) => ({
    ...mapPath(pathRow),
    courses: (pathRow.courses ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((courseRow) => ({
        ...mapSummary(courseRow),
        modules: (courseRow.modules ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((moduleRow) => ({
            ...mapSummary(moduleRow),
            lessons: (moduleRow.lessons ?? [])
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((lessonRow) => {
                for (const exerciseRow of lessonRow.exercises ?? []) hydrateExerciseCache(exerciseRow)
                const parsed = parseLessonContent(lessonRow.content)
                return {
                  id: lessonRow.id,
                  title: lessonRow.title,
                  position: lessonRow.position,
                  moduleId: lessonRow.module_id,
                  content: parsed.ok ? parsed.data : null
                }
              })
          }))
      }))
  }))
}

async function fetchTree(): Promise<PathTree[]> {
  const client = requireClient()
  const { data, error } = await client.from('learning_paths').select(TREE_SELECT).order('title')
  if (error) throw error
  const tree = mapTreeRows(data ?? [])
  hydrateCaches(tree)
  return tree
}

function readTreeCache(): PathTree[] | null {
  try {
    const raw = sessionStorage.getItem(TREE_CACHE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as TreeCachePayload
    if (!payload?.tree || !Array.isArray(payload.tree)) return null
    return payload.tree
  } catch {
    return null
  }
}

function writeTreeCache(tree: PathTree[]): void {
  try {
    const payload: TreeCachePayload = { savedAt: Date.now(), tree }
    sessionStorage.setItem(TREE_CACHE_KEY, JSON.stringify(payload))
  } catch {}
}

let revalidating = false

function revalidateTree(): void {
  if (revalidating) return
  revalidating = true
  fetchTree()
    .then((fresh) => {
      writeTreeCache(fresh)
      revalidating = false
    })
    .catch(() => {
      revalidating = false
    })
}

export async function listPathsTree(): Promise<PathTree[]> {
  const cached = readTreeCache()
  if (cached) {
    hydrateCaches(cached)
    try {
      const payload = JSON.parse(sessionStorage.getItem(TREE_CACHE_KEY)!) as TreeCachePayload
      if (Date.now() - payload.savedAt > TREE_REVALIDATE_MS) revalidateTree()
    } catch {}
    return cached
  }
  try {
    const tree = await fetchTree()
    writeTreeCache(tree)
    return tree
  } catch {
    return []
  }
}

