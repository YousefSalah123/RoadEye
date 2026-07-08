import React, { useState, useRef } from 'react';
import { Camera, Video, UploadCloud, AlertTriangle, Zap, CheckCircle, Activity, Image as ImageIcon, Film, Download } from 'lucide-react';
import { detectImage, uploadTripDashboard, getTripStatus, getTripById } from '../services/api';

const CLASS_MAP = {
  0: { label: 'Crack', color: '#06b6d4', severity: 'Medium' }, // Neon Cyan
  1: { label: 'Pothole', color: '#ef4444', severity: 'High' }  // Bright Red
};

export default function ManualAnalysisPage() {
  const [activeMode, setActiveMode] = useState('image');
  
  // Image State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageResults, setImageResults] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Video State
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoResults, setVideoResults] = useState(null);

  // Common State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setError(null);
    setIsProcessing(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (activeMode === 'image') {
      setImageFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setImageResults(null);
      setImageDimensions({ width: 0, height: 0 });
    } else {
      setVideoFile(selectedFile);
      setVideoPreview(URL.createObjectURL(selectedFile));
      setVideoResults(null);
    }
    setError(null);
  };

  const handleImageLoad = (e) => {
    setImageDimensions({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
  };

  const handleAnalyze = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      if (activeMode === 'image') {
        if (!imageFile) {
          setIsProcessing(false);
          return;
        }
        if (imageFile.type.startsWith('video/')) {
          setError('Invalid file type: You uploaded a video in Image mode. Please switch to Video mode.');
          setIsProcessing(false);
          return;
        }
        setProgress(50);
        const response = await detectImage(imageFile);
        setProgress(100);
        const mappedResults = response.detections.map((det) => ({
          ...det,
          ...(CLASS_MAP[det.class_id] || { label: 'Unknown', color: '#FFFFFF', severity: 'Unknown' })
        }));
        setImageResults(mappedResults);
        setIsProcessing(false);
      } else if (activeMode === 'video') {
        if (!videoFile) {
          setIsProcessing(false);
          return;
        }
        if (videoFile.type.startsWith('image/')) {
          setError('Invalid file type: You uploaded an image in Video mode. Please switch to Image mode.');
          setIsProcessing(false);
          return;
        }
        
        setProgress(0);
        const uploadResponse = await uploadTripDashboard(videoFile);
        const tripId = uploadResponse.trip_id;

        progressIntervalRef.current = setInterval(async () => {
          try {
            const statusData = await getTripStatus(tripId);
            setProgress(statusData.progress || 0);

            if (statusData.status === 'completed') {
              clearInterval(progressIntervalRef.current);
              const tripDetails = await getTripById(tripId);
              if (tripDetails.analyzed_video_url) {
                setVideoResults(`http://localhost:8000${tripDetails.analyzed_video_url}`);
              }
              setIsProcessing(false);
            } else if (statusData.status === 'failed') {
              clearInterval(progressIntervalRef.current);
              setError("Processing failed on the server.");
              setIsProcessing(false);
            }
          } catch (err) {
            console.error('Polling error', err);
          }
        }, 2000);
      }
    } catch (err) {
      clearInterval(progressIntervalRef.current);
      console.error('Full analysis error:', err);
      let errorMessage = err.message || "An unknown error occurred while connecting.";
      
      if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            errorMessage = json.detail || errorMessage;
          } catch (e) {
            errorMessage = "Server returned an error in an unreadable format.";
          }
        } else {
          errorMessage = err.response.data.detail || errorMessage;
        }
      }
      setError(`Error: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  const currentFile = activeMode === 'image' ? imageFile : videoFile;
  const currentPreview = activeMode === 'image' ? imagePreview : videoPreview;

  return (
    <div>
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Dashboard</span><span>/</span><span className="text-slate-300">Manual Analysis</span>
            </div>
            <h2 className="text-xl font-bold text-white">Manual Analysis Tool</h2>
          </div>
          
          <div className="flex p-1 rounded-xl bg-surface-light border border-surface-border">
            <button
              onClick={() => handleModeChange('image')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMode === 'image'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface'
              }`}
            >
              <Camera className="w-4 h-4" />
              Image
            </button>
            <button
              onClick={() => handleModeChange('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMode === 'video'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface'
              }`}
            >
              <Video className="w-4 h-4" />
              Video
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Upload */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-surface-border animate-slide-up">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-brand-400" />
                Upload {activeMode === 'image' ? 'Image' : 'Video'} Evidence
              </h3>
              
              <div 
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all min-h-[300px] ${
                  currentPreview ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-border bg-surface-light hover:border-brand-500/30 hover:bg-brand-500/5'
                }`}
              >
                {currentPreview ? (
                  activeMode === 'image' ? (
                    <div className="w-full flex items-center justify-center">
                      <div className="relative inline-block">
                        <img 
                          src={currentPreview} 
                          alt="Upload preview" 
                          className="max-h-[300px] object-contain rounded-lg block" 
                          onLoad={handleImageLoad}
                        />
                        {imageResults && imageDimensions.width > 0 && imageResults.map((det, idx) => {
                          if (!det.bounding_box) return null;
                          const { x_min, y_min, x_max, y_max } = det.bounding_box;
                          const left = (x_min / imageDimensions.width) * 100;
                          const top = (y_min / imageDimensions.height) * 100;
                          const width = ((x_max - x_min) / imageDimensions.width) * 100;
                          const height = ((y_max - y_min) / imageDimensions.height) * 100;

                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'absolute',
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                                border: `2px solid ${det.color}`,
                                pointerEvents: 'none'
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: '-2px',
                                  backgroundColor: det.color,
                                  color: '#000',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  padding: '2px 6px',
                                  whiteSpace: 'nowrap',
                                  borderTopLeftRadius: '4px',
                                  borderTopRightRadius: '4px',
                                }}
                              >
                                {det.label} {(det.confidence_score * 100).toFixed(0)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center">
                      <video src={currentPreview} controls className="max-h-[300px] rounded-lg border border-surface-border" />
                    </div>
                  )
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-surface mb-4 flex items-center justify-center mx-auto border border-surface-border">
                      {activeMode === 'image' ? (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      ) : (
                        <Film className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-300 mb-1">Click or drag {activeMode} to upload</p>
                    <p className="text-xs text-slate-500">
                      {activeMode === 'image' ? 'Supports JPG, PNG, WEBP' : 'Supports MP4, AVI, MOV'}
                    </p>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept={activeMode === 'image' ? "image/*" : "video/*"}
                  onChange={handleFileChange}
                />
              </div>

              {currentFile && (
                <div className="mt-6">
                  <button 
                    onClick={handleAnalyze} 
                    disabled={isProcessing}
                    className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Activity className="w-5 h-5 animate-spin" />
                        Analyzing AI Model...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Run AI Analysis
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-surface-border animate-slide-up h-full" style={{ animationDelay: '100ms' }}>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Detection Results
              </h3>

              {!currentFile && !isProcessing && (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-surface-border rounded-xl bg-surface-light/50">
                  Upload {activeMode === 'image' ? 'an image' : 'a video'} and run analysis to see results here.
                </div>
              )}

              {isProcessing && (
                <div className="h-[300px] flex flex-col items-center justify-center text-brand-400 space-y-6 px-12">
                  <Activity className="w-10 h-10 animate-spin opacity-50" />
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                      <span>Running YOLOv8 Model...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-light border border-surface-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-500 transition-all duration-1000 ease-out relative"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isProcessing && activeMode === 'image' && imageResults && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 bg-surface-light rounded-xl p-4 border border-surface-border">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Found</p>
                      <p className="text-2xl font-bold text-white">{imageResults.length}</p>
                    </div>
                    <div className="flex-1 bg-surface-light rounded-xl p-4 border border-surface-border">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Avg Confidence</p>
                      <p className="text-2xl font-bold text-brand-400">
                        {imageResults.length > 0 
                          ? (imageResults.reduce((acc, curr) => acc + curr.confidence_score, 0) / imageResults.length * 100).toFixed(1) + '%'
                          : '0%'}
                      </p>
                    </div>
                  </div>

                  {imageResults.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-surface-light rounded-xl border border-surface-border">
                      No road damage detected in this image.
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto pr-2 max-h-[350px] custom-scrollbar">
                      {imageResults.map((det, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-surface-light border border-surface-border/50 hover:bg-surface transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: det.color, boxShadow: `0 0 10px ${det.color}` }} />
                            <div>
                              <p className="text-sm font-bold text-white">{det.label}</p>
                              <p className="text-xs text-slate-500">Confidence: {(det.confidence_score * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" 
                              style={{ 
                                color: det.color, 
                                backgroundColor: `${det.color}20`,
                                border: `1px solid ${det.color}40`
                              }}>
                              {det.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isProcessing && activeMode === 'video' && videoResults && (
                <div className="space-y-6">
                  <div className="w-full flex flex-col items-center justify-center">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Film className="w-4 h-4 text-brand-400" />
                      Processed Video
                    </h4>
                    <video 
                      src={videoResults} 
                      controls 
                      className="w-full max-h-[500px] rounded-xl border border-surface-border shadow-lg shadow-brand-500/10" 
                    />
                    <div className="mt-6 w-full flex justify-end">
                      <a
                        href={videoResults}
                        download={`processed_${videoFile?.name || 'video.mp4'}`}
                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
                      >
                        <Download className="w-4 h-4" />
                        Download Results
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
