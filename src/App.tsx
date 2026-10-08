import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { OfflineBanner } from './components/OfflineBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PageSkeleton } from './components/Loading'
import { ThemeProvider } from './lib/theme'
import { AuthProvider } from './lib/auth'
import { ToastProvider, useToast } from './components/Toast'
import { useEffect, useState } from 'react'
import { useOnline } from './lib/useOnline'
import { CurriculumProvider } from './providers/CurriculumProvider'

const NAV_COLLAPSED_KEY = 'devora:nav-collapsed'

const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })))
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const Paths = lazy(() => import('./pages/Paths').then((m) => ({ default: m.Paths })))
const PathDetail = lazy(() => import('./pages/PathDetail').then((m) => ({ default: m.PathDetail })))
const Challenges = lazy(() => import('./pages/Challenges').then((m) => ({ default: m.Challenges })))
const ChallengeDetail = lazy(() => import('./pages/ChallengeDetail').then((m) => ({ default: m.ChallengeDetail })))
const Lesson = lazy(() => import('./pages/Lesson').then((m) => ({ default: m.LessonPage })))
const Playground = lazy(() => import('./pages/Playground').then((m) => ({ default: m.PlaygroundPage })))
const Progress = lazy(() => import('./pages/Progress').then((m) => ({ default: m.Progress })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const Project = lazy(() => import('./pages/Project').then((m) => ({ default: m.ProjectPage })))
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))

const BARE_ROUTES = ['/landing', '/login', '/signup', '/reset-password']
const VISITED_KEY = 'devora:visited'

/** True only until the landing page has been seen once this device. */
function isFirstVisit() {
  try {
    return !localStorage.getItem(VISITED_KEY)
  } catch {
    return false // storage off → always open the app directly
  }
}

function Shell() {
  const location = useLocation()
  const bare = BARE_ROUTES.some((r) => location.pathname.startsWith(r))
  const online = useOnline()
  const toast = useToast()

  useEffect(() => {
    if (!online) toast.push('error', 'No internet connection', 'You can keep coding — everything needed is already on this device.')
  }, [online, toast])

  const [navCollapsed, setNavCollapsed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(NAV_COLLAPSED_KEY) === '1'
  )
  const toggleNav = () =>
    setNavCollapsed((c) => {
      try {
        localStorage.setItem(NAV_COLLAPSED_KEY, c ? '0' : '1')
      } catch {
        /* storage unavailable — collapse state just won't persist */
      }
      return !c
    })

  // First-time visitors see the public landing page at "/"; it marks itself
  // as seen (Landing.tsx) and every later visit opens the app directly.
  if (location.pathname === '/' && isFirstVisit()) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Landing />
      </Suspense>
    )
  }

  if (bare) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <div className={navCollapsed ? 'app-shell nav-collapsed' : 'app-shell'}>
      <Sidebar collapsed={navCollapsed} onToggleCollapse={toggleNav} />
      <div className="app-main">
        <OfflineBanner />
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/paths" element={<Paths />} />
              <Route path="/paths/:pathId" element={<PathDetail />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />
              {/* Splat, not :lessonId — real lesson ids contain slashes ("module/lesson") and a
                  dynamic param matches a single segment, which 404'd every real lesson link. */}
              <Route path="/lesson/*" element={<Lesson />} />
              <Route path="/project/*" element={<Project />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <CurriculumProvider>
              <Shell />
            </CurriculumProvider>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}