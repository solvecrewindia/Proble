import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { HeaderOnlyLayout } from './components/layout/HeaderOnlyLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import ProfileSettings from '../shared/pages/ProfileSettings';
import QuizCreate from './pages/QuizCreate';

import Global from './pages/Global';
import Master from './pages/Master';
import LiveTests from './pages/LiveTests';
import LiveLobby from './pages/LiveLobby';
import LiveController from './pages/LiveController';

// Placeholders for other pages to avoid build errors
const QuizEdit = () => <div>Quiz Edit Page</div>;
const QuizSchedule = () => <div>Quiz Schedule Page</div>;

function FacultyApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />

        <Route element={<HeaderOnlyLayout />}>
          <Route path="profile-settings" element={<ProfileSettings />} />
        </Route>

        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="global" element={<Global />} />
          <Route path="master" element={<Master />} />
          <Route path="live" element={<LiveTests />} />
          <Route path="live/:id/lobby" element={<LiveLobby />} />
          <Route path="live/:id/host" element={<LiveController />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile />} />

          {/* Quiz Creation & Management */}
          <Route path="create" element={<QuizCreate />} />
          <Route path="quizzes/:id/edit" element={<QuizCreate />} />
        </Route>

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default FacultyApp;
