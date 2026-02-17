import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './features/landing/Landing';
import HomepageContainer from './features/home/HomepageContainer';
import LeagueListContainer from './features/league/LeagueListContainer';
import LeagueViewContainer from './features/league/LeagueViewContainer';
import PulseContainer from './features/pulse/PulseContainer';

function App() {
  return (
    <Router basename="/fpl-pulse">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<HomepageContainer />} />
        <Route path="/mini-leagues" element={<LeagueListContainer />} />
        <Route path="/mini-league" element={<LeagueViewContainer />} />
        <Route path="/pulse" element={<PulseContainer />} />
      </Routes>
    </Router>
  );
}

export default App;
