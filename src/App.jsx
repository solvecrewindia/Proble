import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/context/AuthContext'
import { useAntiCheat } from './shared/hooks/useAntiCheat';
import { ThemeProvider } from './shared/context/ThemeContext';
import Header from './shared/components/Header';
import RegistrationNumberModal from './shared/components/RegistrationNumberModal';
import InstallPwaPopup from './shared/components/InstallPwaPopup';
import Maintenance from './shared/components/Maintenance';
import { useState, Suspense, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Lazy Load Components
import { lazyRetry } from './shared/utils/lazyRetry';

// Lazy Load Components
const FacultyApp = lazyRetry(() => import('./faculty/App'), 'FacultyApp');
const Login = lazyRetry(() => import('./login/pages/Login'), 'Login');
const HomepageApp = lazyRetry(() => import('./homepage/App'), 'HomepageApp');
const QuizDetails = lazyRetry(() => import('./student/pages/courses/CourseDetails'), 'CourseDetails');
const CourseList = lazyRetry(() => import('./student/pages/courses/CourseList'), 'CourseList');
const ModuleDetails = lazyRetry(() => import('./homepage/ModuleDetails'), 'ModuleDetails');

const AboutUs = lazyRetry(() => import('./homepage/AboutUs'), 'AboutUs');
const StudentApp = lazyRetry(() => import('./student/App'), 'StudentApp');
const ForgotPassword = lazyRetry(() => import('./login/pages/ForgotPassword'), 'ForgotPassword');
const SharedQuizHandler = lazyRetry(() => import('./shared/components/SharedQuizHandler'), 'SharedQuizHandler');
const Onboarding = lazyRetry(() => import('./login/pages/Onboarding'), 'Onboarding');
const AdminApp = lazyRetry(() => import('./admin/App'), 'AdminApp');

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

// Onboarding Guard - Only for new users or those without role
const OnboardingRoute = ({ children }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <FullScreenLoader />;
    if (!user) return <Navigate to="/login" replace />;

    // If user HAS a role, they shouldn't be here (unless we allow re-onboarding? No)
    if (user.role && !user.isNewUser) {
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
        // Redirection for new users
        if (user.isNewUser || !user.role) {
            return <Navigate to="/onboarding" replace />;
        }

        // Check for quiz intent (Master Test / QR Code Scan)
        const quizIntent = localStorage.getItem('quiz_join_intent');
        if (quizIntent) {
            // We consume it here OR let the target page consume it?
            // If we redirect to /student/join, that page (JoinTest.tsx) should probably handle it.
            // But usually we want to consume it so we don't get stuck in a loop if they navigate away.
            // However, JoinTest usually takes a code param.
            // Let's consume it and redirect.
            localStorage.removeItem('quiz_join_intent');
            return <Navigate to={`/student/join?code=${quizIntent}`} replace />;
        }

        const role = user.role?.toLowerCase();
        if (role === 'admin') {
            return <Navigate to="/admin" replace />;
        }
        if (role === 'faculty' || role === 'teacher') {
            return <Navigate to="/faculty/dashboard" replace />;
        }

    }

    // Default for Guests and Students
    return <HomepageApp searchQuery={searchQuery} />;
};

function AppContent() {
    useAntiCheat();

    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkMaintenance = async () => {
            try {
                const { data, error } = await supabase
                    .from('platform_settings')
                    .select('maintenance_mode')
                    .eq('id', 1)
                    .single();

                if (data && data.maintenance_mode) {
                    setMaintenanceMode(true);
                }
            } catch (err) {
                console.error("Error checking maintenance mod:", err);
            } finally {
                setIsCheckingMaintenance(false);
            }
        };
        checkMaintenance();
    }, []);

    // If still checking, we show nothing or a loader
    if (isCheckingMaintenance) return <FullScreenLoader />;

    // If maintenance mode is ON, ONLY let Admins bypass it
    const isAdminMode = user?.role === 'admin' || location.pathname.startsWith('/admin') || location.pathname === '/login';

    if (maintenanceMode && !isAdminMode) {
        return <Maintenance />;
    }

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
            <InstallPwaPopup />
            <Suspense fallback={<FullScreenLoader />}>
                <Routes>
                    {/* Public Routes / Root Redirect */}
                    <Route path="/" element={<RootRedirect searchQuery={searchQuery} />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/course/:module" element={<CourseList />} />
                    <Route path="/course/details/:id" element={<QuizDetails />} />
                    <Route path="/module/:id" element={<ModuleDetails />} />
                    <Route path="/quiz/:code" element={<SharedQuizHandler />} />

                    {/* Onboarding Route */}
                    <Route
                        path="/onboarding"
                        element={
                            <OnboardingRoute>
                                <Onboarding />
                            </OnboardingRoute>
                        }
                    />

                    {/* Protected Routes */}
                    {/* Admin Routes - Handles its own auth/login internally */}
                    <Route
                        path="/admin/*"
                        element={<AdminApp />}
                    />

                    <Route
                        path="/faculty/*"
                        element={
                            <ProtectedRoute allowedRoles={['faculty', 'admin', 'teacher']}>
                                <FacultyApp />
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
