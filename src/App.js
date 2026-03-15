import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing'; // New Landing Page
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import Signup from './pages/Signup'; 
import Setup from './pages/Setup';
import Settings from './pages/Settings'; 


function App() {
  return (
    <Router>
      <Routes>
        {/* The Welcome/Promotion Page is now the FIRST thing people see */}
        <Route path="/" element={<Landing />} />
        
        {/* Login is now reached via your "Get Started" button */}
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;