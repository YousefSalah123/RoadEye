import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, User, Route, AlertTriangle, Zap, Play, Loader2
} from 'lucide-react';
import { getTripById, getDefects } from '../services/api';

import {
  MapContainer, TileLayer, CircleMarker, Popup, Polyline
} from 'react-leaflet';

const SEVERITY_DOT = {
  High: 'bg-crack',
  Medium: 'bg-warning',
  Low: 'bg-brand-400',
  None: 'bg-slate-500',
};

const SEVERITY_BADGE = {
  High: 'bg-crack/15 text-crack',
  Medium: 'bg-warning/15 text-warning',
  Low: 'bg-brand-500/15 text-brand-400',
  None: 'bg-slate-500/15 text-slate-400',
};

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchTripData() {
      try {
        const [tripRes, defectsRes] = await Promise.all([
          getTripById(tripId),
          getDefects(tripId)
        ]);

        if (cancelled) return;

        const defectsArr = defectsRes?.defects || defectsRes || [];
        
        const dt = new Date(tripRes.start_time);
        
        // Map the backend defects to the structure expected by the UI
        const mappedDefects = defectsArr.map(d => ({
          type: d.defect_type,
          time: new Date(d.detected_at || dt).toLocaleTimeString(),
          severity: d.severity || 'Medium',
          confidence: d.confidence_score || 0.8,
          lng: d.location?.coordinates[0] || 0,
          lat: d.location?.coordinates[1] || 0
        }));

        setTrip({
          id: tripRes.trip_id,
          date: dt.toLocaleDateString(),
          time: dt.toLocaleTimeString(),
          driverName: tripRes.metadata?.driver || 'Unknown Driver',
          streetName: tripRes.metadata?.street || 'Unknown Street',
          zone: tripRes.metadata?.zone || 'Unknown Zone',
          distanceKm: 'N/A',
          defects: mappedDefects,
          // Extract route points directly from the trip document if available
          route: tripRes.route || []
        });

      } catch (err) {
        console.error('Failed to fetch trip details:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTripData();
    return () => { cancelled = true; };
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p>Loading trip data from database...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-slate-400 text-lg">Trip not found or API error.</p>
        <button onClick={() => navigate('/trips')} className="mt-4 px-4 py-2 bg-surface-light border border-surface-border rounded-lg text-sm text-slate-300 hover:text-white transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  // Use the trip.route (GPS log) if available, otherwise fallback to defect points or default Cairo
  let routePoints = [];
  if (trip.route && trip.route.length > 0) {
    // trip.route is expected to be [ {lat, lng}, ... ] or [ [lng, lat], ... ]
    routePoints = trip.route.map(p => p.lat !== undefined ? [p.lat, p.lng] : [p[1], p[0]]);
  } else if (trip.defects && trip.defects.length > 0) {
    routePoints = trip.defects.map(d => [d.lat, d.lng]);
  } else {
    routePoints = [[30.0444, 31.2357]]; // Cairo fallback
  }
  
  const mapCenter = routePoints[0];

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/trips')} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-6 bg-surface-border" />
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <span>Dashboard</span><span>/</span><span>Trips</span><span>/</span><span className="text-slate-300 font-mono text-[10px]">...{trip.id.slice(-8)}</span>
            </div>
            <h2 className="text-lg font-bold text-white">Trip Report — {trip.streetName}, {trip.zone}</h2>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Meta cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: User, label: 'Driver', value: trip.driverName, color: 'text-brand-400' },
            { icon: MapPin, label: 'Zone', value: `${trip.zone} — ${trip.streetName}`, color: 'text-success' },
            { icon: Clock, label: 'Date', value: `${trip.date}  ${trip.time}`, color: 'text-warning' },
            { icon: Route, label: 'Distance', value: `${trip.distanceKm} km`, color: 'text-slate-300' },
          ].map((m, i) => (
            <div key={i} className="glass-card rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{m.label}</span>
              </div>
              <p className={`text-sm font-semibold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Split view */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left — Video Player */}
          <div className="xl:col-span-3 space-y-4">
            <div className="glass-card rounded-2xl border border-surface-border overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-slate-200">Video Recording</span>
              </div>
              {/* Actual Video playback */}
              <div className="relative aspect-video bg-black flex items-center justify-center">
                <video 
                  controls 
                  className="w-full h-full object-contain"
                  src={`http://127.0.0.1:8000/api/trips/${trip.id}/video`}
                  onError={(e) => {
                    // Fallback visually if video endpoint is not explicitly set up yet or video is missing
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                {/* Fallback overlay if video fails */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0c1425] to-[#0a1a2e]" style={{ display: 'none' }}>
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-surface-hover/50 flex items-center justify-center mx-auto mb-4 border border-surface-border">
                      <Play className="w-8 h-8 text-slate-400 ml-1" />
                    </div>
                    <p className="text-sm text-slate-400">Video playback for</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">...{trip.id.slice(-8)}.mp4</p>
                  </div>
                </div>
                {/* Timestamp watermark */}
                <div className="absolute top-3 right-4 px-2 py-1 rounded bg-black/70 text-[10px] text-slate-400 font-mono pointer-events-none">
                  {trip.date} {trip.time} — RoadEye Pro
                </div>
              </div>
            </div>

            {/* Mini route map */}
            <div className="glass-card rounded-2xl border border-surface-border overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
                <MapPin className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-slate-200">Route Map — {trip.streetName}</span>
              </div>
              <div className="relative h-48 bg-black z-0 overflow-hidden">
                <MapContainer 
                  center={mapCenter} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%', backgroundColor: '#000000' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {routePoints.length > 1 && (
                    <Polyline 
                      positions={routePoints} 
                      pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, className: '' }} 
                    />
                  )}
                  {trip.defects.map((d, i) => {
                    const isPothole = d.type === 'Pothole';
                    const color = isPothole ? '#ef4444' : '#06b6d4';
                    return (
                      <CircleMarker
                        key={i}
                        center={[d.lat, d.lng]}
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
                            <strong className="block text-sm mb-1">{d.type}</strong>
                            <span className="text-xs text-slate-500 block">Time: {d.time}</span>
                            <span className="text-xs text-slate-500 block">Confidence: {(d.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
                <div className="absolute bottom-3 left-4 flex items-center gap-4 px-3 py-1.5 rounded-lg glass-card z-[1000] shadow-xl">
                  <span className="flex items-center gap-1 text-[10px] text-slate-300"><span className="w-2 h-2 rounded-full bg-pothole shadow-[0_0_8px_rgba(239,68,68,0.8)]" />Pothole</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-300"><span className="w-2 h-2 rounded-full bg-crack shadow-[0_0_8px_rgba(6,182,212,0.8)]" />Crack</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Defect Timeline */}
          <div className="xl:col-span-2">
            <div className="glass-card rounded-2xl border border-surface-border overflow-hidden h-full">
              <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-crack" />
                  <span className="text-sm font-semibold text-slate-200">Detection Timeline</span>
                </div>
                <span className="text-xs text-slate-500">{trip.defects.length} events</span>
              </div>
              <div className="p-4 space-y-0 max-h-[600px] overflow-y-auto">
                {trip.defects.length === 0 ? (
                  <div className="text-center text-slate-500 py-10 text-sm">No defects detected in this trip.</div>
                ) : (
                  trip.defects.map((d, i) => (
                    <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Timeline line */}
                      {i < trip.defects.length - 1 && (
                        <div className="absolute left-[11px] top-7 bottom-0 w-px bg-surface-border" />
                      )}
                      {/* Dot */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${d.type === 'Pothole' ? 'bg-pothole/20' : 'bg-crack/20'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${SEVERITY_DOT[d.severity]}`} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 bg-surface-light/50 rounded-xl p-3 border border-surface-border/50 hover:border-surface-border transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-slate-400">{d.time}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${SEVERITY_BADGE[d.severity]}`}>
                            {d.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                          {d.type === 'Pothole' ? <Zap className="w-3.5 h-3.5 text-pothole" /> : <AlertTriangle className="w-3.5 h-3.5 text-crack" />}
                          {d.type} Detected
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Confidence: <span className="text-slate-300 font-semibold">{(d.confidence * 100).toFixed(0)}%</span>
                          <span className="mx-2">•</span>
                          GPS: {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
