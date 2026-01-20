import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Submissions from './pages/admin/Submissions'
import SubmissionDetail from './pages/admin/SubmissionDetail'
import Notary from './pages/admin/Notary'
import NotaryDetail from './pages/admin/NotaryDetail'
import NotaryEdit from './pages/admin/NotaryEdit'
import StripePayments from './pages/admin/StripePayments'
import CashFlow from './pages/admin/CashFlow'
import CMS from './pages/admin/CMS'
import BlogArticleEdit from './pages/admin/BlogArticleEdit'
import ServiceEdit from './pages/admin/ServiceEdit'
import OptionEdit from './pages/admin/OptionEdit'
import Messages from './pages/admin/Messages'
import Profile from './pages/admin/Profile'
import Analytics from './pages/admin/Analytics'
import CRM from './pages/admin/CRM'
import ClientDetail from './pages/admin/ClientDetail'
import './index.css'

function App() {
  useEffect(() => {
    document.title = 'Admin dashboard';
  }, []);

  return (
    <ToastProvider>
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
              <Navigate to="/crm?tab=submissions" replace />
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
          path="/notary/new"
          element={
            <PrivateRoute>
              <NotaryEdit />
            </PrivateRoute>
          }
        />
        <Route
          path="/notary/edit/:id"
          element={
            <PrivateRoute>
              <NotaryEdit />
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
          path="/cms/blog/new"
          element={
            <PrivateRoute>
              <BlogArticleEdit />
            </PrivateRoute>
          }
        />
        <Route
          path="/cms/blog/:id"
          element={
            <PrivateRoute>
              <BlogArticleEdit />
            </PrivateRoute>
          }
        />
        <Route
          path="/cms/service/new"
          element={
            <PrivateRoute>
              <ServiceEdit />
            </PrivateRoute>
          }
        />
        <Route
          path="/cms/service/:id"
          element={
            <PrivateRoute>
              <ServiceEdit />
            </PrivateRoute>
          }
        />
        <Route
          path="/cms/option/new"
          element={
            <PrivateRoute>
              <OptionEdit />
            </PrivateRoute>
          }
        />
        <Route
          path="/cms/option/:id"
          element={
            <PrivateRoute>
              <OptionEdit />
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
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          }
        />
        <Route
          path="/crm"
          element={
            <PrivateRoute>
              <CRM />
            </PrivateRoute>
          }
        />
        <Route
          path="/crm/client/:id"
          element={
            <PrivateRoute>
              <ClientDetail />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App
