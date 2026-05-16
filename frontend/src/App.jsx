import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
          }
        }}/>
        <Routes>
          {/* Redirect root to /dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/planner" element={<StudyPlanner />} />
            <Route path="/tutor" element={<AITutor />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/stress" element={<StressMonitor />} />
            <Route path="/graph" element={<GraphView />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Catch-all: unknown routes → dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;