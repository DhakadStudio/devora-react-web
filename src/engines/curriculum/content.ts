import type { Json } from '../../lib/types/db.generated'

/**
 * Content-shape contracts for lesson/exercise JSONB stored in Postgres, and
 * the only boundary between raw database JSON and those types.
 *
 * `parseLessonContent`/`parseExerciseContent` NEVER throw. Malformed content
 * (null, non-object, missing objective, non-array blocks, unknown exercise
 * type, ...) is reported as a typed `{ ok: false, reason }` result so
 * consumers degrade gracefully instead of crashing.
 *
 * Unknown lesson block types are kept as data, never thrown: a block whose
 * `type` is not part of the `LessonBlock` union (the live database already
 * ships a `debugging` block type outside it) passes through verbatim as an
 * `UnknownBlock`, so newer content never crashes older consumers. A
 * known-type block whose required fields are invalid (e.g. a question
 * without options) is demoted the same way with its `type` blanked to `''`,
 * which keeps the discriminated-union contract above holding — every element
 * of `blocks` is either a fully valid known variant or an `UnknownBlock`.
 * Consumers that care can inspect `UnknownBlock`s via their index signature.
 */

export type UnknownBlockType = string & { readonly __unknownBlockType: 'unknown' }

export interface UnknownBlock {
  type: UnknownBlockType
  [key: string]: Json | undefined
}

export type LessonBlock =
  | { type: 'explanation'; body: string }
  | { type: 'example'; code: string; caption?: string; language?: string }
  | { type: 'interactive'; language?: string; description: string; starterCode?: string }
  | { type: 'question'; prompt: string; options: string[]; answerIndex: number; explanation?: string }
  | { type: 'exercise'; exerciseId: string }
  | { type: 'reflection'; prompt: string }
  | UnknownBlock

export type LessonContent = {
  id: string
  kind: string
  objective: string
  blocks: LessonBlock[]
}

export type ExerciseType = 'free-code' | 'debug-fix' | 'predict-output' | 'multiple-choice'

export interface ExerciseTest {
  kind: 'exercise-test'
  description: string
  stdin: string
  expectedOutput: string
}

export type ExerciseContent = {
  id: string
  kind: string
  type: ExerciseType
  language: string | null
  instructions: string
  starterCode: string | null
  tests: ExerciseTest[]
  hints: string[] | null
  options: string[] | null
  answerIndex: number | null
  expectedBehavior?: string
  referenceSolution?: string
  completionCriteria?: string
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; reason: string }

type Rec = { [key: string]: Json | undefined }

export function parseLessonContent(json: Json | null): ParseResult<LessonContent> {
  if (!isRecord(json)) return { ok: false, reason: 'content is missing or not an object' }
  if (typeof json.id !== 'string') return { ok: false, reason: 'content.id must be a string' }
  if (typeof json.kind !== 'string') return { ok: false, reason: 'content.kind must be a string' }
  if (typeof json.objective !== 'string' || json.objective.length === 0) {
    return { ok: false, reason: 'content.objective is missing or empty' }
  }
  if (!Array.isArray(json.blocks)) return { ok: false, reason: 'content.blocks must be an array' }
  return {
    ok: true,
    data: {
      id: json.id,
      kind: json.kind,
      objective: json.objective,
      blocks: json.blocks.map(parseBlock)
    }
  }
}

