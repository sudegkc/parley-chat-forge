import { useEffect, useState, type ReactNode } from "react";
import type { Sender } from "@/lib/parley-types";

type Props = {
  sender: Sender;
  children: ReactNode;
  ts?: number;
};

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function MessageBubble({ sender, children, ts }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (sender === "system") {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          {children}
        </div>
      </div>
    );
  }
  const isMe = sender === "sponsor" || sender === "user";
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} animate-bubble-in`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
          isMe
            ? "bg-bubble-sponsor text-bubble-sponsor-foreground rounded-br-md"
            : "bg-bubble-bot text-bubble-bot-foreground rounded-bl-md"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
        {ts && (
          <div className={`mt-1 text-[10px] ${isMe ? "text-white/60" : "text-muted-foreground"} text-right`}>
            {new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
