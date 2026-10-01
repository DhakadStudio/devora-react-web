import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { Workbench } from '../components/Workbench'

vi.mock('../engines/curriculum', () => ({}))

describe('Workbench render probe — is the code visible?', () => {
  it('picking a language shows the code in the editor area', async () => {
    const { getByRole, container } = render(<Workbench />)

    // Open the language menu and pick Java.
    const langBtn = getByRole('button', { name: /Language: /i })
    fireEvent.click(langBtn)
    const javaItem = getByRole('menuitem', { name: 'Java' })
    fireEvent.click(javaItem)

    // The editor pane should now show Java's sample code — the CODE ITSELF,
    // not an empty editor.
    await waitFor(() => {
      const editorArea = container.querySelector('.workbench-editor-host')
      expect(editorArea).toBeTruthy()
      expect(editorArea!.getAttribute('aria-hidden')).toBeNull()
    })
    const host = container.querySelector('.workbench-editor-host') as HTMLElement
    expect(host.clientHeight).toBeGreaterThanOrEqual(0)
    expect(getComputedStyle(host).display).not.toBe('none')
    const code = host.querySelector('textarea') as HTMLTextAreaElement | null
    expect(code, 'the editor must render a code element').toBeTruthy()
    expect(code!.value).toContain('public class Main')
    expect(code!.value.length).toBeGreaterThan(20)
  })

  it('the editor pane is NOT hidden behind the pane tabs on the code pane', () => {
    const { container, getByRole } = render(<Workbench />)
    const langBtn = getByRole('button', { name: /Language: /i })
    fireEvent.click(langBtn)
    fireEvent.click(getByRole('menuitem', { name: 'Python' }))
    const editorPane = container.querySelector('.workbench-editor-pane') as HTMLElement
    expect(editorPane).toBeTruthy()
    expect(editorPane.classList.contains('is-pane-hidden')).toBe(false)
    expect(getComputedStyle(editorPane).display).not.toBe('none')
  })

  it('ONE playground: the web view shows Run/Reset in the same toolbar as the compiler view', () => {
    const { getByRole, getAllByRole, container } = render(<Workbench />)

    // Web playground is the default selection — Run/Reset must exist (jsdom
    // renders both rows; desktop CSS hides one — at least one must exist).
    const toolbar = container.querySelector('.workbench-toolbar') as HTMLElement
    expect(toolbar).toBeTruthy()
    expect(getAllByRole('button', { name: /Run/i }).length).toBeGreaterThan(0)
    expect(getAllByRole('button', { name: 'Reset' }).length).toBeGreaterThan(0)

    // No "Auto-saved" line anywhere.
    expect(container.textContent).not.toContain('Auto-saved')

    // Switch to a compiler language — the same toolbar still carries Run/Reset.
    const langBtn = getByRole('button', { name: /Language: /i })
    fireEvent.click(langBtn)
    fireEvent.click(getByRole('menuitem', { name: 'Python' }))
    expect(getAllByRole('button', { name: /Run/i }).length).toBeGreaterThan(0)
    expect(getAllByRole('button', { name: 'Reset' }).length).toBeGreaterThan(0)
  })
})
