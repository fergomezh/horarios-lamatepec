export default function StatCard({ title, value, unit, subtitle, icon, trend, trendValue, variant = 'default', progress, progressTarget }) {
  const variantStyles = {
    default: 'hover:border-secondary/30',
    error: 'hover:border-error/30',
    success: 'hover:border-success/30',
  }

  const progressColor = {
    default: 'bg-secondary',
    error: 'bg-error',
    success: 'bg-success',
  }

  return (
    <div className={`bg-primary/20 border border-primary-dark rounded p-6 shadow-card group transition-colors relative overflow-hidden ${variantStyles[variant]}`}>
      {variant === 'error' && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-error/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-xs font-bold tracking-widest text-white/60 uppercase">{title}</h3>
        <span className={`material-symbols-outlined ${variant === 'error' ? 'text-error' : 'text-white/30'}`}>
          {icon}
        </span>
      </div>

      {/* Value row — unit replaces the trend badge when provided */}
      <div className="flex items-baseline gap-2 relative z-10">
        <span className="font-serif text-[42px] font-bold text-white leading-none">{value}</span>
        {unit ? (
          // Static unit label — no trend icon or badge
          <span className="text-sm font-medium text-white/50 font-serif italic">{unit}</span>
        ) : trendValue && (
          // Trend badge (used by other cards)
          <span className={`text-sm font-medium flex items-center font-serif italic ${
            variant === 'error' ? 'text-error' : trend === 'up' ? 'text-success' : 'text-white/50'
          }`}>
            {trend === 'up' && (
              <span className="material-symbols-outlined text-[16px] mr-0.5 not-italic">trending_up</span>
            )}
            {trend === 'up' && !variant.includes('error') && (
              <span className="material-symbols-outlined text-[16px] mr-0.5 not-italic">check_circle</span>
            )}
            {trendValue}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <>
          <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${progressColor[variant]}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          {progressTarget && (
            <p className="text-xs text-white/50 mt-2">{progressTarget}</p>
          )}
        </>
      )}

      {subtitle && !progressTarget && (
        <p className="text-xs text-white/50 mt-2">{subtitle}</p>
      )}
    </div>
  )
}
