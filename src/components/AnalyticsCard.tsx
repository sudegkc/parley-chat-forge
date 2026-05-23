import type { Analytics } from "@/lib/parley-types";

export function AnalyticsCard({ data }: { data: Analytics }) {
  const pct = Math.round((data.claimed / data.total) * 100);
  return (
    <div className="animate-bubble-in w-full max-w-[280px] rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Campaign analytics
      </div>
      <div className="mb-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-foreground">
            {data.claimed}
            <span className="text-sm text-muted-foreground">/{data.total}</span>
          </span>
          <span className="text-xs text-muted-foreground">{pct}% claimed</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Top areas</span>
          <span className="font-medium">{data.topAreas.join(", ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Avg claim time</span>
          <span className="font-medium">{data.avgClaimMinutes} min</span>
        </div>
      </div>
    </div>
  );
}
