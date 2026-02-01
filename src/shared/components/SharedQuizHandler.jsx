import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SharedQuizHandler = () => {
    const { code } = useParams();
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            // User not logged in, redirect to login
            // Pass the current location as a query param so it persists through refreshes
            const returnTo = encodeURIComponent(location.pathname + location.search);

            // INTENT: Save quiz code to local storage so Onboarding knows to treat them as a student
            if (code) {
                localStorage.setItem('quiz_join_intent', code);
            }

            navigate(`/login?returnTo=${returnTo}`, {
                replace: true
            });
        } else {
            // User logged in, redirect to student join page with code
            navigate(`/student/join?code=${code}`, { replace: true });
        }
    }, [user, isLoading, code, navigate, location]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return null;
};

export default SharedQuizHandler;
