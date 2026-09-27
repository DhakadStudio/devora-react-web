export interface ConsoleEntry {
  type: 'log' | 'error' | 'warn'
  text: string
}

export interface TestCaseResult {
  name: string
  passed: boolean
  detail?: string
}

export interface RunResult {
  logs: ConsoleEntry[]
  tests: TestCaseResult[]
  error?: { message: string; hint: string }
  exitCode: 0 | 1
}

interface TestSpec {
  name: string
  /** JS source evaluated in the sandbox; must return truthy when passing. Throw → failure. */
  fnSource: string
}

const IFRAME_STYLE =
  'position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden;'

let frame: HTMLIFrameElement | null = null
let frameReady: Promise<void> | null = null

function sandbox(): Promise<{ frame: HTMLIFrameElement }> {
  if (frame && frameReady) return frameReady.then(() => ({ frame: frame! }))
  frame = document.createElement('iframe')
  frame.setAttribute('sandbox', 'allow-scripts')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = IFRAME_STYLE
  frameReady = new Promise((resolve) => {
    const doc = frame!.contentDocument
    doc!.open()
    doc!.write('<!DOCTYPE html><html><body></body></html>')
    doc!.close()
    document.body.appendChild(frame!)
    resolve()
  })
  return frameReady.then(() => ({ frame: frame! }))
}

function formatArg(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export async function runJavaScript(
  code: string,
  tests: TestSpec[] = []
): Promise<RunResult> {
  const { frame: f } = await sandbox()
  const win = f.contentWindow as unknown as {
    Function: new (...args: string[]) => (...a: unknown[]) => unknown
  }
  const logs: ConsoleEntry[] = []
  const testsOut: TestCaseResult[] = []

  const consoleProxy = {
    log: (...a: unknown[]) => logs.push({ type: 'log', text: a.map(formatArg).join(' ') }),
    info: (...a: unknown[]) => logs.push({ type: 'log', text: a.map(formatArg).join(' ') }),
    warn: (...a: unknown[]) => logs.push({ type: 'warn', text: a.map(formatArg).join(' ') }),
    error: (...a: unknown[]) => logs.push({ type: 'error', text: a.map(formatArg).join(' ') })
  }

  let error: RunResult['error']
  let exitCode: 0 | 1 = 0

  try {
    const fn = new win.Function('console', `'use strict';\n${code}`)
    fn(consoleProxy)
  } catch (e) {
    exitCode = 1
    const message = e instanceof Error ? e.message : String(e)
    error = {
      message,
      hint: syntaxHint(message)
    }
    for (const t of tests) testsOut.push({ name: t.name, passed: false, detail: 'Not run — the program stopped first.' })
    return { logs, tests: testsOut, error, exitCode }
  }

  for (const t of tests) {
    try {
      const out: string[] = []
      const captureProxy = {
        log: (...a: unknown[]) => {
          out.push(a.map(formatArg).join(' '))
          logs.push({ type: 'log', text: a.map(formatArg).join(' ') })
        },
        info: (...a: unknown[]) => captureProxy.log(...a),
        warn: (...a: unknown[]) => captureProxy.log(...a),
        error: (...a: unknown[]) => captureProxy.log(...a)
      }
      const testFn = new win.Function(
        'console',
        `'use strict';\n${code}\nreturn (${t.fnSource})(out);`
      )
      const ok = Boolean(testFn(captureProxy))
      testsOut.push({ name: t.name, passed: ok, detail: ok ? undefined : 'Output did not match the requirement.' })
    } catch (e) {
      exitCode = 1
      testsOut.push({
        name: t.name,
        passed: false,
        detail: e instanceof Error ? e.message : String(e)
      })
    }
  }

  if (testsOut.some((t) => !t.passed)) exitCode = 1
  return { logs, tests: testsOut, error, exitCode }
}

function syntaxHint(message: string): string {
  if (/unexpected token|illegal token|unexpected identifier/i.test(message))
    return 'That usually means a typo in one line — check brackets, quotes and semicolons around the error.'
  if (/is not defined/i.test(message))
    return 'A name was used that was never created. Check spelling, or declare the variable/function before using it.'
  if (/is not a function/i.test(message))
    return 'You called something that is not a function. Check the name and that parentheses follow the right value.'
  return 'Read the message from left to right; it names the first thing JavaScript could not understand.'
}

/** Web preview for HTML/CSS/JS playground files: builds a srcdoc that
 *  injects the CSS, runs the JS, and pipes console output + runtime
 *  errors back to the parent window via postMessage. Callers filter
 *  messages by `source === iframe.contentWindow` and `data.kind`. */
export function htmlSrcdoc(html: string, css: string, js: string): string {
  const cssRule = `<style>body{font-family:system-ui,sans-serif;margin:16px;color:#1a1b1e;background:#fff;}${css}</style>`
  const bridge = `<scr${'ipt'}>(function(){
  function fmt(v){ if(typeof v==='string')return v; try{return JSON.stringify(v)}catch(e){return String(v)} }
  function send(type,args){ parent.postMessage({kind:'devora-console',type:type,text:Array.prototype.map.call(args,fmt).join(' ')},'*') }
  ['log','info','warn','error'].forEach(function(type){
    var orig = console[type];
    console[type] = function(){ send(type,arguments); orig && orig.apply(console,arguments) };
  });
  window.addEventListener('error',function(e){ send('error',[e.message]) });
})();</scr${'ipt'}>`
  const jsRule = js ? `<scr${'ipt'}>try{${js}}catch(e){document.body.innerHTML+='<pre style="color:#b91c1c">'+e+'</pre>'}</scr${'ipt'}>` : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${cssRule}${bridge}</head><body>${html}${jsRule}</body></html>`
}
