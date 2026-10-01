import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { Workbench } from '../components/Workbench'

vi.mock('../engines/curriculum', () => ({}))

describe('Workbench probe — the web playground editor', () => {
  it('the default web playground shows a code element', async () => {
    localStorage.clear()
    const { container } = render(<Workbench />)
    await waitFor(() => {
      const host = container.querySelector('.webplay-editor-host') as HTMLElement | null
      expect(host).toBeTruthy()
      // jsdom's real Monaco can't render text — assert the element exists.
      const code = host!.querySelector('textarea, .monaco-editor')
      expect(code, 'the web editor must render').toBeTruthy()
    })
  })

  it('switching to a compiler language and BACK still shows the web editor', async () => {
    localStorage.clear()
    const { container, getByRole } = render(<Workbench />)

    const langBtn = getByRole('button', { name: /Language: /i })
    fireEvent.click(langBtn)
    fireEvent.click(getByRole('menuitem', { name: 'Python' }))

    // Back to the web playground (the accessible name includes the badge).
    fireEvent.click(getByRole('button', { name: /Language: /i }))
    fireEvent.click(getByRole('menuitem', { name: /HTML \+ CSS \+ JS/ }))

    await waitFor(() => {
      const host = container.querySelector('.webplay-editor-host') as HTMLElement | null
      expect(host).toBeTruthy()
      const code = host!.querySelector('textarea, .monaco-editor')
      expect(code, 'the web editor must render after switching back').toBeTruthy()
    })
  })
})
