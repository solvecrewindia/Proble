import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Quizzes from './pages/Quizzes';
import ProblemRequests from './pages/ProblemRequests';
import Settings from './pages/Settings';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

function AdminApp() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="quizzes" element={<Quizzes />} />
          <Route path="problem-requests" element={<ProblemRequests />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default AdminApp;
