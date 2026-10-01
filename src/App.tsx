import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { GamesPage } from './pages/GamesPage';
import { GameScreen } from './pages/GameScreen';
import { DailyTraining } from './pages/DailyTraining';
import { Progress } from './pages/Progress';
import { Profile } from './pages/Profile';
import { isOnboardingComplete } from './services/storage';

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  if (!isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      
      <Route path="/" element={
        <RequireOnboarding>
          <Layout />
        </RequireOnboarding>
      }>
        <Route index element={<Dashboard />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/:gameId" element={<GameScreen />} />
        <Route path="training" element={<DailyTraining />} />
        <Route path="progress" element={<Progress />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
