import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/client/Login'
import Dashboard from './pages/client/Dashboard'
import SubmissionDetail from './pages/client/SubmissionDetail'
import Profile from './pages/client/Profile'
import PrivateRoute from './components/PrivateRoute'
import NotaryForm from './components/NotaryForm'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect to form for public access */}
        <Route path="/" element={<Navigate to="/form" replace />} />

        {/* Public form routes */}
        <Route path="/form/*" element={<NotaryForm />} />

        {/* Client authentication and dashboard */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<Login />} />
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
