import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Eye, LayoutDashboard, Route, Search, Settings,
  ChevronLeft, ChevronRight, AlertTriangle, Zap,
} from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', desc: 'Overview & Analytics' },
  { to: '/trips', icon: Route, label: 'Trips & Reports', desc: 'Data table & uploads' },
  { to: '/analysis', icon: Search, label: 'Manual Analysis', desc: 'Image & Video tools' },
  { to: '/settings', icon: Settings, label: 'Settings', desc: 'Preferences' },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside className={`relative flex flex-col border-r border-surface-border bg-surface-light transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 glow-brand shrink-0">
            <Eye className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold tracking-tight text-white">Road<span className="text-gradient">Eye</span></h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Command Center</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className={`px-3 mb-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 ${collapsed ? 'text-center' : ''}`}>
            {collapsed ? '•••' : 'Navigation'}
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 w-full rounded-xl px-3 py-3 transition-all duration-200 no-underline ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 glow-brand'
                    : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <div className="text-left animate-fade-in">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-[11px] text-slate-500">{item.desc}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute flex items-center justify-center w-7 h-7 transition-colors border rounded-full -right-3.5 top-20 bg-surface-light border-surface-border text-slate-400 hover:text-white hover:bg-surface-hover z-10"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto bg-surface">
        <Outlet />
      </main>
    </div>
  );
}
