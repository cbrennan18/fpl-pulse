import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import HomepageContainer from './containers/HomepageContainer';
import MiniLeagueListContainer from './containers/MiniLeagueListContainer';
import MiniLeagueViewContainer from './containers/MiniLeagueViewContainer';
import PulseContainer from './pulse/containers/PulseContainer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<HomepageContainer />} />
        <Route path="/mini-leagues" element={<MiniLeagueListContainer />} />
        <Route path="/mini-league" element={<MiniLeagueViewContainer />} />
        <Route path="/pulse" element={<PulseContainer />} />
      </Routes>
    </Router>
  );
}

export default App;
