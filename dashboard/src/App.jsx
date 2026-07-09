import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import DashboardPage from './pages/DashboardPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import ManualAnalysisPage from './pages/ManualAnalysisPage';
import SettingsPage from './pages/SettingsPage';
import BackendFallbackWarning from './components/BackendFallbackWarning';

export default function App() {
  return (
    <BrowserRouter>
      <BackendFallbackWarning />
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trips/:tripId" element={<TripDetailPage />} />
          <Route path="analysis" element={<ManualAnalysisPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
