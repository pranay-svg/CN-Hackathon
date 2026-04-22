import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DemoPage } from './pages/DemoPage';
import { AuthPage } from './pages/AuthPage';
import styles from './App.module.css';

export default function App() {
  return (
    <div className={styles.root}>
      <div className={styles.bgGrid} />
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

