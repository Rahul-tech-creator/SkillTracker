import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Navbar } from '../components/common/Navbar';
import { SimulationBanner } from '../components/common/SimulationBanner';

export const AdminLayout = ({ title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main-container">
        <Navbar
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <SimulationBanner />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

