import React, { useState } from 'react';
import Login from './pages/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import type { SidebarNav } from './components/Sidebar';
import MainSection from './components/MainSection';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import Groups from './pages/Groups';
import FollowUps from './pages/FollowUps';
import Settings from './pages/Settings';
import './App.css';
import './auth.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nav, setNav] = useState<SidebarNav>('dashboard');

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  let content: React.ReactNode;
  switch (nav) {
    case 'dashboard':
      content = <Dashboard />;
      break;
    case 'people':
      content = <People />;
      break;
    case 'groups':
      content = <Groups />;
      break;
    case 'followups':
      content = <FollowUps />;
      break;
    case 'settings':
      content = <Settings />;
      break;
    default:
      content = <Dashboard />;
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="layout-body">
        <Sidebar current={nav} onNavigate={setNav} />
        <MainSection>{content}</MainSection>
      </div>
    </div>
  );
};

export default App;
