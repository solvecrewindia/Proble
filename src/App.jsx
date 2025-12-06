import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import FacultyApp from './faculty/App'
import Login from './login/pages/Login'
import HomepageApp from './homepage/App'
import QuizDetails from './student/pages/QuizDetails';
import AdminApp from './admin/App'
import StudentApp from './student/App'
import { AuthProvider, useAuth } from './shared/context/AuthContext'
import { ThemeProvider } from './shared/context/ThemeContext';
import Header from './shared/components/Header';
import ForgotPassword from './login/pages/ForgotPassword';
import { useState } from 'react';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />; // Or unauthorized page
    }

    return children;
};

function AppContent() {

    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

    return (
        <div className="app-container">
            {location.pathname !== '/login' && location.pathname !== '/forgot-password' && !location.pathname.startsWith('/faculty') && !location.pathname.startsWith('/admin') && !location.pathname.includes('/practice/setup') && !location.pathname.includes('/practice/test') && !location.pathname.includes('/practice/mcq') && (
                <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            )}
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomepageApp searchQuery={searchQuery} />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/course/:id" element={<QuizDetails />} />

                {/* Protected Routes */}
                <Route
                    path="/faculty/*"
                    element={
                        <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                            <FacultyApp />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminApp />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/student/*"
                    element={
                        <ProtectedRoute allowedRoles={['student', 'admin']}>
                            <StudentApp />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </div>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <ThemeProvider>
                    <AppContent />
                </ThemeProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
