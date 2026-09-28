import { describe, it, expect } from 'vitest'
import { parseLessonContent } from '../curriculum/content'
import { lessonStages } from './stages'

type Rec = Record<string, unknown>

function contentFrom(raw: Rec) {
  const parsed = parseLessonContent(raw as never)
  if (!parsed.ok) throw new Error(`fixture rejected: ${parsed.reason}`)
  return parsed.data
}

const FULL_LESSON_RAW: Rec = {
  id: 'lesson-1',
  kind: 'lesson',
  objective: 'Print output with console.log',
  blocks: [
    { type: 'explanation', body: 'console.log writes a line to the output pane.' },
    {
      type: 'example',
      code: 'console.log("Hello, Devora!")',
      caption: 'A first program',
      language: 'javascript'
    },
    {
      type: 'interactive',
      description: 'Change the greeting and run it.',
      language: 'javascript',
      starterCode: 'console.log("Hi!")'
    },
    {
      type: 'question',
      prompt: 'What does console.log("Hi") print?',
      options: ['Hi', '"Hi"', 'nothing'],
      answerIndex: 0,
      explanation: 'console.log prints the value without quotes.'
    },
    {
      type: 'debugging',
      brokenCode: 'consle.log("Hi")',
      guidance: 'Check the spelling of console.',
      language: 'javascript'
    },
    { type: 'exercise', exerciseId: 'ex-print-greeting' },
    { type: 'reflection', prompt: 'Where else could you use console.log?' }
  ]
}

describe('lessonStages — full ordering', () => {
  it('objective stage comes first with the lesson objective text', () => {
    const stages = lessonStages(contentFrom(FULL_LESSON_RAW))
    expect(stages[0]).toEqual({ kind: 'objective', text: 'Print output with console.log' })
  })

  it('maps every known block in order to its stage kind with fields', () => {
    const stages = lessonStages(contentFrom(FULL_LESSON_RAW))
    expect(stages).toHaveLength(8)
    expect(stages[1]).toEqual({ kind: 'explanation', body: 'console.log writes a line to the output pane.' })
    expect(stages[2]).toEqual({
      kind: 'example',
      code: 'console.log("Hello, Devora!")',
      caption: 'A first program',
      language: 'javascript'
    })
    expect(stages[3]).toEqual({
      kind: 'try-it',
      description: 'Change the greeting and run it.',
      language: 'javascript',
      starterCode: 'console.log("Hi!")'
    })
    expect(stages[4]).toEqual({
      kind: 'question',
      prompt: 'What does console.log("Hi") print?',
      options: ['Hi', '"Hi"', 'nothing'],
      answerIndex: 0,
      explanation: 'console.log prints the value without quotes.'
    })
    expect(stages[5]).toEqual({
      kind: 'debugging',
      brokenCode: 'consle.log("Hi")',
      guidance: 'Check the spelling of console.',
      language: 'javascript'
    })
    expect(stages[6]).toEqual({ kind: 'exercise', exerciseId: 'ex-print-greeting' })
    expect(stages[7]).toEqual({ kind: 'reflection', prompt: 'Where else could you use console.log?' })
  })

  it('omits optional fields that are absent', () => {
    const stages = lessonStages(
      contentFrom({
        id: 'lesson-2',
        kind: 'lesson',
        objective: 'Minimal lesson',
        blocks: [
          { type: 'example', code: '1 + 1' },
          { type: 'interactive', description: 'Try adding numbers.' },
          { type: 'question', prompt: 'What is 1 + 1?', options: ['2'], answerIndex: 0 },
          { type: 'debugging', brokenCode: 'consle.log(1)' }
        ]
      })
    )
    expect(stages[1]).toEqual({ kind: 'example', code: '1 + 1' })
    expect(stages[2]).toEqual({ kind: 'try-it', description: 'Try adding numbers.' })
    expect(stages[3]).toEqual({ kind: 'question', prompt: 'What is 1 + 1?', options: ['2'], answerIndex: 0 })
    expect(stages[4]).toEqual({ kind: 'debugging', brokenCode: 'consle.log(1)' })
  })

  it('objective-only lesson → just the objective stage', () => {
    const stages = lessonStages(
      contentFrom({ id: 'lesson-3', kind: 'lesson', objective: 'Only objective', blocks: [] })
    )
    expect(stages).toEqual([{ kind: 'objective', text: 'Only objective' }])
  })
})

describe('lessonStages — unknown blocks never throw', () => {
  it('an unknown block type maps to an unknown stage carrying its type', () => {
    const stages = lessonStages(
      contentFrom({
        id: 'lesson-4',
        kind: 'lesson',
        objective: 'Newer content',
        blocks: [{ type: 'video', url: 'https://example.com/v' }]
      })
    )
    expect(stages).toEqual([
      { kind: 'objective', text: 'Newer content' },
      { kind: 'unknown', blockType: 'video' }
    ])
  })

  it('a debugging block (live DB type outside the union) maps to a debugging stage', () => {
    const stages = lessonStages(
      contentFrom({
        id: 'lesson-5',
        kind: 'lesson',
        objective: 'Fix the bug',
        blocks: [{ type: 'debugging', brokenCode: 'consle.log("x")', guidance: 'Spelling.', language: 'python' }]
      })
    )
    expect(stages[1]).toEqual({
      kind: 'debugging',
      brokenCode: 'consle.log("x")',
      guidance: 'Spelling.',
      language: 'python'
    })
  })

  it('an invalid known-type block (demoted by the parser) maps to unknown, never throws', () => {
    const stages = lessonStages(
      contentFrom({
        id: 'lesson-6',
        kind: 'lesson',
        objective: 'Broken question',
        blocks: [{ type: 'question', prompt: 'No options here' }]
      })
    )
    expect(stages).toEqual([
      { kind: 'objective', text: 'Broken question' },
      { kind: 'unknown', blockType: '' }
    ])
  })

  it('mixed known + unknown blocks keep order and never throw', () => {
    const stages = lessonStages(
      contentFrom({
        id: 'lesson-7',
        kind: 'lesson',
        objective: 'Mixed',
        blocks: [
          { type: 'quiz-show', rounds: 3 },
          { type: 'explanation', body: 'still works' },
          { type: 'poll', question: 'Ready?' }
        ]
      })
    )
    expect(stages).toEqual([
      { kind: 'objective', text: 'Mixed' },
      { kind: 'unknown', blockType: 'quiz-show' },
      { kind: 'explanation', body: 'still works' },
      { kind: 'unknown', blockType: 'poll' }
    ])
  })
})
