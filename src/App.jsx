import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './features/landing/Landing';
import HomepageContainer from './features/home/HomepageContainer';
import LeagueListContainer from './features/league/LeagueListContainer';
import LeagueViewContainer from './features/league/LeagueViewContainer';
import PulseContainer from './features/pulse/PulseContainer';
// Wrapped rebuild runs at /wrapped alongside the legacy /pulse recap (flip later).
import WrappedContainer from './features/pulse/wrapped/WrappedContainer';
import GwAwardsPreviewDev from './features/league/awards-share/GwAwardsPreviewDev';
import useUmami from './hooks/useUmami';

function AppRoutes() {
  useUmami();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<HomepageContainer />} />
      <Route path="/mini-leagues" element={<LeagueListContainer />} />
      <Route path="/mini-league" element={<LeagueViewContainer />} />
      <Route path="/pulse" element={<PulseContainer />} />
      <Route path="/wrapped" element={<WrappedContainer />} />
      {import.meta.env.DEV && (
        <Route path="/dev/awards-preview" element={<GwAwardsPreviewDev />} />
      )}
    </Routes>
  );
}

function App() {
  return (
    <Router basename="/fpl-pulse">
      <AppRoutes />
    </Router>
  );
}

export default App;
