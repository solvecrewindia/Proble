import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import FacultyApp from './faculty/App'
import Login from './login/pages/Login'
import HomepageApp from './homepage/App'
import QuizDetails from './student/pages/QuizDetails';
import ModuleDetails from './homepage/ModuleDetails';
import AdminApp from './admin/App'
import StudentApp from './student/App'
import { AuthProvider, useAuth } from './shared/context/AuthContext'
import { ThemeProvider } from './shared/context/ThemeContext';
import Header from './shared/components/Header';
import ForgotPassword from './login/pages/ForgotPassword';
import SharedQuizHandler from './shared/components/SharedQuizHandler';
import { useState } from 'react';

// Protected Route Component
// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        console.warn(`ProtectedRoute: Access denied to ${location.pathname}. No user found.`);
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`ProtectedRoute: Access denied to ${location.pathname}. Role mismatch. User: ${user.role}, Allowed: ${allowedRoles}`);
        return <Navigate to="/" replace />;
    }

    return children;
};



function AppContent() {

    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

    return (
        <div className="app-container">
            {location.pathname !== '/login' && location.pathname !== '/forgot-password' && !location.pathname.startsWith('/faculty') && !location.pathname.startsWith('/admin') && !location.pathname.includes('/practice/test') && !location.pathname.includes('/practice/mcq') && !location.pathname.includes('/student/test') && (
                <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            )}
            <Routes>
                {/* Public Routes */}
                {/* Public Routes */}
                <Route path="/" element={<HomepageApp searchQuery={searchQuery} />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/course/:id" element={<QuizDetails />} />
                <Route path="/module/:id" element={<ModuleDetails />} />
                <Route path="/quiz/:code" element={<SharedQuizHandler />} />

                {/* Protected Routes */}
                <Route
                    path="/faculty/*"
                    element={
                        <ProtectedRoute allowedRoles={['faculty', 'admin', 'teacher']}>
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
                        <ProtectedRoute allowedRoles={['student', 'admin', 'faculty', 'teacher']}>
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
