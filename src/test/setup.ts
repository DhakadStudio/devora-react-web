import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// jsdom gap: Element.scrollIntoView is not implemented — the app's
// bring-result-into-view scroll would reject after every Run.
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})
