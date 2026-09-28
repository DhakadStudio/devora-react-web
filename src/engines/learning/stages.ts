import type { LessonContent, LessonBlock } from '../curriculum/content'

export type LessonStage =
  | { kind: 'objective'; text: string }
  | { kind: 'explanation'; body: string }
  | { kind: 'example'; code: string; caption?: string; language?: string }
  | { kind: 'try-it'; language?: string; description: string; starterCode?: string }
  | { kind: 'question'; prompt: string; options: string[]; answerIndex: number; explanation?: string }
  | { kind: 'debugging'; brokenCode: string; guidance?: string; language?: string }
  | { kind: 'exercise'; exerciseId: string }
  | { kind: 'reflection'; prompt: string }
  | { kind: 'unknown'; blockType: string }

export function lessonStages(content: LessonContent): LessonStage[] {
  const stages: LessonStage[] = [{ kind: 'objective', text: content.objective }]
  for (const block of content.blocks) stages.push(mapBlock(block))
  return stages
}

type KnownBlockType = 'explanation' | 'example' | 'interactive' | 'question' | 'exercise' | 'reflection'

function isKnownType<K extends KnownBlockType>(block: LessonBlock, type: K): block is Extract<LessonBlock, { type: K }> {
  return block.type === type
}

function mapBlock(block: LessonBlock): LessonStage {
  if (isKnownType(block, 'explanation')) return { kind: 'explanation', body: block.body }
  if (isKnownType(block, 'example')) {
    return {
      kind: 'example',
      code: block.code,
      ...(block.caption !== undefined ? { caption: block.caption } : {}),
      ...(block.language !== undefined ? { language: block.language } : {})
    }
  }
  if (isKnownType(block, 'interactive')) {
    return {
      kind: 'try-it',
      description: block.description,
      ...(block.language !== undefined ? { language: block.language } : {}),
      ...(block.starterCode !== undefined ? { starterCode: block.starterCode } : {})
    }
  }
  if (isKnownType(block, 'question')) {
    return {
      kind: 'question',
      prompt: block.prompt,
      options: block.options,
      answerIndex: block.answerIndex,
      ...(block.explanation !== undefined ? { explanation: block.explanation } : {})
    }
  }
  if (isKnownType(block, 'exercise')) return { kind: 'exercise', exerciseId: block.exerciseId }
  if (isKnownType(block, 'reflection')) return { kind: 'reflection', prompt: block.prompt }
  const blockType: string = block.type
  if (blockType === 'debugging') return debuggingStage(block)
  return { kind: 'unknown', blockType }
}

function debuggingStage(block: { [key: string]: unknown; type: string }): LessonStage {
  return {
    kind: 'debugging',
    brokenCode: typeof block.brokenCode === 'string' ? block.brokenCode : '',
    ...(typeof block.guidance === 'string' ? { guidance: block.guidance } : {}),
    ...(typeof block.language === 'string' ? { language: block.language } : {})
  }
}
