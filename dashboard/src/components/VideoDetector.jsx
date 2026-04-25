import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Loader2, X, Video, Play, Pause, Square } from 'lucide-react';
import { detectImage } from '../services/api';
import { drawDetections, clearCanvas } from '../utils/drawUtils';

export default function VideoDetector({ onDetectionResult }) {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [currentDetections, setCurrentDetections] = useState([]);

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);
  const abortRef = useRef(false);

  // ─── Handle file selection ───
  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile || !selectedFile.type.startsWith('video/')) {
      setError('Please upload a valid video file (MP4, WebM, etc.)');
      return;
    }

    // Cleanup previous
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setFile(selectedFile);
    setError(null);
    setIsPlaying(false);
    setIsProcessing(false);
    setFrameCount(0);
    setCurrentDetections([]);
    abortRef.current = false;

    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);
  }, [videoUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current = true;
    };
  }, [videoUrl]);

  // ─── Drag & Drop ───
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  // ─── Capture a frame and send to API ───
  const captureAndDetect = useCallback(async () => {
    const video = videoRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (!video || !hiddenCanvas || !overlayCanvas || video.paused || video.ended) return;
    if (abortRef.current) return;

    // Capture frame to hidden canvas at original video resolution
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    hiddenCanvas.width = vw;
    hiddenCanvas.height = vh;

    const hCtx = hiddenCanvas.getContext('2d');
    hCtx.drawImage(video, 0, 0, vw, vh);

    // Convert to blob
    const blob = await new Promise((resolve) =>
      hiddenCanvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    if (!blob || abortRef.current) return;

    const frameFile = new File([blob], 'frame.jpg', { type: 'image/jpeg' });

    try {
      const data = await detectImage(frameFile);
      if (abortRef.current) return;

      const dets = data.detections || [];
      setCurrentDetections(dets);
      setFrameCount((c) => c + 1);

      // Draw on overlay canvas
      const displayedW = video.clientWidth;
      const displayedH = video.clientHeight;
      overlayCanvas.width = displayedW;
      overlayCanvas.height = displayedH;

      const scaleX = displayedW / vw;
      const scaleY = displayedH / vh;
      const ctx = overlayCanvas.getContext('2d');
      clearCanvas(ctx, overlayCanvas);

      if (dets.length > 0) {
        drawDetections(ctx, dets, scaleX, scaleY);
      }

      // Bubble up to parent stats
      onDetectionResult?.(dets);
    } catch (err) {
      // Silently ignore frame errors to avoid spamming — video continues
      console.warn('Frame detection error:', err.message);
    }
  }, [onDetectionResult]);

  // ─── Start / Stop processing loop ───
  const startProcessing = useCallback(() => {
    if (!videoRef.current) return;

    abortRef.current = false;
    videoRef.current.play();
    setIsPlaying(true);
    setIsProcessing(true);

    // Capture frame every 200ms (5 FPS)
    intervalRef.current = setInterval(() => {
      captureAndDetect();
    }, 200);
  }, [captureAndDetect]);

  const stopProcessing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    abortRef.current = true;
    setIsProcessing(false);

    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isProcessing) {
      stopProcessing();
    } else {
      startProcessing();
    }
  }, [isProcessing, startProcessing, stopProcessing]);

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      stopProcessing();
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [videoUrl, stopProcessing]);

  // ─── Reset ───
  const reset = () => {
    stopProcessing();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setCurrentDetections([]);
    setFrameCount(0);
    setError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Upload Area ─── */}
      {!videoUrl ? (
        <div
          id="video-dropzone"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 p-16 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
            ${
              dragActive
                ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
                : 'border-surface-border hover:border-slate-500 hover:bg-surface-light/50'
            }`}
        >
          <div
            className={`flex items-center justify-center w-16 h-16 rounded-2xl transition-colors duration-300
              ${dragActive ? 'bg-brand-600/20' : 'bg-surface-hover'}`}
          >
            <Upload
              className={`w-7 h-7 transition-colors ${dragActive ? 'text-brand-400' : 'text-slate-400'}`}
            />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-200">
              {dragActive ? 'Drop video here' : 'Drag & drop a video'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              or <span className="text-brand-400 hover:underline">click to browse</span> — MP4,
              WebM
            </p>
          </div>
          <input
            ref={fileInputRef}
            id="video-file-input"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <>
          {/* ─── Video Player + Overlay ─── */}
          <div className="glass-card rounded-2xl border border-surface-border overflow-hidden">
            {/* Action bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300 truncate max-w-[240px]">
                  {file?.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isProcessing && (
                  <div className="flex items-center gap-2">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-success" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-success" />
                    </span>
                    <span className="text-xs font-medium text-success">
                      Processing @ 5 FPS
                    </span>
                  </div>
                )}
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-600/20 text-brand-400">
                  {frameCount} frames
                </span>
                <button
                  id="video-reset-btn"
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            {/* Video container */}
            <div className="relative flex items-center justify-center bg-black/30">
              <video
                ref={videoRef}
                src={videoUrl}
                className="block max-w-full max-h-[65vh] object-contain"
                playsInline
                muted
              />

              {/* Detection overlay canvas */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ maxWidth: '100%', maxHeight: '65vh' }}
              />

              {/* Hidden canvas for frame capture */}
              <canvas ref={hiddenCanvasRef} className="hidden" />
            </div>

            {/* Controls bar */}
            <div className="flex items-center justify-center gap-4 px-5 py-4 border-t border-surface-border">
              <button
                id="video-play-btn"
                onClick={togglePlayPause}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                  ${
                    isProcessing
                      ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30'
                      : 'bg-brand-600 text-white hover:bg-brand-500 glow-brand'
                  }`}
              >
                {isProcessing ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Stop Detection
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Detection
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ─── Live Detection Feed ─── */}
          {currentDetections.length > 0 && (
            <div className="glass-card rounded-2xl border border-surface-border p-5 animate-slide-up">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">
                Current Frame — {currentDetections.length} detection
                {currentDetections.length !== 1 && 's'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentDetections.map((det, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                      ${det.class_id === 0 ? 'bg-crack/15 text-crack' : 'bg-pothole/15 text-pothole'}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${det.class_id === 0 ? 'bg-crack' : 'bg-pothole'}`}
                    />
                    {det.class_id === 0 ? 'Crack' : 'Pothole'}{' '}
                    {(det.confidence_score * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Error Toast ─── */}
      {error && (
        <div
          id="video-error-toast"
          className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-xl bg-red-950/90 border border-red-800/50 text-red-200 max-w-md shadow-2xl toast-enter"
        >
          <X className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold">Video Error</p>
            <p className="mt-1 text-xs text-red-300/80">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
