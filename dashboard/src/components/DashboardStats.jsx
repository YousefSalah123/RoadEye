import { AlertTriangle, Zap, ScanLine, TrendingUp } from 'lucide-react';

const STAT_CARDS = [
  {
    id: 'cracks',
    key: 'cracks',
    label: 'Cracks Detected',
    icon: AlertTriangle,
    colorClass: 'text-crack',
    glowClass: 'glow-crack',
    bgClass: 'bg-crack/10',
    borderClass: 'border-crack/20',
  },
  {
    id: 'potholes',
    key: 'potholes',
    label: 'Potholes Detected',
    icon: Zap,
    colorClass: 'text-pothole',
    glowClass: 'glow-pothole',
    bgClass: 'bg-pothole/10',
    borderClass: 'border-pothole/20',
  },
  {
    id: 'totalScans',
    key: 'totalScans',
    label: 'Total Scans',
    icon: ScanLine,
    colorClass: 'text-brand-400',
    glowClass: 'glow-brand',
    bgClass: 'bg-brand-500/10',
    borderClass: 'border-brand-500/20',
  },
  {
    id: 'avgConfidence',
    key: 'avgConfidence',
    label: 'Avg. Confidence',
    icon: TrendingUp,
    colorClass: 'text-success',
    glowClass: '',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/20',
    suffix: '%',
  },
];

export default function DashboardStats({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_CARDS.map((card, index) => {
        const Icon = card.icon;
        const value = stats[card.key] ?? 0;
        const display = card.suffix ? `${value}${card.suffix}` : value;

        return (
          <div
            key={card.id}
            id={`stat-${card.id}`}
            className={`glass-card rounded-2xl p-5 border ${card.borderClass} ${card.glowClass}
              animate-slide-up transition-transform duration-200 hover:scale-[1.02]`}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                {card.label}
              </span>
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-xl ${card.bgClass}`}
              >
                <Icon className={`w-4.5 h-4.5 ${card.colorClass}`} />
              </div>
            </div>
            <p className={`text-3xl font-extrabold tracking-tight ${card.colorClass}`}>
              {display}
            </p>
          </div>
        );
      })}
    </div>
  );
}
