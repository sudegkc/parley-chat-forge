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

  const handleScan = () => {
    if (claimed || !onClaim) return;
    onClaim();
  };

  return (
    <div className="animate-bubble-in w-[260px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-primary px-4 py-2.5 text-primary-foreground">
        <div className="text-[10px] uppercase tracking-[0.15em] opacity-70">Parley reward</div>
        <div className="text-sm font-semibold">{reward.brand}</div>
      </div>
      <div className="flex flex-col items-center gap-2 px-4 py-4">
        <div className="text-xs text-muted-foreground">{reward.product}</div>
        <button
          type="button"
          onClick={handleScan}
          disabled={claimed}
          aria-label={claimed ? "Reward claimed" : "Scan QR to claim"}
          className="group relative rounded-lg border border-border bg-white p-2 transition active:scale-[0.98] disabled:cursor-default"
        >
          <canvas ref={ref} className={`${ready ? "" : "opacity-0"} ${claimed ? "opacity-20" : ""} transition-opacity`} />
          {claimed && (
            <div className="animate-bubble-in absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          )}
        </button>
        <div className="font-mono text-[11px] tracking-wider text-foreground">{reward.code}</div>
        <div className="text-[10px] text-muted-foreground">
          {claimed ? "Claimed ✓" : "Tap QR to scan"}
        </div>
        <div className="text-[10px] text-muted-foreground">Expires {reward.expiry}</div>
      </div>
    </div>
  );
}
