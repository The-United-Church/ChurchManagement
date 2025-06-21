import React from 'react';
import './MainSection.css';

const MainSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="main-section">
    {children}
  </main>
);

export default MainSection;
