interface Stat {
  label: string;
  value: string | number;
}

export function ScoreBoard({ stats }: { stats: Stat[] }) {
  return (
    <div className={`grid gap-3 ${stats.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="glass px-4 py-3 text-center">
          <p className="font-display text-xl font-bold text-gold-300 sm:text-2xl">
            {stat.value}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted2">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
