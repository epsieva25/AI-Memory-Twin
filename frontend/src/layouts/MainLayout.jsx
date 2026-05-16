import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const MainLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Background decoration */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col md:ml-64 z-10 h-full overflow-hidden">
        <Navbar toggleMobileMenu={toggleMobileMenu} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-4 md:p-6 pt-16 md:pt-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
