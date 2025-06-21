import React from 'react';
import './Sidebar.css';

export type SidebarNav = 'dashboard' | 'people' | 'groups' | 'followups' | 'settings';

interface SidebarProps {
  current: SidebarNav;
  onNavigate: (nav: SidebarNav) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ current, onNavigate }) => (
  <aside className="sidebar">
    <nav>
      <ul>
        <li className={current === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')}>Dashboard</li>
        <li className={current === 'people' ? 'active' : ''} onClick={() => onNavigate('people')}>People</li>
        <li className={current === 'groups' ? 'active' : ''} onClick={() => onNavigate('groups')}>Groups</li>
        <li className={current === 'followups' ? 'active' : ''} onClick={() => onNavigate('followups')}>Follow Ups</li>
        <li className={current === 'settings' ? 'active' : ''} onClick={() => onNavigate('settings')}>Settings</li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
