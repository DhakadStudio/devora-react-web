import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProjectPage } from '../pages/Project'
import { getProject, type GuidedProject } from '../engines/project'

vi.mock('../engines/project', () => ({
  getProject: vi.fn()
}))

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ user: null, ready: true })
}))

const project: GuidedProject = {
  id: 'javascript-fundamentals/core/foundations/intro-card',
  moduleId: 'javascript-fundamentals/core/foundations',
  title: 'Build your intro card',
  brief: 'Combine variables, output and your own text.',
  guideLevel: 'guided',
  rubric: [
    { label: 'Card prints a heading with your name in it', hint: 'Store your name first.' },
    { label: 'Card prints at least one more line about you' }
  ]
}

describe('ProjectPage route (multi-segment id regression)', () => {
  beforeEach(() => {
    vi.mocked(getProject).mockResolvedValue(project)
  })

  it('reaches the project through a multi-segment id (the splat route)', async () => {
    const { getByRole, getByText } = render(
      <MemoryRouter initialEntries={['/project/javascript-fundamentals/core/foundations/intro-card']}>
        <Routes>
          <Route path="/project/*" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(getByRole('heading', { name: /intro card/i })).toBeTruthy())
    expect(getByText('Combine variables, output and your own text.')).toBeTruthy()
  })
})
