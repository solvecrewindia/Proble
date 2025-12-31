import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/context/AuthContext'
import { ThemeProvider } from './shared/context/ThemeContext';
import Header from './shared/components/Header';
import RegistrationNumberModal from './shared/components/RegistrationNumberModal';
import { useState, lazy, Suspense } from 'react';

// Lazy Load Components
const FacultyApp = lazy(() => import('./faculty/App'));
const Login = lazy(() => import('./login/pages/Login'));
const HomepageApp = lazy(() => import('./homepage/App'));
const QuizDetails = lazy(() => import('./student/pages/QuizDetails'));
const ModuleDetails = lazy(() => import('./homepage/ModuleDetails'));
const AdminApp = lazy(() => import('./admin/App'));
const StudentApp = lazy(() => import('./student/App'));
const ForgotPassword = lazy(() => import('./login/pages/ForgotPassword'));
const SharedQuizHandler = lazy(() => import('./shared/components/SharedQuizHandler'));

// Loading Screen Component
const FullScreenLoader = () => (
    <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <FullScreenLoader />;
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



// Root Redirect Component
const RootRedirect = ({ searchQuery }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <FullScreenLoader />;
    }

    // Role Guard: Redirect based on role
    if (user) {
        const role = user.role?.toLowerCase();
        if (role === 'faculty' || role === 'teacher') {
            return <Navigate to="/faculty/dashboard" replace />;
        }
        if (role === 'admin') {
            return <Navigate to="/admin" replace />;
        }
    }

    // Default for Guests and Students
    return <HomepageApp searchQuery={searchQuery} />;
};

function AppContent() {

    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

    const isHeaderHidden = location.pathname === '/login' ||
        location.pathname === '/forgot-password' ||
        location.pathname.startsWith('/faculty') ||
        location.pathname.startsWith('/admin') ||
        location.pathname.includes('/practice/test') ||
        location.pathname.includes('/practice/mcq') ||
        location.pathname.includes('/student/test');

    return (
        <div className="app-container">
            {!isHeaderHidden && (
                <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            )}
            <RegistrationNumberModal />
            <Suspense fallback={<FullScreenLoader />}>
                <Routes>
                    {/* Public Routes / Root Redirect */}
                    <Route path="/" element={<RootRedirect searchQuery={searchQuery} />} />
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
            </Suspense>
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
