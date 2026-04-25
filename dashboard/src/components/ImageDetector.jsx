import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Loader2, X, ImageIcon, ZoomIn } from 'lucide-react';
import { detectImage } from '../services/api';
import { drawDetections, clearCanvas } from '../utils/drawUtils';

export default function ImageDetector({ onDetectionResult }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [originalSize, setOriginalSize] = useState({ w: 0, h: 0 });

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Handle file selection ───
  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, etc.)');
      return;
    }

    setFile(selectedFile);
    setDetections([]);
    setError(null);

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Get the original image dimensions before display
    const tempImg = new window.Image();
    tempImg.onload = () => {
      setOriginalSize({ w: tempImg.naturalWidth, h: tempImg.naturalHeight });
    };
    tempImg.src = url;
  }, []);

  // ─── Cleanup object URL ───
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  // ─── Run detection ───
  const runDetection = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDetections([]);

    try {
      const data = await detectImage(file);
      setDetections(data.detections || []);
      onDetectionResult?.(data.detections || []);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        'Detection failed. Is the backend running?';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Auto-detect on upload ───
  useEffect(() => {
    if (file && originalSize.w > 0) {
      runDetection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, originalSize]);

  // ─── Draw on canvas whenever detections or image size changes ───
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || detections.length === 0) return;

    const draw = () => {
      const displayedW = img.clientWidth;
      const displayedH = img.clientHeight;

      canvas.width = displayedW;
      canvas.height = displayedH;

      const scaleX = displayedW / originalSize.w;
      const scaleY = displayedH / originalSize.h;

      const ctx = canvas.getContext('2d');
      clearCanvas(ctx, canvas);
      drawDetections(ctx, detections, scaleX, scaleY);
    };

    // Small timeout to ensure the image has rendered
    const timer = setTimeout(draw, 50);
    window.addEventListener('resize', draw);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', draw);
    };
  }, [detections, originalSize]);

  // ─── Reset ───
  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setDetections([]);
    setError(null);
    setOriginalSize({ w: 0, h: 0 });
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      clearCanvas(ctx, canvasRef.current);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Upload Area ─── */}
      {!previewUrl ? (
        <div
          id="image-dropzone"
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
              {dragActive ? 'Drop image here' : 'Drag & drop an image'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              or <span className="text-brand-400 hover:underline">click to browse</span> — JPG,
              PNG, WebP
            </p>
          </div>
          <input
            ref={fileInputRef}
            id="image-file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <>
          {/* ─── Image + Canvas Overlay ─── */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl glass-card border border-surface-border"
          >
            {/* Action bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300 truncate max-w-[240px]">
                  {file?.name}
                </span>
                <span className="text-xs text-slate-500">
                  {originalSize.w}×{originalSize.h}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                {detections.length > 0 && (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-brand-600/20 text-brand-400">
                    {detections.length} detection{detections.length !== 1 && 's'}
                  </span>
                )}
                <button
                  id="image-reset-btn"
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            {/* Image container */}
            <div className="relative flex items-center justify-center bg-black/30 max-h-[70vh]">
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Uploaded for detection"
                className="block max-w-full max-h-[70vh] object-contain"
                onLoad={() => {
                  // Re-trigger canvas draw when image loads
                  if (detections.length > 0 && imgRef.current) {
                    const canvas = canvasRef.current;
                    const displayedW = imgRef.current.clientWidth;
                    const displayedH = imgRef.current.clientHeight;
                    canvas.width = displayedW;
                    canvas.height = displayedH;
                    const scaleX = displayedW / originalSize.w;
                    const scaleY = displayedH / originalSize.h;
                    const ctx = canvas.getContext('2d');
                    clearCanvas(ctx, canvas);
                    drawDetections(ctx, detections, scaleX, scaleY);
                  }
                }}
              />

              {/* Overlay canvas — positioned exactly on top of the image */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/70 backdrop-blur-sm">
                  <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-300">Analyzing image…</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Detection Results Table ─── */}
          {detections.length > 0 && (
            <div className="glass-card rounded-2xl border border-surface-border overflow-hidden animate-slide-up">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-border">
                <ZoomIn className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-slate-200">Detection Details</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-surface-border">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Confidence</th>
                      <th className="px-5 py-3">Bounding Box</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detections.map((det, i) => (
                      <tr
                        key={i}
                        className="border-b border-surface-border/50 hover:bg-surface-hover/30 transition-colors"
                      >
                        <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                              ${det.class_id === 0 ? 'bg-crack/15 text-crack' : 'bg-pothole/15 text-pothole'}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${det.class_id === 0 ? 'bg-crack' : 'bg-pothole'}`}
                            />
                            {det.class_id === 0 ? 'Crack' : 'Pothole'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-300">
                          {(det.confidence_score * 100).toFixed(1)}%
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          ({det.bounding_box.x_min}, {det.bounding_box.y_min}) → (
                          {det.bounding_box.x_max}, {det.bounding_box.y_max})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Error Toast ─── */}
      {error && (
        <div
          id="error-toast"
          className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-xl bg-red-950/90 border border-red-800/50 text-red-200 max-w-md shadow-2xl toast-enter"
        >
          <X className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold">Detection Failed</p>
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
