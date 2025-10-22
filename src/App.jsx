import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/marketing/HomePage'
import ServicesPage from './pages/marketing/ServicesPage'
import ServiceDetailPage from './pages/marketing/ServiceDetailPage'
import BlogPage from './pages/marketing/BlogPage'
import BlogPostPage from './pages/marketing/BlogPostPage'
import LegalPage from './pages/marketing/LegalPage'
import PrivacyPage from './pages/marketing/PrivacyPage'
import NotFoundPage from './pages/marketing/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/mentions-legales" element={<LegalPage />} />
        <Route path="/politique-confidentialite" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
