import { useCallback, useSyncExternalStore } from 'react'

export interface SnippetFiles {
  html: string
  css: string
  js: string
}

export interface Snippet {
  id: string
  name: string
  language: 'javascript' | 'html' | 'web'
  code: string
  /** Present for 'web' snippets — the three files that build one page. */
  files?: SnippetFiles
  updatedAt: string
  shared?: boolean
}

const KEY = 'devora-react-snippets'

export interface Template {
  id: string
  label: string
  /** shown inside the dropdown */
  hint: string
  language: Snippet['language']
  code: string
  files?: SnippetFiles
}

const WEB_HTML = `<h1 id="title">Hello, Devora!</h1>
<p>Edit the HTML, CSS and JS files — they all talk to each other.</p>
<button id="btn">Click me</button>
<p id="output"></p>
`
const WEB_CSS = `#title { color: #0e7490; }
#btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #0e7490;
  background: #0e7490;
  color: #fff;
  cursor: pointer;
}
`
const WEB_JS = `// This JS can reach into the HTML above using the same id.
const btn = document.getElementById("btn");
const output = document.getElementById("output");
let clicks = 0;

btn.addEventListener("click", () => {
  clicks++;
  output.textContent = "Clicked " + clicks + " time(s)!";
});
`

export const TEMPLATES: Template[] = [
  {
    id: 'js-blank',
    label: 'JavaScript — blank',
    hint: 'single scratch.js, console output',
    language: 'javascript',
    code: `// Scratchpad. Run with the ▶ Run button.\n\n`
  },
  {
    id: 'js-loop-art',
    label: 'JavaScript — loop pattern art',
    hint: 'single scratch.js, console output',
    language: 'javascript',
    code: `// build a triangle, one line at a time\nfor (let i = 1; i <= 6; i++) {\n  console.log("*".repeat(i));\n}\n`
  },
  {
    id: 'js-fizzbuzz',
    label: 'JavaScript — FizzBuzz starter',
    hint: 'single scratch.js, console output',
    language: 'javascript',
    code: `for (let i = 1; i <= 15; i++) {\n  if (i % 15 === 0) console.log("FizzBuzz");\n  else if (i % 3 === 0) console.log("Fizz");\n  else if (i % 5 === 0) console.log("Buzz");\n  else console.log(i);\n}\n`
  },
  {
    id: 'web-starter',
    label: 'Web page — HTML + CSS + JS',
    hint: '3 files, one live preview',
    language: 'web',
    code: '',
    files: { html: WEB_HTML, css: WEB_CSS, js: WEB_JS }
  }
]

interface Snapshot {
  items: Snippet[]
  saveFailed: boolean
}

function load(): Snippet[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

let snapshot: Snapshot = { items: load(), saveFailed: false }
const listeners = new Set<() => void>()

function emit(updated: Snapshot) {
  snapshot = updated
  listeners.forEach((l) => l())
}

function write(next: Snippet[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    emit({ items: next, saveFailed: false })
  } catch {
    emit({ items: next, saveFailed: true })
  }
}

export function useSnippets(): [
  Snapshot,
  {
    save: (s: Omit<Snippet, 'id' | 'updatedAt'>) => Snippet
    remove: (id: string) => void
    update: (id: string, code: string) => void
    toggleShared: (id: string) => void
  }
] {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot
  )

  const save = useCallback((s: Omit<Snippet, 'id' | 'updatedAt'>) => {
    const snippet: Snippet = { ...s, id: `snip-${Date.now()}`, updatedAt: new Date().toISOString() }
    write([snippet, ...snapshot.items.filter((x) => x.name !== s.name)])
    return snippet
  }, [snapshot.items])

  const remove = useCallback((id: string) => {
    write(snapshot.items.filter((x) => x.id !== id))
  }, [snapshot.items])

  const update = useCallback((id: string, code: string) => {
    write(snapshot.items.map((x) => (x.id === id ? { ...x, code, updatedAt: new Date().toISOString() } : x)))
  }, [snapshot.items])

  const toggleShared = useCallback((id: string) => {
    write(
      snapshot.items.map((x) =>
        x.id === id ? { ...x, shared: !x.shared, updatedAt: new Date().toISOString() } : x
      )
    )
  }, [snapshot.items])

  return [snap, { save, remove, update, toggleShared }]
}
