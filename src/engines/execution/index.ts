import type { ExecLimits, ExecRequest, ExecResult, ExecutionProvider } from './types'
import { browserJsProvider } from './browser-js'
import { judge0Provider } from './judge0'

export type { ExecLimits, ExecRequest, ExecResult, ExecStatus, ExecutionProvider } from './types'
export {
  createInteractiveRunner,
  type InteractiveRunner,
  type InteractiveState,
  type TerminalLine,
  type TerminalLineType
} from './interactive'

export const DEFAULT_LIMITS: ExecLimits = { timeoutMs: 10_000, maxOutputBytes: 256_000 }

const providers: readonly ExecutionProvider[] = [browserJsProvider, judge0Provider]

/** Language → provider lookup. Providers declare the languages they handle,
 *  so extending judge0's language map routes new non-JS languages here
 *  automatically. javascript → browser-js; everything else declared → judge0;
 *  undeclared languages → null (runCode answers with a no-provider error). */
export function getProvider(language: string): ExecutionProvider | null {
  const key = language.trim().toLowerCase()
  if (key === '') return null
  return providers.find((provider) => provider.languages.some((name) => name.toLowerCase() === key)) ?? null
}

function noProviderResult(language: string): ExecResult {
  return {
    status: 'no-provider',
    stdout: '',
    stderr: '',
    error: {
      message: `"${language}" is not available yet.`,
      expected: 'one of the supported languages',
      nextStep: 'Pick a supported language from the language list.'
    }
  }
}

function truncateToBytes(text: string, maxBytes: number): string {
  if (maxBytes <= 0) return ''
  if (text === '') return text
  const bytes = new TextEncoder().encode(text)
  if (bytes.length <= maxBytes) return text
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, maxBytes))
}

export async function runCode(req: ExecRequest): Promise<ExecResult> {
  const provider = getProvider(req.language)
  if (!provider) return noProviderResult(req.language)
  const limits: ExecLimits = { ...DEFAULT_LIMITS, ...(req.limits ?? {}) }
  const result = await provider.run({ ...req, limits })
  return {
    ...result,
    stdout: truncateToBytes(result.stdout, limits.maxOutputBytes),
    stderr: truncateToBytes(result.stderr, limits.maxOutputBytes)
  }
}
