import {
  TrendingUp, AlertTriangle, Zap, Users, MapPin, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MOCK_KPI, MOCK_CHART_DATA, MOCK_PINS, MOCK_TRIPS } from '../data/mockData';

import {
  MapContainer, TileLayer, CircleMarker, Popup
} from 'react-leaflet';

const KPI_CARDS = [
  { label: 'Total Km Scanned', value: `${MOCK_KPI.totalKm} km`, icon: TrendingUp, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20', glow: 'glow-brand' },
  { label: 'Total Potholes', value: MOCK_KPI.totalPotholes, icon: Zap, color: 'text-pothole', bg: 'bg-pothole/10', border: 'border-pothole/20', glow: 'glow-pothole' },
  { label: 'Critical Issues', value: MOCK_KPI.criticalIssues, icon: AlertTriangle, color: 'text-crack', bg: 'bg-crack/10', border: 'border-crack/20', glow: 'glow-crack' },
  { label: 'Active Drivers', value: MOCK_KPI.activeDrivers, icon: Users, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', glow: '' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card rounded-lg px-4 py-3 border border-surface-border shadow-xl">
      <p className="text-xs font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">City Infrastructure Command Center</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-success" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-success" />
          </span>
          <span className="text-xs font-medium text-slate-300">System Online</span>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KPI_CARDS.map((card, i) => (
            <div key={i} className={`glass-card rounded-2xl p-5 border ${card.border} ${card.glow} animate-slide-up hover:scale-[1.02] transition-transform`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">{card.label}</span>
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${card.bg}`}>
                  <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-extrabold tracking-tight ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Heatmap + Chart row */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Map — 3 cols */}
          <div className="xl:col-span-3 glass-card rounded-2xl border border-surface-border overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-slate-200">Defect Heatmap — Greater Cairo</span>
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{MOCK_PINS.length} pins</span>
            </div>
            <div className="relative h-[400px] bg-black overflow-hidden z-0">
              <MapContainer 
                center={[30.0444, 31.2357]} 
                zoom={11} 
                style={{ height: '100%', width: '100%', backgroundColor: '#000000' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {MOCK_PINS.map((pin, i) => {
                  const isPothole = pin.type === 'Pothole';
                  const color = isPothole ? '#ef4444' : '#06b6d4';
                  return (
                    <CircleMarker
                      key={i}
                      center={[pin.lat, pin.lng]}
                      radius={6}
                      pathOptions={{
                        color: '#000000',
                        fillColor: color,
                        fillOpacity: 0.9,
                        weight: 2,
                        opacity: 1,
                        className: isPothole ? 'glow-pothole' : 'glow-crack'
                      }}
                    >
                      <Popup className="road-eye-popup">
                        <div className="text-slate-900 font-sans">
                          <strong className="block text-sm mb-1">{pin.type}</strong>
                          <span className="text-xs text-slate-500 block">Severity: {pin.severity}</span>
                          <span className="text-xs text-slate-500 block">{pin.street}, {pin.zone}</span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
              {/* Legend overlay */}
              <div className="absolute bottom-4 left-4 flex items-center gap-4 px-3 py-2 rounded-lg glass-card z-[1000] shadow-xl">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-pothole shadow-[0_0_8px_rgba(239,68,68,0.8)]" />Pothole</span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-crack shadow-[0_0_8px_rgba(6,182,212,0.8)]" />Crack</span>
              </div>
            </div>
          </div>

          {/* Chart — 2 cols */}
          <div className="xl:col-span-2 glass-card rounded-2xl border border-surface-border overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-border">
              <ArrowUpRight className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-semibold text-slate-200">Defects Per Day (Last 7 Days)</span>
            </div>
            <div className="p-4 h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_CHART_DATA} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
                  <Bar dataKey="cracks" name="Cracks" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="potholes" name="Potholes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Trips */}
        <div className="glass-card rounded-2xl border border-surface-border animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
            <span className="text-sm font-semibold text-slate-200">Recent Critical Trips</span>
            <a href="/trips" className="text-xs font-medium text-brand-400 hover:underline">View All →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-surface-border">
                  <th className="px-5 py-3">Trip ID</th>
                  <th className="px-5 py-3">Street</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Defects</th>
                  <th className="px-5 py-3">Severity</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TRIPS.filter(t => t.severity === 'Critical').slice(0, 4).map((t) => (
                  <tr key={t.id} className="border-b border-surface-border/50 hover:bg-surface-hover/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{t.id}</td>
                    <td className="px-5 py-3 text-slate-300">{t.streetName}, {t.zone}</td>
                    <td className="px-5 py-3 text-slate-400">{t.driverName}</td>
                    <td className="px-5 py-3">
                      <span className="text-crack font-semibold">{t.cracks}C</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-pothole font-semibold">{t.potholes}P</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pothole/15 text-pothole">CRITICAL</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
