import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';

import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import StudyPlanner from './pages/StudyPlanner';
import AITutor from './pages/AITutor';
import Analytics from './pages/Analytics';
import StressMonitor from './pages/StressMonitor';
import GraphView from './pages/GraphView';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import Loader from './components/Loader';
import { profileService } from './services/index';

function RequireProfile({ profile, children }) {
  const location = useLocation();
  if (!profile) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }
  return children;
}

function AppRoutes({ profile, setProfile }) {
  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          profile ? <Navigate to="/dashboard" replace /> : <ProfileSetup onComplete={setProfile} />
        }
      />
      <Route path="/" element={<Navigate to={profile ? '/dashboard' : '/onboarding'} replace />} />

      <Route
        element={
          <RequireProfile profile={profile}>
            <MainLayout profile={profile} />
          </RequireProfile>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/planner" element={<StudyPlanner />} />
        <Route path="/tutor" element={<AITutor />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/stress" element={<StressMonitor />} />
        <Route path="/graph" element={<GraphView />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings profile={profile} onProfileUpdate={setProfile} />} />
        <Route path="/profile" element={<Profile profile={profile} onProfileUpdate={setProfile} />} />
      </Route>

      <Route path="*" element={<Navigate to={profile ? '/dashboard' : '/onboarding'} replace />} />
    </Routes>
  );
}

function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileService
      .get()
      .then(setProfile)
      .catch((err) => {
        if (err.response?.status === 404) setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0b0f19]">
        <Loader />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)' },
          }}
        />
        <AppRoutes profile={profile} setProfile={setProfile} />
      </Router>
    </ThemeProvider>
  );
}

export default App;
