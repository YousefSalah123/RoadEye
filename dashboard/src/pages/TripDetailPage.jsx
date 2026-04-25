import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, User, Route, AlertTriangle, Zap, Play,
} from 'lucide-react';
import { MOCK_TRIPS } from '../data/mockData';

import {
  MapContainer, TileLayer, CircleMarker, Popup, Polyline
} from 'react-leaflet';

const SEVERITY_DOT = {
  Critical: 'bg-pothole',
  High: 'bg-crack',
  Medium: 'bg-warning',
  Low: 'bg-brand-400',
};

const SEVERITY_BADGE = {
  Critical: 'bg-pothole/15 text-pothole',
  High: 'bg-crack/15 text-crack',
  Medium: 'bg-warning/15 text-warning',
  Low: 'bg-brand-500/15 text-brand-400',
};

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const trip = MOCK_TRIPS.find((t) => t.id === tripId);

  if (!trip) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Trip not found.</p>
      </div>
    );
  }

  // Create route coordinates
  const routePoints = trip.defects.length > 0 
    ? trip.defects.map((d) => [d.lat, d.lng])
    : [[trip.lat, trip.lng]];
  
  // Center map on the first defect or trip start
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
              <span>Dashboard</span><span>/</span><span>Trips</span><span>/</span><span className="text-slate-300">{trip.id}</span>
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
              {/* Video placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-[#0c1425] to-[#0a1a2e] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-surface-hover/50 flex items-center justify-center mx-auto mb-4 border border-surface-border">
                    <Play className="w-8 h-8 text-slate-400 ml-1" />
                  </div>
                  <p className="text-sm text-slate-400">Video playback for</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{trip.id}.mp4</p>
                </div>
                {/* Timestamp watermark */}
                <div className="absolute bottom-3 left-4 px-2 py-1 rounded bg-black/70 text-[10px] text-slate-400 font-mono">
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
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {trip.defects.length > 1 && (
                    <Polyline 
                      positions={routePoints} 
                      pathOptions={{ color: '#06b6d4', weight: 4, opacity: 0.8, dashArray: '8 4', className: 'glow-crack' }} 
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
                {trip.defects.map((d, i) => (
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
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
