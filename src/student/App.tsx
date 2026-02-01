import DailyGame from './pages/games/DailyGame';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import StudentLayout from './components/layout/Layout';
import StudentDashboard from './pages/Dashboard';
import PracticeList from './pages/PracticeList';
import QuizDetails from './pages/QuizDetails';
import MCQTest from './pages/MCQTest';
import PracticeTest from './pages/PracticeTest';
import TestSetup from './pages/TestSetup';
import JoinTest from './pages/JoinTest';
import ProfileSettings from '../shared/pages/ProfileSettings';
import StudentGame from './pages/StudentGame';
import FlashCardGame from './pages/games/FlashCardGame';
import PuzzleGame from './pages/games/PuzzleGame';
import DebuggerGame from './pages/games/DebuggerGame';
import RapidFireGame from './pages/games/RapidFireGame';
import FlashCards from './pages/FlashCards';
import StudentLiveQuiz from './pages/StudentLiveQuiz';
const NoSidebarLayout = () => (
    <div className="min-h-screen bg-background">
        <main className="transition-all duration-300 ease-in-out">
            <div className="container mx-auto p-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Outlet />
            </div>
        </main>
    </div>
);

const FullScreenLayout = () => (
    <div className="min-h-screen bg-background">
        <main className="w-full h-full">
            <Outlet />
        </main>
    </div>
);

const StudentApp = () => {
    return (
        <Routes>
            <Route element={<NoSidebarLayout />}>
                <Route path="/" element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="practice" element={<PracticeList />} />
                <Route path="join" element={<JoinTest />} />
                <Route path="game" element={<StudentGame />} />
                <Route path="game/daily" element={<DailyGame />} />
                <Route path="game/flashcards" element={<FlashCardGame />} />
                <Route path="game/puzzle" element={<PuzzleGame />} />
                <Route path="game/debugger" element={<DebuggerGame />} />
                <Route path="game/rapid-fire" element={<RapidFireGame />} />
                <Route path="game/debugger" element={<DebuggerGame />} />
                <Route path="profile-settings" element={<ProfileSettings />} />
            </Route>

            <Route element={<FullScreenLayout />}>
                <Route path="practice/:id" element={<QuizDetails />} />
                <Route path="practice/setup/:id" element={<TestSetup />} />
            </Route>

            <Route element={<StudentLayout />}>
            </Route>

            <Route path="practice/mcq/:id" element={<MCQTest />} />
            <Route path="test/:id" element={<MCQTest />} />
            <Route path="practice/test/:id" element={<PracticeTest />} />
            <Route path="live/:id" element={<StudentLiveQuiz />} />
            <Route path="practice/flashcards/:id" element={<FlashCards />} />
        </Routes>
    );
};

export default StudentApp;
