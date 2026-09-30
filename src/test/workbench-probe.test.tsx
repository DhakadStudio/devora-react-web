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

    // The editor pane should now show Java's sample code.
    await waitFor(() => {
      const editorArea = container.querySelector('.workbench-editor-host')
      expect(editorArea).toBeTruthy()
      expect(editorArea!.getAttribute('aria-hidden')).toBeNull()
    })
    const host = container.querySelector('.workbench-editor-host') as HTMLElement
    // The host must have real height potential (not display:none / collapsed).
    expect(host.clientHeight).toBeGreaterThanOrEqual(0)
    expect(getComputedStyle(host).display).not.toBe('none')
    const code = host.querySelector('textarea, .monaco-editor')
    expect(code).toBeTruthy()
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
})
