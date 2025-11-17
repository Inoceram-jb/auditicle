import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { ToastContainer } from './components/Toast';

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
