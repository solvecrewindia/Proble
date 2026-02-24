import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Quizzes from './pages/Quizzes';
import QuizList from './pages/QuizList';
import AdminQuizCreate from './pages/AdminQuizCreate';
import AdminModuleCreate from './pages/AdminModuleCreate';
import ProblemRequests from './pages/ProblemRequests';
import Settings from './pages/Settings';
import ProfileSettings from '../shared/pages/ProfileSettings';
import AdminSelectType from './pages/AdminSelectType';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import './index.css';

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function AdminApp() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="login" element={<Login />} />

        {/* Protected Admin Routes */}
        <Route path="/" element={<AdminProtectedRoute><Layout /></AdminProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="profile-settings" element={<ProfileSettings />} />
          <Route path="create" element={<AdminSelectType />} />
          <Route path="users" element={<Users />} />
          <Route path="quizzes" element={<Quizzes />} />
          <Route path="quizzes/:category" element={<QuizList />} />
          <Route path="quizzes/:category/create" element={<AdminQuizCreate />} />
          <Route path="quizzes/:category/edit/:quizId" element={<AdminQuizCreate />} />
          <Route path="modules/:category/create" element={<AdminModuleCreate />} />
          <Route path="modules/edit/:moduleId" element={<AdminModuleCreate />} />
          <Route path="modules/:moduleId" element={<QuizList />} />
          <Route path="problem-requests" element={<ProblemRequests />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default AdminApp;
