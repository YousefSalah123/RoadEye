import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Route, Search, Filter, ChevronDown, Eye, ArrowUpDown, Loader2
} from 'lucide-react';
import { getTrips, getDefects } from '../services/api';

const STATUS_COLORS = {
  completed: 'bg-success/15 text-success',
  processing: 'bg-warning/15 text-warning',
};

const SEVERITY_COLORS = {
  High: 'bg-crack/15 text-crack',
  Medium: 'bg-warning/15 text-warning',
  Low: 'bg-brand-500/15 text-brand-400',
  None: 'bg-surface-light text-slate-500',
};

export default function TripsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [tripsData, setTripsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [tripsRes, defectsRes] = await Promise.all([
          getTrips(),
          getDefects()
        ]);
        
        if (cancelled) return;
        
        const tripsArr = tripsRes?.trips || tripsRes || [];
        const defectsArr = defectsRes?.defects || defectsRes || [];

        // Map defects by trip_id
        const defectsByTrip = {};
        defectsArr.forEach(d => {
          if (!defectsByTrip[d.trip_id]) {
            defectsByTrip[d.trip_id] = { cracks: 0, potholes: 0, highestSeverity: 'None' };
          }
          if (d.defect_type === 'Crack') defectsByTrip[d.trip_id].cracks++;
          if (d.defect_type === 'Pothole') defectsByTrip[d.trip_id].potholes++;
          
          const sevLevel = { 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
          if (sevLevel[d.severity] > sevLevel[defectsByTrip[d.trip_id].highestSeverity]) {
            defectsByTrip[d.trip_id].highestSeverity = d.severity;
          }
        });

        const formattedTrips = tripsArr.map(t => {
          const dt = new Date(t.start_time);
          const dStats = defectsByTrip[t.trip_id] || { cracks: 0, potholes: 0, highestSeverity: 'None' };
          
          return {
            id: t.trip_id,
            date: dt.toLocaleDateString(),
            time: dt.toLocaleTimeString(),
            driverName: t.metadata?.driver || 'Unknown Driver',
            streetName: t.metadata?.street || 'Unknown Street',
            zone: t.metadata?.zone || 'Unknown Zone',
            distanceKm: 'N/A', // Distance not calculated yet
            cracks: dStats.cracks,
            potholes: dStats.potholes,
            severity: dStats.highestSeverity,
            status: t.status || 'processing'
          };
        });

        setTripsData(formattedTrips);
      } catch (err) {
        console.error('Failed to load trips data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const filtered = tripsData.filter((t) => {
    const matchSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.streetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.zone.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Normalize status to match standard names
    let normStatus = 'processing';
    if (t.status === 'completed' || t.status === 'Analyzed') normStatus = 'completed';
    
    const filterStatus = statusFilter === 'Analyzed' ? 'completed' : 
                         statusFilter === 'Pending' ? 'processing' : statusFilter;
                         
    const matchStatus = filterStatus === 'All' || normStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Dashboard</span><span>/</span><span className="text-slate-300">Trips & Reports</span>
            </div>
            <h2 className="text-xl font-bold text-white">Trips & Reports</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{filtered.length} trips</span>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID, driver, street, zone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-light border border-surface-border text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {['All', 'Analyzed', 'Pending'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-light border border-surface-border text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Data Table */}
        <div className="glass-card rounded-2xl border border-surface-border overflow-hidden animate-fade-in">
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p>Loading trips from database...</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-surface-border bg-surface-light/50">
                    <th className="px-5 py-3.5">Trip ID</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Driver</th>
                    <th className="px-5 py-3.5">Zone / Street</th>
                    <th className="px-5 py-3.5">Distance</th>
                    <th className="px-5 py-3.5">
                      <span className="flex items-center gap-1">Defects <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-5 py-3.5">Severity</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((trip) => (
                    <tr key={trip.id} className="border-b border-surface-border/50 hover:bg-surface-hover/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">...{trip.id.slice(-8)}</td>
                      <td className="px-5 py-4">
                        <span className="text-slate-300">{trip.date}</span>
                        <span className="block text-[11px] text-slate-500">{trip.time}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300 font-medium">{trip.driverName}</td>
                      <td className="px-5 py-4">
                        <span className="text-slate-300">{trip.streetName}</span>
                        <span className="block text-[11px] text-slate-500">{trip.zone}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">{trip.distanceKm}</td>
                      <td className="px-5 py-4">
                        <span className="text-crack font-semibold">{trip.cracks}</span>
                        <span className="text-slate-600 mx-1">C</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-pothole font-semibold">{trip.potholes}</span>
                        <span className="text-slate-600 mx-1">P</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${SEVERITY_COLORS[trip.severity]}`}>
                          {trip.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[trip.status === 'completed' ? 'completed' : 'processing']}`}>
                          {trip.status === 'completed' ? 'Analyzed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => navigate(`/trips/${trip.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600/15 text-brand-400 hover:bg-brand-600/25 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Route className="w-10 h-10 mb-3 text-slate-600" />
                <p className="text-sm">No trips match your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
