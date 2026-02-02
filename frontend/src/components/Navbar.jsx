import React, { useState } from "react";
import { Lock, Menu, X } from "lucide-react";

const Navbar = ({ activeTab, setActiveTab, isAdminLoggedIn, onAdminClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "實時監控" },
    { id: "features", label: "核心技術" },
    { id: "docs", label: "API 文件" },
    { id: "admin", label: "管理端", protected: true },
  ];

  const handleNavClick = (item) => {
    if (item.protected && !isAdminLoggedIn) {
      onAdminClick();
    } else {
      setActiveTab(item.id);
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <img src="/logo.png" alt="Goldlab" className="w-10 h-10 rounded-lg shadow-lg border border-slate-700/50" />
            <span className="text-white font-bold text-xl tracking-tight flex items-center gap-2">
              Goldlab<span className="text-emerald-500">.cloud</span>
              <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded font-medium">
                BETA
              </span>
            </span>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === item.id
                      ? "text-emerald-400 bg-slate-800"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {item.protected && <Lock className="w-3 h-3" />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-400 hover:text-white p-2"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                {item.protected && <Lock className="w-4 h-4" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
