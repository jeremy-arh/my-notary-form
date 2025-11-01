import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Login from './pages/client/Login'
import ResetPassword from './pages/client/ResetPassword'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailed from './pages/PaymentFailed'
import Dashboard from './pages/client/Dashboard'
import SubmissionDetail from './pages/client/SubmissionDetail'
import Profile from './pages/client/Profile'
import PrivateRoute from './components/PrivateRoute'
import NotaryForm from './components/NotaryForm'

function App() {
  return (
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
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/submission/:id"
          element={
            <PrivateRoute>
              <SubmissionDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
