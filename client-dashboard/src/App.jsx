import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import Home from './components/Home'
import Login from './pages/client/Login'
import ResetPassword from './pages/client/ResetPassword'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailed from './pages/PaymentFailed'
import PrivateRoute from './components/PrivateRoute'
import NotaryForm from './components/NotaryForm'

// Lazy load heavy components for better performance
const Dashboard = lazy(() => import('./pages/client/Dashboard'))
const SubmissionDetail = lazy(() => import('./pages/client/SubmissionDetail'))
const Messages = lazy(() => import('./pages/client/Messages'))
const Profile = lazy(() => import('./pages/client/Profile'))

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
  </div>
)

function App() {
  useEffect(() => {
    document.title = 'Client dashboard';
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        {/* Smart redirect based on authentication */}
        <Route path="/" element={<Home />} />

        {/* Public form routes */}
        <Route path="/form/*" element={<NotaryForm />} />

        {/* Payment routes */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failed" element={<PaymentFailed />} />

        {/* Client authentication and dashboard */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<Login />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/submission/:id"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <SubmissionDetail />
              </Suspense>
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
          path="/profile"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Profile />
              </Suspense>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App
