import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ItineraryList from './pages/ItineraryList'
import ItineraryForm from './pages/ItineraryForm'
import ItineraryParser from './pages/ItineraryParser'
import AuditLog from './pages/AuditLog'
import BlogPosts from './pages/BlogPosts'
import AffiliateEarnings from './pages/AffiliateEarnings'
import CreatorSubmissions from './pages/CreatorSubmissions'


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="itineraries" element={<ItineraryList />} />
            <Route path="itineraries/new" element={<ItineraryForm />} />
            <Route path="itineraries/parse" element={<ItineraryParser />} />
            <Route path="itineraries/:id/edit" element={<ItineraryForm />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path='blog' element={<BlogPosts />} />
            <Route path='earnings' element={<AffiliateEarnings />} />
            <Route path='creators' element={<CreatorSubmissions />} />
                      </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
