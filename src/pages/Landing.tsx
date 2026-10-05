import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { CodeBlock } from '../components/JourneyChecklist'
import { ThemeToggle } from '../components/ThemeToggle'
import {
  listPathsTree,
  type PathSummary
} from '../engines/curriculum'
import { runCode } from '../engines/execution'
import { Button } from '../components/Button'

const DEMO_CODE = `let greeting = "Hello, Devora"\nconsole.log(greeting)`

export function Landing() {
  const [ran, setRan] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [demoPaths, setDemoPaths] = useState<{ path: PathSummary; lessonTitles: string[] }[]>([])

  async function runDemo() {
    setRan(true)
    const r = await runCode({ language: 'javascript', code: DEMO_CODE })
    setOutput(r.stdout || (r.error ? r.error.message : '—'))
  }

  useEffect(() => {
    document.title = 'Devora — the editor is the lesson'
    // Mark that this person has seen the landing page, so the next visit to
    // "/" opens the app directly instead.
    try {
      localStorage.setItem('devora:visited', '1')
    } catch {
      /* storage unavailable — they'll see the landing page again; harmless */
    }
    let cancelled = false
    listPathsTree().then(async (tree) => {
      const cards: { path: PathSummary; lessonTitles: string[] }[] = []
      for (const path of tree.slice(0, 2)) {
        const course = path.courses[0]
        if (!course) continue
        const module = course.modules[0]
        if (!module) continue
        const lessonTitles = module.lessons
          .slice(0, 3)
          .map((lesson) => lesson.title)
        cards.push({ path, lessonTitles })
      }
      if (!cancelled) setDemoPaths(cards)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div
          className="row"
          style={{ maxWidth: 1080, margin: '0 auto', padding: '0 clamp(20px, 4vw, 32px)', height: 64, flexWrap: 'nowrap' }}
        >
          <Link
            to="/landing"
            className="row"
            style={{ gap: 'var(--sp-3)', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontWeight: 600, minHeight: 44, alignItems: 'center' }}
          >
            <span className="brand-mark" aria-hidden="true">
              <Icon name="terminal" size={15} />
            </span>
            devora
          </Link>
          <span style={{ flex: 1 }} />
          <nav className="row" aria-label="Page sections" style={{ gap: 'var(--sp-5)' }}>
            <a href="#how" className="muted fs-14 nav-link-pub" style={{ textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
              How it works
            </a>
          </nav>
          <ThemeToggle />
          <Link to="/" className="btn btn-primary btn-sm pub-cta" style={{ minHeight: 44 }}>
            Open Devora
            <Icon name="arrowR" size={14} />
          </Link>
        </div>
      </header>

      <main id="main" style={{ flex: 1 }}>
        {/* Hero */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(48px, 9vw, 80px) clamp(20px, 4vw, 32px) clamp(40px, 7vw, 64px)' }}>
          <h1 className="rise" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'clamp(2rem, 4.6vw, 2.875rem)', lineHeight: 1.2, letterSpacing: '-0.02em', maxWidth: '21ch' }}>
            The editor is the lesson.
            <span aria-hidden="true" style={{ display: 'inline-block', width: '0.5em', height: '0.08em', background: 'var(--accent)', marginLeft: '0.12em', verticalAlign: 'baseline' }} />
          </h1>
          <p className="rise rise-1 muted" style={{ marginTop: 'var(--sp-5)', fontSize: 'clamp(1rem, 2.6vw, 1.25rem)', maxWidth: '52ch' }}>
            Instructions, a real code editor and instant output in one view — built for someone who has never written a line of code before.
          </p>
          <div className="row rise rise-2" style={{ marginTop: 'var(--sp-6)' }}>
            <Link to="/" className="btn btn-primary">
              Start learning
              <Icon name="arrowR" size={14} />
            </Link>
            <a href="#how" className="btn btn-secondary">
              See how it works
            </a>
          </div>
          <p className="rise rise-3 muted fs-14" style={{ marginTop: 'var(--sp-5)' }}>
            Free · No setup required · No account needed to try
          </p>
        </section>

        {/* Interactive demo */}
        <section aria-labelledby="demo-h" style={{ maxWidth: 1080, margin: '0 auto', padding: '0 clamp(20px, 4vw, 32px) clamp(40px, 7vw, 64px)' }}>
          <h2 id="demo-h" className="sr-only">
            Interactive product demo
          </h2>
          <div className="window" style={{ maxWidth: 920, marginInline: 'auto' }}>
            <div className="window-bar">
              <div className="window-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="window-title">hello.js — Devora</span>
            </div>
            <div className="workspace" style={{ gap: 0 }}>
              <aside style={{ padding: 'var(--sp-4)', borderRight: '1px solid var(--border)' }}>
                <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
                  Instructions
                </p>
                <p className="fs-14" style={{ lineHeight: 1.6 }}>
                  Create a variable named <strong>greeting</strong> holding <strong>Hello, Devora</strong>, then print
                  it.
                </p>
                <p className="hint-locked" style={{ marginTop: 'var(--sp-4)', borderTop: '1px dashed var(--border)', paddingTop: 'var(--sp-3)' }}>
                  <Icon name="lock" size={13} /> In real lessons, hints unlock one step at a time — never the whole answer dumped at once
                </p>
              </aside>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="tabbar">
                  <span className="tab" aria-selected="true">
                    hello.js
                  </span>
                  <span style={{ marginLeft: 'auto' }} />
                  <Button
                    size="sm"
                    variant={ran && !output?.includes('Error') ? 'secondary' : 'primary'}
                    icon={<Icon name="play" size={12} filled />}
                    onClick={runDemo}
                    style={{ minHeight: 44 }}
                  >
                    Run
                  </Button>
                </div>
                <CodeBlock code={DEMO_CODE} />
                <div className="output-bar">
                  {output === null ? (
                    <span className="output-quiet">Press Run — it really runs.</span>
                  ) : (
                    <span className="output-ok">
                      <Icon name="check" size={13} /> {output.split('\n')[0]} <span className="output-quiet">· exit 0</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" style={{ borderTop: '1px solid var(--border)', padding: 'clamp(40px, 7vw, 64px) clamp(20px, 4vw, 32px)', scrollMarginTop: 72 }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,5fr) minmax(0,7fr)', gap: 'clamp(24px, 4vw, 48px)' }} className="how-grid">
            <div>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'clamp(1.5rem, 3.2vw, 1.75rem)', lineHeight: 1.25, letterSpacing: '-0.01em', maxWidth: '16ch' }}>
                One view. No tabs to hunt through.
              </h2>
              <p className="muted fs-15" style={{ marginTop: 'var(--sp-4)', maxWidth: '38ch', fontSize: 'var(--fs-15)' }}>
                Every lesson follows the same three steps, so you always know where you are and what comes next.
              </p>
            </div>
            <ol style={{ listStyle: 'none' }}>
              {[
                { n: '01', t: 'Read the step', d: 'Each lesson shows exactly one task. Nothing else competes for your attention.' },
                { n: '02', t: 'Write the code', d: 'A real editor with a real Run button. Output appears in the same view, immediately.' },
                { n: '03', t: 'Get unstuck', d: 'Hints unlock progressively — one step away, never handed over before you try.' }
              ].map((s, i) => (
                <li key={s.n} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 'var(--sp-4)', padding: 'var(--sp-5) 0', borderTop: i === 0 ? 0 : '1px solid var(--border)' }}>
                  <span className="mono muted fs-14" style={{ fontWeight: 600, paddingTop: 2 }}>
                    {s.n}
                  </span>
                  <div>
                    <h3 style={{ fontSize: 'var(--fs-16)', fontWeight: 600 }}>{s.t}</h3>
                    <p className="muted" style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-15)', maxWidth: '52ch' }}>
                      {s.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Real path cards — same ✓ ● ○ checklist the app uses */}
        <section style={{ borderTop: '1px solid var(--border)', padding: 'clamp(40px, 7vw, 64px) clamp(20px, 4vw, 32px)' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'clamp(1.5rem, 3.2vw, 1.75rem)', letterSpacing: '-0.01em', marginBottom: 'var(--sp-5)' }}>
              Paths look like this inside the app
            </h2>
            <div className="grid grid-2">
              {demoPaths.map(({ path: p, lessonTitles }) => (
                <div key={p.id} className="panel panel-pad">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="badge">{p.level}</span>
                    <span className="mono fs-12 muted">{p.hours}h</span>
                  </div>
                  <h3 style={{ fontSize: 'var(--fs-16)', fontWeight: 600, marginTop: 'var(--sp-3)' }}>{p.title}</h3>
                  <ol className="journey" style={{ marginTop: 'var(--sp-4)' }}>
                    {lessonTitles.map((title, i) => (
                      <li key={i} className="journey-item" data-state="todo">
                        <span className="journey-node">
                          <Icon name="chevronR" size={14} />
                        </span>
                        <span className="journey-title fs-14" style={{ fontWeight: 400, fontSize: 'var(--fs-14)' }}>
                          {title}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <Link className="btn btn-secondary btn-sm" to="/paths" style={{ marginTop: 'var(--sp-4)' }}>
                    Explore paths
                    <Icon name="arrowR" size={13} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: 'clamp(40px, 7vw, 64px) clamp(20px, 4vw, 32px)' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'clamp(1.5rem, 3.2vw, 1.75rem)', lineHeight: 1.25, maxWidth: '24ch' }}>
              Your first line of code is one click away.
            </h2>
            <p className="muted fs-15" style={{ marginTop: 'var(--sp-4)', maxWidth: '46ch', fontSize: 'var(--fs-15)' }}>
              No account walls before you try. Open the app, pick a lesson, and run real code in the same view.
            </p>
            <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
              <Link to="/" className="btn btn-primary">
                Open Devora
                <Icon name="arrowR" size={14} />
              </Link>
              <Link to="/playground" className="btn btn-secondary">
                Try the playground first
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: 'var(--sp-7) clamp(20px, 4vw, 32px)' }}>
        <div className="row" style={{ maxWidth: 1080, margin: '0 auto', flexWrap: 'wrap', gap: 'var(--sp-4)', color: 'var(--muted)', fontSize: 'var(--fs-14)' }}>
          <Link to="/landing" className="row" style={{ gap: 'var(--sp-2)', textDecoration: 'none', fontFamily: 'var(--font-mono)', minHeight: 44, alignItems: 'center' }}>
            <span className="brand-mark" aria-hidden="true" style={{ width: 20, height: 20 }}>
              <Icon name="terminal" size={11} />
            </span>
            devora
          </Link>
          <span>© 2026 Devora</span>
          <span style={{ flex: 1 }} />
          <div className="row" style={{ gap: 'var(--sp-4)' }}>
            <Link to="/" className="muted" style={{ textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
              Home
            </Link>
            <a href="#how" className="muted" style={{ textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
              How it works
            </a>
            <Link to="/login" className="muted" style={{ textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
              Sign in
            </Link>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 720px) { .nav-link-pub { display: none !important; } }
        @media (max-width: 560px) { .pub-cta { display: none !important; } }
        @media (max-width: 900px) { .how-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 700px) { .workspace { grid-template-columns: 1fr !important; } .workspace aside { border-right: 0 !important; border-bottom: 1px solid var(--border); } }
      `}</style>
    </div>
  )
}
