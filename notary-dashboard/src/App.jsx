import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import PrivateRoute from './components/PrivateRoute'
import NotaryLayout from './components/NotaryLayout'
import Login from './pages/notary/Login'
import ResetPassword from './pages/notary/ResetPassword'
import SetPassword from './pages/notary/SetPassword'
import './index.css'

// Lazy load heavy components for better performance
const Dashboard = lazy(() => import('./pages/notary/Dashboard'))
const Calendar = lazy(() => import('./pages/notary/Calendar'))
const SubmissionDetail = lazy(() => import('./pages/notary/SubmissionDetail'))
const Messages = lazy(() => import('./pages/notary/Messages'))
const Payouts = lazy(() => import('./pages/notary/Payouts'))
const Profile = lazy(() => import('./pages/notary/Profile'))

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
  </div>
)

function App() {
  useEffect(() => {
    document.title = 'Notary dashboard';
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/set-password" element={<SetPassword />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <NotaryLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Dashboard />
                </Suspense>
              </NotaryLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <PrivateRoute>
              <NotaryLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Calendar />
                </Suspense>
              </NotaryLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/submission/:id"
          element={
            <PrivateRoute>
              <NotaryLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <SubmissionDetail />
                </Suspense>
              </NotaryLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Messages />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/payouts"
          element={
            <PrivateRoute>
              <NotaryLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Payouts />
                </Suspense>
              </NotaryLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <NotaryLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Profile />
                </Suspense>
              </NotaryLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App

