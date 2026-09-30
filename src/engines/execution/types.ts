// src/engines/execution/types.ts
export interface ExecLimits { timeoutMs: number; maxOutputBytes: number }

export interface ExecRequest {
  language: string            // 'javascript' | 'python' | future non-JS languages
  code: string
  stdin?: string
  limits?: Partial<ExecLimits>
  /** Optional provider pin — e.g. the workbench runs JavaScript on Node via
   *  judge0 while lesson exercises keep the in-browser sandbox. Unset = the
   *  registry's default routing for the language. */
  provider?: string
}

export type ExecStatus = 'ok' | 'runtime-error' | 'timeout' | 'compile-error' | 'no-provider'

export interface ExecResult {
  status: ExecStatus
  stdout: string              // captured program output (console.log lines joined with \n for browser provider)
  stderr: string
  /** Educational error — NEVER a bare error. Present when status != 'ok'. */
  error?: { message: string; expected: string; nextStep: string }
}

export interface ExecutionProvider {
  id: string
  languages: string[]
  run(req: ExecRequest): Promise<ExecResult>
}
