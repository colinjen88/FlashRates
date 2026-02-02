import React, { useState } from "react";
import { Zap } from "lucide-react";

import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";
import DashboardSection from "./sections/DashboardSection";
import CoreTechSection from "./sections/CoreTechSection";
import DocsSection from "./sections/DocsSection";
import AdminSection from "./sections/AdminSection";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminKey, setAdminKey] = useState(""); // State for authenticated key
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAdminClick = () => {
    if (!isAdminLoggedIn) {
      setShowLoginModal(true);
    }
  };

  const handleLogin = (key) => {
    setAdminKey(key);
    setIsAdminLoggedIn(true);
    setActiveTab("admin");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminClick={handleAdminClick}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />

      <main className="relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

        {activeTab === "dashboard" && <DashboardSection adminKey={adminKey} />}
        {activeTab === "features" && <CoreTechSection />}
        {activeTab === "docs" && <DocsSection />}
        {activeTab === "admin" && isAdminLoggedIn && <AdminSection adminKey={adminKey} />}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-12 mt-12 relative z-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">
              <Zap className="text-emerald-500 w-4 h-4" />
            </div>
            <span className="text-slate-300 font-bold flex items-center gap-2">
              Goldlab.cloud
              <span className="text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.5 rounded font-medium">
                BETA
              </span>
            </span>
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 High-Freq Systems. All rights reserved.
          </div>
          <div className="flex gap-6 text-slate-400">
            <a href="https://github.com/colinjen88/Goldlab.cloud" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
