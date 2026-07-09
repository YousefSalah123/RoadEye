import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Loader2 } from 'lucide-react';
import { getDefects } from '../services/api';

// ─── Cairo, Egypt — default map center ───
const CAIRO_CENTER = [30.0444, 31.2357];
const DEFAULT_ZOOM = 11;

// ─── Defect type → color mapping ───
const TYPE_COLORS = {
  Pothole: '#ef4444',  // Red
  Crack:   '#06b6d4',  // Cyan
};

// ─── Severity → marker radius mapping ───
const SEVERITY_RADIUS = {
  High:   10,
  Medium: 7,
  Low:    5,
};

// ─── Severity → badge color mapping ───
const SEVERITY_COLORS = {
  High:   { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' },
  Medium: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' },
  Low:    { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.4)' },
};

/**
 * CityMap — Interactive defect map centered on Cairo.
 * Fetches live defect data from the backend API.
 * Renders color-coded CircleMarkers with detailed popups.
 */
export default function CityMap() {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchDefects() {
      try {
        const data = await getDefects();
        if (!cancelled) {
          // API returns { defects: [...] } or just an array
          const items = data?.defects || data || [];
          setDefects(items);
          setError(false);
        }
      } catch (err) {
        console.error('Failed to fetch defects from API:', err);
        if (!cancelled) {
          setDefects([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDefects();
    return () => { cancelled = true; };
  }, []);

  // ─── Helper: extract lat/lng from defect ───
  const getPosition = (defect) => {
    if (defect.location?.coordinates) {
      // GeoJSON: [lng, lat]
      return [defect.location.coordinates[1], defect.location.coordinates[0]];
    }
    if (defect.lat && defect.lng) {
      return [defect.lat, defect.lng];
    }
    return null;
  };

  const API_BASE = 'http://127.0.0.1:8000';

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-2xl border border-gray-800">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
      {error && (
        <div className="absolute top-4 left-4 z-[1000] bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm backdrop-blur-md font-medium">
          ⚠️ API offline: Unable to load defects
        </div>
      )}

      <MapContainer
        center={CAIRO_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', backgroundColor: '#f8fafc' }} 
      >
        {/* Light & Colorful CartoDB map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {defects.map((defect) => {
          const pos = getPosition(defect);
          if (!pos) return null;

          const typeColor = TYPE_COLORS[defect.defect_type] || '#ffffff';
          const sevStyle = SEVERITY_COLORS[defect.severity] || SEVERITY_COLORS.Medium;
          const radius = SEVERITY_RADIUS[defect.severity] || 7;

          return (
            <CircleMarker
              key={defect.defect_id || Math.random().toString()}
              center={pos}
              pathOptions={{
                color: typeColor,
                fillColor: typeColor,
                fillOpacity: 0.7,
                weight: 2,
              }}
              radius={radius}
            >
              <Popup className="roadeye-popup">
                <div className="p-1 min-w-[200px]">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-100 text-lg">
                      {defect.defect_type}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: sevStyle.bg,
                        color: sevStyle.text,
                        border: `1px solid ${sevStyle.border}`
                      }}
                    >
                      {defect.severity}
                    </span>
                  </div>

                  {/* Defect Image (if available) */}
                  {defect.image_path && (
                    <div className="mb-3 rounded overflow-hidden border border-gray-700 bg-black">
                      <img
                        src={`${API_BASE}${defect.image_path}`}
                        alt={defect.defect_type}
                        className="w-full h-32 object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-400">Confidence:</div>
                    <div className="text-gray-200 font-medium text-right">
                      {defect.confidence_score ? (defect.confidence_score * 100).toFixed(1) : 'N/A'}%
                    </div>

                    <div className="text-gray-400">Coordinates:</div>
                    <div className="text-gray-200 font-medium text-right font-mono text-xs">
                      {pos[0].toFixed(4)}, {pos[1].toFixed(4)}
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
