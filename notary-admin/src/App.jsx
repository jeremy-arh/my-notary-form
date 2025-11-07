import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Submissions from './pages/admin/Submissions'
import SubmissionDetail from './pages/admin/SubmissionDetail'
import Notary from './pages/admin/Notary'
import NotaryDetail from './pages/admin/NotaryDetail'
import StripePayments from './pages/admin/StripePayments'
import CashFlow from './pages/admin/CashFlow'
import CMS from './pages/admin/CMS'
import Messages from './pages/admin/Messages'
import Profile from './pages/admin/Profile'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <Users />
            </PrivateRoute>
          }
        />
        <Route
          path="/submissions"
          element={
            <PrivateRoute>
              <Submissions />
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
          path="/notary"
          element={
            <PrivateRoute>
              <Notary />
            </PrivateRoute>
          }
        />
        <Route
          path="/notary/:id"
          element={
            <PrivateRoute>
              <NotaryDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/stripe"
          element={
            <PrivateRoute>
              <StripePayments />
            </PrivateRoute>
          }
        />
        <Route
          path="/cashflow"
          element={
            <PrivateRoute>
              <CashFlow />
            </PrivateRoute>
          }
        />
        <Route
          path="/cms"
          element={
            <PrivateRoute>
              <CMS />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <Messages />
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
