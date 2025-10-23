import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/client/Login'
import Dashboard from './pages/client/Dashboard'
import SubmissionDetail from './pages/client/SubmissionDetail'
import Profile from './pages/client/Profile'
import PrivateRoute from './components/PrivateRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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