export function parseExerciseContent(json: Json | null): ParseResult<ExerciseContent> {
  if (!isRecord(json)) return { ok: false, reason: 'content is missing or not an object' }
  if (typeof json.id !== 'string') return { ok: false, reason: 'content.id must be a string' }
  if (typeof json.kind !== 'string') return { ok: false, reason: 'content.kind must be a string' }
  if (!isExerciseType(json.type)) {
    return { ok: false, reason: 'content.type is not a known exercise type' }
  }
  if (typeof json.instructions !== 'string' || json.instructions.length === 0) {
    return { ok: false, reason: 'content.instructions is missing or empty' }
  }
  const tests: ExerciseTest[] = []
  if (json.tests !== undefined && json.tests !== null) {
    if (!Array.isArray(json.tests)) return { ok: false, reason: 'content.tests must be an array' }
    for (const raw of json.tests) {
      const test = parseExerciseTest(raw)
      if (test !== null) tests.push(test)
    }
  }
  const content: ExerciseContent = {
    id: json.id,
    kind: json.kind,
    type: json.type,
    language: typeof json.language === 'string' ? json.language : null,
    instructions: json.instructions,
    starterCode: typeof json.starterCode === 'string' ? json.starterCode : null,
    tests,
    hints: jsonStringArrayOrNull(json.hints),
    options: jsonStringArrayOrNull(json.options),
    answerIndex: typeof json.answerIndex === 'number' ? json.answerIndex : null
  }
  if (typeof json.expectedBehavior === 'string') content.expectedBehavior = json.expectedBehavior
  if (typeof json.referenceSolution === 'string') content.referenceSolution = json.referenceSolution
  if (typeof json.completionCriteria === 'string') content.completionCriteria = json.completionCriteria
  return { ok: true, data: content }
}

function parseBlock(raw: Json): LessonBlock {
  if (!isRecord(raw)) return unknownBlock(raw, '')
  const type = raw.type
  if (typeof type !== 'string') return unknownBlock(raw, '')
  switch (type) {
    case 'explanation':
      return typeof raw.body === 'string'
        ? { type: 'explanation', body: raw.body }
        : unknownBlock(raw, '')
    case 'example':
      return typeof raw.code === 'string'
        ? { type: 'example', code: raw.code, ...opt(raw, 'caption'), ...opt(raw, 'language') }
        : unknownBlock(raw, '')
    case 'interactive':
      return typeof raw.description === 'string'
        ? {
            type: 'interactive',
            description: raw.description,
            ...opt(raw, 'language'),
            ...opt(raw, 'starterCode')
          }
        : unknownBlock(raw, '')
    case 'question':
      if (
        typeof raw.prompt !== 'string' ||
        !isStringArray(raw.options) ||
        typeof raw.answerIndex !== 'number'
      ) {
        return unknownBlock(raw, '')
      }
      return {
        type: 'question',
        prompt: raw.prompt,
        options: raw.options,
        answerIndex: raw.answerIndex,
        ...opt(raw, 'explanation')
      }
    case 'exercise':
      return typeof raw.exerciseId === 'string'
        ? { type: 'exercise', exerciseId: raw.exerciseId }
        : unknownBlock(raw, '')
    case 'reflection':
      return typeof raw.prompt === 'string'
        ? { type: 'reflection', prompt: raw.prompt }
        : unknownBlock(raw, '')
    default:
      return unknownBlock(raw, type)
  }
}

function parseExerciseTest(raw: Json): ExerciseTest | null {
  if (!isRecord(raw)) return null
  if (raw.kind !== 'exercise-test') return null
  if (typeof raw.description !== 'string') return null
  if (typeof raw.expectedOutput !== 'string') return null
  return {
    kind: 'exercise-test',
    description: raw.description,
    stdin: typeof raw.stdin === 'string' ? raw.stdin : '',
    expectedOutput: raw.expectedOutput
  }
}

function unknownBlock(raw: Json, type: string): LessonBlock {
  const branded = type as UnknownBlockType
  if (isRecord(raw)) {
    return { ...raw, type: branded }
  }
  return { type: branded }
}

function opt<K extends string>(rec: Rec, key: K): { [P in K]?: string } {
  const value = rec[key]
  return (typeof value === 'string' ? { [key]: value } : {}) as { [P in K]?: string }
}

function isRecord(value: Json | null): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: Json | undefined): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isExerciseType(value: Json | undefined): value is ExerciseType {
  return (
    value === 'free-code' || value === 'debug-fix' || value === 'predict-output' || value === 'multiple-choice'
  )
}

function jsonStringArrayOrNull(value: Json | undefined): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === 'string')
}
