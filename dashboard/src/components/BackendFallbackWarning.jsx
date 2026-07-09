import { useState, useEffect } from 'react';
import { X, ServerCrash } from 'lucide-react';

export default function BackendFallbackWarning() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Prevent showing if already dismissed
    if (isDismissed) return;

    const checkBackendHealth = async () => {
      try {
        // Ping the backend health endpoint with a 3-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('http://127.0.0.1:8000/health', {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        // If the response is not OK (e.g., 500 error), assume backend is problematic
        if (!response.ok) {
          setIsVisible(true);
        }
      } catch (error) {
        // A network error, CORS failure, or AbortError (timeout) indicates the backend is completely unreachable
        setIsVisible(true);
      }
    };

    checkBackendHealth();
  }, [isDismissed]);

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-6 md:p-8 animate-in fade-in zoom-in duration-300">
        
        {/* Dismiss Button */}
        <button 
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
          aria-label="Dismiss warning"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center ring-4 ring-amber-500/20">
            <ServerCrash className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* Content Area */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Important Note for the Evaluation Panel
          </h2>
          
          <div className="text-slate-300 leading-relaxed text-left bg-slate-900/50 p-5 rounded-xl border border-slate-700 shadow-inner">
            <p className="font-semibold text-amber-400 mb-3 text-lg">Welcome to the RoadEye Dashboard!</p>
            <p className="mb-3 text-sm md:text-base text-slate-300">
              Please note that our cloud backend deployment is currently in progress. 
            </p>
            <p className="text-sm md:text-base text-slate-300">
              To test the full AI capabilities, kindly run the FastAPI backend locally on your machine while browsing this dashboard. Thank you for your time!
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setIsDismissed(true)}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            Acknowledge & Continue
          </button>
        </div>

      </div>
    </div>
  );
}
