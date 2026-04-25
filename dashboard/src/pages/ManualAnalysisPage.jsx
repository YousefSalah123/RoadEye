import { useState, useCallback } from 'react';
import { Camera, Video } from 'lucide-react';
import DashboardStats from '../components/DashboardStats';
import ImageDetector from '../components/ImageDetector';
import VideoDetector from '../components/VideoDetector';

export default function ManualAnalysisPage() {
  const [activeMode, setActiveMode] = useState('image');
  const [stats, setStats] = useState({
    cracks: 0,
    potholes: 0,
    totalScans: 0,
    avgConfidence: 0,
  });

  const [allConfidences, setAllConfidences] = useState([]);

  const handleDetectionResult = useCallback((detections) => {
    if (!detections || detections.length === 0) return;

    const newCracks = detections.filter((d) => d.class_id === 0).length;
    const newPotholes = detections.filter((d) => d.class_id === 1).length;
    const confidences = detections.map((d) => d.confidence_score);

    setAllConfidences((prev) => {
      const updated = [...prev, ...confidences];
      const avg = updated.reduce((a, b) => a + b, 0) / updated.length;

      setStats((s) => ({
        cracks: s.cracks + newCracks,
        potholes: s.potholes + newPotholes,
        totalScans: s.totalScans + 1,
        avgConfidence: Math.round(avg * 100),
      }));

      return updated;
    });
  }, []);

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Dashboard</span><span>/</span><span className="text-slate-300">Manual Analysis</span>
            </div>
            <h2 className="text-xl font-bold text-white">Manual Analysis Tool</h2>
          </div>
          
          {/* Mode toggle */}
          <div className="flex p-1 rounded-xl bg-surface-light border border-surface-border">
            <button
              onClick={() => setActiveMode('image')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMode === 'image'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              Image
            </button>
            <button
              onClick={() => setActiveMode('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMode === 'video'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-4 h-4" />
              Video
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="glass-card rounded-2xl border border-surface-border p-5">
          <p className="text-sm text-slate-400">
            Use this legacy tool to manually upload images or video files from your computer to run the YOLOv8 AI detection model over them locally.
          </p>
        </div>

        <DashboardStats stats={stats} />

        <div className="animate-slide-up">
          {activeMode === 'image' ? (
            <ImageDetector onDetectionResult={handleDetectionResult} />
          ) : (
            <VideoDetector onDetectionResult={handleDetectionResult} />
          )}
        </div>
      </div>
    </div>
  );
}
