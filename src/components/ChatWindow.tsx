import { useEffect, useRef, type ReactNode } from "react";
import type { Message } from "@/lib/parley-types";
import { MessageBubble } from "./MessageBubble";
import { TypingDots } from "./TypingDots";
import { ExtractionCard } from "./ExtractionCard";
import { AnalyticsCard } from "./AnalyticsCard";
import { QRRewardCard } from "./QRRewardCard";

type Props = {
  messages: Message[];
  typing?: boolean;
  footer?: ReactNode;
  onClaim?: (msgId: string) => void;
  claimedIds?: Set<string>;
};

export function ChatWindow({ messages, typing, footer, onClaim, claimedIds }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={ref}
        className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-3 py-4"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.9 0 0) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      >
        {messages.map((m) => {
          if (m.kind === "text") {
            return (
              <MessageBubble key={m.id} sender={m.sender} ts={m.ts}>
                {m.text}
              </MessageBubble>
            );
          }
          if (m.kind === "extraction") {
            return (
              <div key={m.id} className="flex justify-start">
                <ExtractionCard data={m.data} />
              </div>
            );
          }
          if (m.kind === "analytics") {
            return (
              <div key={m.id} className="flex justify-start">
                <AnalyticsCard data={m.data} />
              </div>
            );
          }
          if (m.kind === "matches") {
            return (
              <MessageBubble key={m.id} sender={m.sender} ts={m.ts}>
                <div className="space-y-1.5">
                  <div>Found {m.users.length * 20} matches. Sampling top {m.users.length}:</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.users.map((u) => (
                      <span
                        key={u.id}
                        className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]"
                      >
                        {u.emoji} {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              </MessageBubble>
            );
          }
          if (m.kind === "qr") {
            return (
              <div key={m.id} className="flex justify-start">
                <QRRewardCard
                  reward={m.reward}
                  claimed={claimedIds?.has(m.id)}
                  onClaim={onClaim ? () => onClaim(m.id) : undefined}
                />
              </div>
            );
          }
          return null;
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-bubble-bot px-3 py-2 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}
      </div>
      {footer && <div className="border-t border-border bg-phone-header">{footer}</div>}
    </div>
  );
}
