import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Reward } from "@/lib/parley-types";

type Props = { reward: Reward; claimed?: boolean; onClaim?: () => void };

export function QRRewardCard({ reward, claimed, onClaim }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, `parley://r/${reward.code}`, {
      width: 160,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(() => setReady(true));
  }, [reward.code]);

  return (
    <div className="animate-bubble-in w-[260px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-primary px-4 py-2.5 text-primary-foreground">
        <div className="text-[10px] uppercase tracking-[0.15em] opacity-70">Parley reward</div>
        <div className="text-sm font-semibold">{reward.brand}</div>
      </div>
      <div className="flex flex-col items-center gap-2 px-4 py-4">
        <div className="text-xs text-muted-foreground">{reward.product}</div>
        <div className={`relative rounded-lg border border-border bg-white p-2 ${claimed ? "opacity-30" : ""}`}>
          <canvas ref={ref} className={ready ? "" : "opacity-0"} />
        </div>
        <div className="font-mono text-[11px] tracking-wider text-foreground">{reward.code}</div>
        <div className="text-[10px] text-muted-foreground">Expires {reward.expiry}</div>
      </div>
      <div className="border-t border-border p-2">
        <button
          onClick={onClaim}
          disabled={claimed}
          className="w-full rounded-xl bg-primary py-2 text-xs font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
        >
          {claimed ? "Claimed ✓" : "Claim reward"}
        </button>
      </div>
    </div>
  );
}
