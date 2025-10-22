import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NotaryForm from './components/NotaryForm'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Submissions from './pages/admin/Submissions'
import Profile from './pages/admin/Profile'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/*" element={<NotaryForm />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/submissions"
          element={
            <PrivateRoute>
              <Submissions />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/profile"
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
