import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ChatWindow } from "@/components/ChatWindow";
import type { Campaign, Message, MatchedUser, Reward } from "@/lib/parley-types";
import {
  MOCK_USERS,
  SUGGESTED_PROMPT,
  newRewardCode,
  personalMessage,
} from "@/lib/parley-script";
import { extractCampaign } from "@/lib/parley.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Parley — Telegram bot demo" },
      {
        name: "description",
        content:
          "Sponsor a campaign, match Telegram users by vibe, send unique QR rewards — all inside the Parley bot.",
      },
      { property: "og:title", content: "Parley — Telegram bot demo" },
      {
        property: "og:description",
        content: "A Telegram-native rewards bot. Try the live simulator.",
      },
    ],
  }),
  component: ParleyDemo,
});

type Stage =
  | "intro"
  | "awaiting_request"
  | "extracted"
  | "awaiting_brand"
  | "awaiting_expiry"
  | "confirming"
  | "matched"
  | "dispatched"
  | "analytics_ready";

const now = () => Date.now();
const mid = () => nanoid(8);

function ParleyDemo() {
  const [stage, setStage] = useState<Stage>("intro");
  const [sponsorMsgs, setSponsorMsgs] = useState<Message[]>([
    {
      id: mid(),
      sender: "bot",
      kind: "text",
      ts: now(),
      text:
        "Hey 👋 I'm Parley. Tell me what reward you'd like to give out and to whom. I'll handle matching, QR codes, and delivery — all inside Telegram.",
    },
  ]);
  const [sponsorTyping, setSponsorTyping] = useState(false);
  const [input, setInput] = useState("");

  const [matched, setMatched] = useState<MatchedUser[]>([]);
  const [userChats, setUserChats] = useState<Record<string, Message[]>>({});
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const campaignRef = useRef<Campaign>({
    brand: null,
    product: null,
    quantity: null,
    vibe: [],
    audience: null,
    location: null,
    expiry: null,
  });
  const extract = useServerFn(extractCampaign);

  const askExpiry = async () => {
    await botSay("One thing missing — when should this campaign expire?", 500);
    setStage("awaiting_expiry");
  };

  const confirmCampaign = async () => {
    const c = campaignRef.current;
    const parts = [
      c.quantity ? `${c.quantity} ${c.product ?? "items"}` : c.product ?? "items",
      c.audience ? `for ${c.audience}` : null,
      c.vibe.length ? `${c.vibe.join(" / ")} vibe` : null,
      c.location ?? null,
      c.expiry ? `expires ${c.expiry}` : null,
    ].filter(Boolean);
    await botSay(`Perfect. Campaign: ${parts.join(", ")}. Confirm to launch?`, 700);
    setStage("confirming");
  };

  const appendSponsor = (m: Message) => setSponsorMsgs((p) => [...p, m]);
  const appendUser = (uid: string, m: Message) =>
    setUserChats((p) => ({ ...p, [uid]: [...(p[uid] ?? []), m] }));

  const botSay = (text: string, delay = 700) =>
    new Promise<void>((resolve) => {
      setSponsorTyping(true);
      setTimeout(() => {
        setSponsorTyping(false);
        appendSponsor({ id: mid(), sender: "bot", kind: "text", text, ts: now() });
        resolve();
      }, delay);
    });

  const handleSponsorSend = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput("");
    appendSponsor({ id: mid(), sender: "sponsor", kind: "text", text, ts: now() });

    if (stage === "intro" || stage === "awaiting_request") {
      setStage("extracted");
      await botSay("Got it — reading that…", 500);
      setSponsorTyping(true);
      const result = await extract({ data: { message: text } });
      setSponsorTyping(false);

      if (result.error || !result.campaign) {
        await botSay(
          result.error ?? "Hmm, I couldn't read that. Try again with a bit more detail?",
          400,
        );
        setStage("awaiting_request");
        return;
      }

      const c = result.campaign;
      const campaign: Campaign = {
        brand: c.brand,
        product: c.product,
        quantity: c.quantity,
        vibe: c.vibe,
        audience: c.audience,
        location: c.location,
        expiry: c.expiry,
      };
      campaignRef.current = campaign;
      appendSponsor({
        id: mid(),
        sender: "bot",
        kind: "extraction",
        data: campaign,
        ts: now(),
      });

      if (!campaign.brand) {
        await botSay(
          "What brand or business name should this campaign run under?",
          500,
        );
        setStage("awaiting_brand");
        return;
      }

      if (!campaign.expiry) {
        await askExpiry();
        return;
      }

      await confirmCampaign();
      return;
    }

    if (stage === "awaiting_brand") {
      campaignRef.current = { ...campaignRef.current, brand: text };
      appendSponsor({
        id: mid(),
        sender: "bot",
        kind: "extraction",
        data: campaignRef.current,
        ts: now(),
      });
      await askExpiry();
      return;
    }

    if (stage === "awaiting_expiry") {
      expiryRef.current = text;
      const c = campaignRef.current;
      const parts = [
        c.quantity ? `${c.quantity} ${c.product || "items"}` : c.product || "items",
        c.vibe.length ? `${c.vibe.join(" / ")} vibe` : null,
        c.location || null,
        `expires ${text}`,
      ].filter(Boolean);
      await botSay(`Perfect. Campaign: ${parts.join(", ")}. Confirm to launch?`, 700);
      setStage("confirming");
      return;
    }

    if (stage === "analytics_ready" || stage === "dispatched") {
      if (/how.*(doing|campaign|going|analytics)/i.test(text)) {
        await showAnalytics();
        return;
      }
      await botSay("I'll keep an eye on the campaign and ping you with updates.", 600);
    }
  };

  const handleConfirm = async () => {
    appendSponsor({ id: mid(), sender: "sponsor", kind: "text", text: "Confirm 🚀", ts: now() });
    setStage("matched");
    await botSay("Launching… scanning Telegram users by vibe tags.", 600);
    setSponsorTyping(true);
    setTimeout(() => {
      setSponsorTyping(false);
      appendSponsor({
        id: mid(),
        sender: "bot",
        kind: "matches",
        users: MOCK_USERS,
        ts: now(),
      });
      setMatched(MOCK_USERS);
      setActiveUserId(MOCK_USERS[0].id);
      setTimeout(() => dispatchRewards(), 900);
    }, 1100);
  };

  const dispatchRewards = async () => {
    await botSay("Sending personalized rewards now…", 600);
    MOCK_USERS.forEach((u, i) => {
      setTimeout(() => {
        appendUser(u.id, {
          id: mid(),
          sender: "bot",
          kind: "text",
          ts: now(),
          text: personalMessage(u),
        });
        setTimeout(() => {
          const c = campaignRef.current;
          const reward: Reward = {
            code: newRewardCode(),
            brand: c.brand || "Sponsor",
            product: c.product || "reward",
            expiry: expiryRef.current,
          };
          appendUser(u.id, { id: mid(), sender: "bot", kind: "qr", reward, ts: now() });
        }, 450);
      }, 350 + i * 500);
    });
    setTimeout(async () => {
      const total = campaignRef.current.quantity || MOCK_USERS.length;
      await botSay(
        `All ${total} rewards delivered ✓ You can ask me 'how is my campaign doing?' any time.`,
        800,
      );
      setStage("dispatched");
      // simulate background claims
      setTimeout(() => simulateClaim("u2"), 2500);
      setTimeout(() => simulateClaim("u4"), 4500);
    }, MOCK_USERS.length * 500 + 1500);
  };

  const simulateClaim = (uid: string) => {
    setUserChats((p) => {
      const list = p[uid] ?? [];
      const qr = [...list].reverse().find((m) => m.kind === "qr");
      if (!qr) return p;
      setClaimed((c) => new Set(c).add(qr.id));
      return {
        ...p,
        [uid]: [
          ...list,
          { id: mid(), sender: "system", kind: "text", text: "Reward claimed", ts: now() } as Message,
        ],
      };
    });
  };

  const showAnalytics = async () => {
    setSponsorTyping(true);
    setTimeout(() => {
      setSponsorTyping(false);
      appendSponsor({
        id: mid(),
        sender: "bot",
        kind: "analytics",
        ts: now(),
        data: {
          claimed: 37,
          total: 100,
          topAreas: ["Vanchiglia", "San Salvario"],
          avgClaimMinutes: 12,
        },
      });
      setStage("analytics_ready");
    }, 900);
  };

  const handleUserClaim = (uid: string, msgId: string) => {
    setClaimed((c) => new Set(c).add(msgId));
    appendUser(uid, {
      id: mid(),
      sender: "system",
      kind: "text",
      text: "Reward claimed",
      ts: now(),
    });
    setMatched((p) => p.map((u) => (u.id === uid ? { ...u, claimed: true } : u)));
  };

  const reset = () => window.location.reload();

  const chips = useMemo(() => {
    if (stage === "intro" || stage === "awaiting_request")
      return [SUGGESTED_PROMPT];
    if (stage === "awaiting_expiry") return ["in 7 days", "end of month"];
    if (stage === "dispatched" || stage === "analytics_ready")
      return ["How is my campaign doing?"];
    return [];
  }, [stage]);

  const activeUser = matched.find((u) => u.id === activeUserId) ?? null;
  const activeMessages = activeUserId ? userChats[activeUserId] ?? [] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            P
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Parley</div>
            <div className="text-[11px] text-muted-foreground">Telegram bot demo</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Business login
          </Link>
          <button
            onClick={reset}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Reset demo
          </button>
        </div>
      </header>

      <h1 className="sr-only">Parley Telegram bot demo</h1>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-10 md:grid-cols-2">
        {/* Sponsor side */}
        <section className="flex h-[78vh] min-h-[640px] flex-col">
          <div className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Sponsor · @kioko_team
          </div>
          <PhoneFrame
            title="Parley"
            subtitle="bot · online"
            avatar="P"
            rightSlot={
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Telegram
              </div>
            }
          >
            <ChatWindow
              messages={sponsorMsgs}
              typing={sponsorTyping}
              footer={
                <SponsorFooter
                  value={input}
                  onChange={setInput}
                  onSend={() => handleSponsorSend()}
                  chips={chips}
                  onChip={(c) => handleSponsorSend(c)}
                  showConfirm={stage === "confirming"}
                  onConfirm={handleConfirm}
                />
              }
            />
          </PhoneFrame>
        </section>

        {/* Users side */}
        <section className="flex h-[78vh] min-h-[640px] flex-col">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Matched users
            </div>
            {matched.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                {matched.length} of 100 shown
              </div>
            )}
          </div>
          <PhoneFrame
            title={activeUser ? `${activeUser.emoji} ${activeUser.name}` : "Awaiting matches"}
            subtitle={activeUser ? activeUser.handle : "users will appear here after launch"}
            avatar={activeUser?.emoji ?? "·"}
            rightSlot={
              activeUser?.claimed ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  CLAIMED
                </span>
              ) : null
            }
          >
            {matched.length > 0 && (
              <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b border-border bg-phone-header px-3 py-2">
                {matched.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setActiveUserId(u.id)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                      activeUserId === u.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {u.emoji} {u.name}
                    {u.claimed && <span className="ml-1 opacity-70">✓</span>}
                  </button>
                ))}
              </div>
            )}
            {activeUser ? (
              <ChatWindow
                messages={activeMessages}
                claimedIds={claimed}
                onClaim={(msgId) => handleUserClaim(activeUser.id, msgId)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-muted-foreground">
                Once you confirm the campaign, matched Telegram users and their
                personalized rewards will appear here.
              </div>
            )}
          </PhoneFrame>
        </section>
      </main>
    </div>
  );
}

function SponsorFooter({
  value,
  onChange,
  onSend,
  chips,
  onChip,
  showConfirm,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  chips: string[];
  onChip: (c: string) => void;
  showConfirm: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-2 px-3 py-3">
      {chips.length > 0 && (
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => onChip(c)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition hover:bg-muted"
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {showConfirm ? (
        <button
          onClick={onConfirm}
          className="w-full rounded-2xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition active:scale-[0.99]"
        >
          Confirm & launch campaign
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Message Parley…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
