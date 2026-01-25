import React from 'react';
import { LayoutDashboard, Settings, LogOut, Menu, X, BookOpen, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  hasContext: boolean;
  onReset: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, hasContext, onReset }) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'My Business Context', path: '/context', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-950 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Strategist AI</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {hasContext && navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}

          {!hasContext && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              Complete the setup to unlock the dashboard.
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onReset}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium">Reset Data</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <span className="font-bold">Strategist AI</span>
          <button onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950 p-4 md:hidden">
            <div className="flex justify-end mb-8">
              <button onClick={() => setIsMobileOpen(false)}><X /></button>
            </div>
            <nav className="space-y-4">
               {hasContext && navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className="block text-xl font-medium text-slate-300 py-2 border-b border-slate-800"
                >
                  {item.name}
                </Link>
              ))}
              <button onClick={() => { onReset(); setIsMobileOpen(false); }} className="text-red-400 mt-8">Reset Data</button>
            </nav>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
