import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FacultyApp from './faculty/App'
import LoginApp from './login/App'
import HomepageApp from './homepage/App'
import AdminApp from './admin/App'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/faculty/*" element={<FacultyApp />} />
        <Route path="/login/*" element={<LoginApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/" element={<HomepageApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
