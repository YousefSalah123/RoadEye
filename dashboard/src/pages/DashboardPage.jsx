import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Crosshair, Map as MapIcon, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import CityMap from '../components/CityMap';
import { getStats } from '../services/api';

// Mock initial stats while loading
const INITIAL_STATS = {
  totalDamages: '...',
  activeAlerts: '...',
  avgConfidence: 94.2,
};

const CHART_DATA = [
  { day: 'Mon', cracks: 45, potholes: 12 },
  { day: 'Tue', cracks: 52, potholes: 15 },
  { day: 'Wed', cracks: 38, potholes: 8 },
  { day: 'Thu', cracks: 65, potholes: 22 },
  { day: 'Fri', cracks: 48, potholes: 18 },
  { day: 'Sat', cracks: 55, potholes: 25 },
  { day: 'Sun', cracks: 40, potholes: 10 },
];



export default function DashboardPage() {
  const [stats, setStats] = useState(INITIAL_STATS);

  useEffect(() => {
    let active = true;
    getStats()
      .then((data) => {
        if (active) {
          setStats({
            totalDamages: data.total_defects,
            activeAlerts: data.severity?.High || 0,
            avgConfidence: 94.2, // mock confidence placeholder
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to load stats, using fallback mock:', err);
        if (active) {
          setStats({
            totalDamages: 1423,
            activeAlerts: 42,
            avgConfidence: 94.2,
          });
        }
      });
    return () => { active = false; };
  }, []);
  return (
    <div className="min-h-[calc(100vh-64px)] bg-surface">
      <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white">City Infrastructure Command Center</h2>
          <p className="text-xs text-brand-400 mt-0.5 tracking-wider uppercase font-semibold">Global Overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-brand-500/30">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-brand-400" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-brand-500" />
          </span>
          <span className="text-xs font-bold text-brand-100">System Online</span>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-surface-border relative overflow-hidden group hover:border-brand-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Crosshair className="w-16 h-16 text-brand-400" />
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Total Damages Detected</p>
            <p className="text-4xl font-black text-white tracking-tight">{typeof stats.totalDamages === 'number' ? stats.totalDamages.toLocaleString() : stats.totalDamages}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-brand-400 font-semibold bg-brand-500/10 w-max px-2 py-1 rounded-md">
              <TrendingUp className="w-3 h-3" /> +12% this week
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-surface-border relative overflow-hidden group hover:border-red-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Active High-Priority Alerts</p>
            <p className="text-4xl font-black text-white tracking-tight">{stats.activeAlerts}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-red-400 font-semibold bg-red-500/10 w-max px-2 py-1 rounded-md">
              Requires immediate action
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-surface-border relative overflow-hidden group hover:border-success/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-16 h-16 text-success" />
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Average AI Confidence</p>
            <p className="text-4xl font-black text-white tracking-tight">{stats.avgConfidence}%</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-success font-semibold bg-success/10 w-max px-2 py-1 rounded-md">
              Model accuracy stable
            </div>
          </div>
        </div>

        {/* Charts & Map Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Trend Chart */}
          <div className="glass-card rounded-2xl p-6 border border-surface-border flex flex-col h-[450px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-400" />
                Damage Trend (7 Days)
              </h3>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCracks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPotholes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', border: '1px solid #1e293b' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="cracks" name="Cracks" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCracks)" />
                  <Area type="monotone" dataKey="potholes" name="Potholes" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorPotholes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="glass-card rounded-2xl p-6 border border-surface-border flex flex-col h-[450px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-brand-400" />
                Live Defect Map
              </h3>
              <span className="text-xs bg-surface-light border border-surface-border px-2 py-1 rounded text-slate-400">
                Greater Cairo
              </span>
            </div>
            <div className="flex-1 w-full rounded-xl overflow-hidden border border-surface-border relative z-0">
              <CityMap />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
