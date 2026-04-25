import { useState } from 'react';
import {
  Eye,
  Image,
  Video,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'image', label: 'Image Mode', icon: Image, description: 'Upload & analyse photos' },
  { id: 'video', label: 'Video Mode', icon: Video, description: 'Real-time video analysis' },
];

export default function Layout({ activeMode, onModeChange, stats, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside
        className={`relative flex flex-col border-r border-surface-border bg-surface-light
          transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 glow-brand">
            <Eye className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Road<span className="text-gradient">Eye</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">
                AI Detection
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p
            className={`px-3 mb-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500
              ${collapsed ? 'text-center' : ''}`}
          >
            {collapsed ? '•••' : 'Detection Modes'}
          </p>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeMode === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onModeChange(item.id)}
                className={`group flex items-center gap-3 w-full rounded-xl px-3 py-3 transition-all duration-200
                  ${
                    isActive
                      ? 'bg-brand-600/15 text-brand-400 glow-brand'
                      : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200'
                  }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'}`}
                />
                {!collapsed && (
                  <div className="text-left animate-fade-in">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-[11px] text-slate-500">{item.description}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mini-stats in sidebar */}
        {!collapsed && (
          <div className="px-4 py-4 mx-3 mb-4 space-y-3 rounded-xl glass-card animate-fade-in">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">
              Session Stats
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-crack" />
                <span className="text-xs text-slate-300">Cracks</span>
              </div>
              <span className="text-sm font-bold text-crack">{stats.cracks}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-pothole" />
                <span className="text-xs text-slate-300">Potholes</span>
              </div>
              <span className="text-sm font-bold text-pothole">{stats.potholes}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-surface-border">
              <span className="text-xs text-slate-400">Total scans</span>
              <span className="text-sm font-bold text-brand-400">{stats.totalScans}</span>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          id="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute flex items-center justify-center w-7 h-7 transition-colors border rounded-full -right-3.5 top-20 bg-surface-light border-surface-border text-slate-400 hover:text-white hover:bg-surface-hover"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white">
              {activeMode === 'image' ? 'Image Analysis' : 'Video Analysis'}
            </h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-success" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-success" />
            </span>
            <span className="text-xs font-medium text-slate-300">Backend Connected</span>
          </div>
        </header>

        {/* Page body */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
