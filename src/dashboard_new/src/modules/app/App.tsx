import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { WebSocketProvider, useWs } from '../ws/WebSocketProvider';
import { ApiProvider } from '../api/api';
import { HighlightStyles } from '../theme/HighlightStyles';
import { DashboardStatistics } from '../pages/DashboardStatistics';
import { SpecsPage } from '../pages/SpecsPage';
import { TasksPage } from '../pages/TasksPage';
import { ApprovalsPage } from '../pages/ApprovalsPage';
import { SpecViewerPage } from '../pages/SpecViewerPage';
import { NotificationProvider } from '../notifications/NotificationProvider';

function Header() {
  const { theme, toggleTheme } = useTheme();
  const { connected } = useWs();
  return (
    <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-lg font-semibold">Spec Workflow</div>
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            <NavLink to="/" end className={({ isActive }) => `px-3 py-1.5 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Statistics
            </NavLink>
            <NavLink to="/specs" className={({ isActive }) => `px-3 py-1.5 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Specs
            </NavLink>
            <NavLink to="/tasks" className={({ isActive }) => `px-3 py-1.5 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Tasks
            </NavLink>
            <NavLink to="/approvals" className={({ isActive }) => `px-3 py-1.5 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Approvals
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} title={connected ? 'Connected' : 'Disconnected'} />
          <button onClick={toggleTheme} className="btn-secondary" title="Toggle theme">
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>
    </header>
  );
}

function AppInner() {
  const { initial, version } = useWs();
  return (
    <ApiProvider initial={initial} version={version}>
      <NotificationProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <Header />
          <HighlightStyles />
          <main className="max-w-6xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<DashboardStatistics />} />
              <Route path="/specs" element={<SpecsPage />} />
              <Route path="/specs/view" element={<SpecViewerPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </NotificationProvider>
    </ApiProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <WebSocketProvider>
        <AppInner />
      </WebSocketProvider>
    </ThemeProvider>
  );
}


