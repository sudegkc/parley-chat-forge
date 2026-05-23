import type { Campaign } from "@/lib/parley-types";

function formatExpiry(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return value;
}

export function ExtractionCard({ data }: { data: Campaign }) {
  const rows: Array<[string, string | null]> = [
    ["Brand", data.brand],
    ["Product", data.product],
    ["Quantity", data.quantity != null ? String(data.quantity) : null],
    ["Vibe", data.vibe.length ? data.vibe.join(" · ") : null],
    ["Audience", data.audience],
    ["Location", data.location],
    ["Expiry", formatExpiry(data.expiry)],
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
