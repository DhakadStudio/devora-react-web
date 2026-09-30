import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { InteractiveRunner, TerminalLine } from '../engines/execution/interactive'

/**
 * A single unified console: output AND input live in the same window, like a
 * real terminal — there is no separate "stdin box" anywhere. The live prompt
 * line is the LAST line of the output stream itself: while typing it reads
 * "Enter Age: |" (cursor), and after Enter the whole thing collapses into one
 * completed line "Enter Age: 5".
 *
 * Tapping anywhere in the output box is a deliberate "I want to type here"
 * gesture — it focuses the prompt line. Focus is pulled automatically only
 * when the program is genuinely paused waiting for a line (mobile on-screen
 * keyboard discipline).
 */
export function Terminal({ runner, started }: { runner: InteractiveRunner; started: boolean }) {
  const state = useSyncExternalStore(runner.subscribe, runner.getState)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wasAwaiting = useRef(false)

  const inputEnabled = started && !state.running

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [state.lines, state.pendingPrompt])

  useEffect(() => {
    if (state.awaitingInput && !wasAwaiting.current) inputRef.current?.focus()
    wasAwaiting.current = state.awaitingInput
  }, [state.awaitingInput])

  function submitLine() {
    if (!inputEnabled) return
    runner.submitLine(draft)
    setDraft('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitLine()
    }
  }

  function renderLine(line: TerminalLine, i: number) {
    if (line.type === 'stdin') {
      return (
        <div key={i} className="term-line is-stdin">
          {line.prompt ? (
            <span className="term-prompt">{line.prompt}</span>
          ) : (
            <span className="term-caret">❯&nbsp;</span>
          )}
          <span>{line.text.slice((line.prompt ?? '').length)}</span>
        </div>
      )
    }
    return (
      <div key={i} className={`term-line is-${line.type}`}>
        {line.text}
      </div>
    )
  }

  return (
    <div
      className={`term${inputEnabled ? ' term-ready' : ''}`}
      onClick={() => {
        if (inputEnabled) inputRef.current?.focus()
      }}
    >
      <div ref={scrollRef} className="term-scroll">
        {state.lines.length === 0 && !state.pendingPrompt && (
          <div className="term-placeholder">
            <span className="term-caret" aria-hidden="true">
              ❯
            </span>{' '}
            {started
              ? 'Run your code — output appears here, and when the program asks for input, type it right here on the prompt line.'
              : 'Click Run to start the program — output and input both happen right here, exactly like a real terminal.'}
          </div>
        )}
        {state.lines.map(renderLine)}
        {state.running && (
          <div className="term-line is-system term-busy" aria-label="Program running">
            <span className="term-dot" />
            <span className="term-dot" />
            <span className="term-dot" />
          </div>
        )}
        <div
          className={`term-input-line${state.awaitingInput ? ' is-waiting' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (inputEnabled) inputRef.current?.focus()
          }}
        >
          {!state.pendingPrompt && <span className="term-caret">❯</span>}
          {state.pendingPrompt && <span className="term-prompt-inline">{state.pendingPrompt}</span>}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className="term-input"
            placeholder={!started ? '' : state.awaitingInput ? 'type here, press Enter' : 'Program running…'}
            disabled={!inputEnabled}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label={state.awaitingInput ? 'Program input — type the next line' : 'Console input'}
          />
          <span className="term-blink-cursor" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
