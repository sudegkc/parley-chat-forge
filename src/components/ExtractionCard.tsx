import type { Campaign } from "@/lib/parley-types";

export function ExtractionCard({ data }: { data: Campaign }) {
  const rows: Array<[string, string | null]> = [
    ["Brand", data.brand],
    ["Product", data.product],
    ["Quantity", String(data.quantity)],
    ["Vibe", data.vibe.join(" · ")],
    ["Location", data.location],
    ["Expiry", data.expiry],
  ];
  return (
    <div className="animate-bubble-in w-full max-w-[280px] rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Extracted campaign
      </div>
      <div className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{k}</span>
            <span className={`text-right font-medium ${v ? "text-foreground" : "text-destructive"}`}>
              {v ?? "missing"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
