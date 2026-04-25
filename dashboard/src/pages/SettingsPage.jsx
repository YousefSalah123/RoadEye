import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div>
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-300">Settings</span>
          </div>
          <h2 className="text-xl font-bold text-white">System Settings</h2>
        </div>
      </header>

      <div className="p-8 max-w-4xl space-y-6">
        {/* Settings Card */}
        <div className="glass-card rounded-2xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border flex items-center gap-2 bg-surface-light/50">
            <SettingsIcon className="w-5 h-5 text-brand-400" />
            <h3 className="font-bold text-white">General Preferences</h3>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Municipality / Region Name</label>
              <input
                type="text"
                defaultValue="Greater Cairo Municipality"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">AI Detection Confidence Threshold</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="99"
                  defaultValue="85"
                  className="flex-1 accent-brand-500"
                />
                <span className="w-12 text-center text-sm font-mono text-slate-400 bg-surface-light px-2 py-1 rounded border border-surface-border">
                  85%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Only defects with a confidence score above this threshold will be flagged as critical.
              </p>
            </div>
            
            <div className="pt-4 border-t border-surface-border flex justify-end">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/20">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
