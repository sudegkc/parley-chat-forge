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
import { extractCampaign, inferVibe, suggestVibes } from "@/lib/parley.functions";

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

type EditField = "product" | "quantity" | "vibe" | "location" | "expiry";

type Stage =
  | "intro"
  | "awaiting_request"
  | "extracted"
  | "awaiting_brand"
  | "awaiting_expiry"
  | "awaiting_vibe"
  | "awaiting_custom_vibe"
  | "reviewing"
  | "awaiting_edit_product"
  | "awaiting_edit_quantity"
  | "awaiting_edit_vibe"
  | "awaiting_edit_location"
  | "awaiting_edit_expiry"
  | "matched"
  | "dispatched"
  | "analytics_ready";

function suggestVibesFor(product: string | null, message: string): string[] {
  const t = `${product ?? ""} ${message}`.toLowerCase();
  if (/latte|coffee|matcha|cafe|espresso|cappuccino/.test(t))
    return ["study mode", "cafe lovers", "university students", "cozy mornings", "productivity", "aesthetic girls"];
  if (/book|read|novel/.test(t))
    return ["bookworms", "cozy readers", "literary", "aesthetic", "students", "quiet mornings"];
  if (/gym|workout|fitness|protein|run/.test(t))
    return ["fitness", "gym rats", "morning routine", "wellness", "athletes", "early birds"];
  if (/pizza|burger|food|meal|lunch|dinner/.test(t))
    return ["foodies", "students", "locals", "late night", "friends night", "creators"];
  return ["students", "creatives", "foodies", "locals", "aesthetic", "productivity"];
}

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
  const infer = useServerFn(inferVibe);
  const suggest = useServerFn(suggestVibes);
  const originalMessageRef = useRef<string>("");
  const [vibeSuggestions, setVibeSuggestions] = useState<string[]>([]);
  const [vibeLoading, setVibeLoading] = useState(false);

  const askExpiry = async () => {
    await botSay("One thing missing — when should this campaign expire?", 500);
    setStage("awaiting_expiry");
  };

  const goToVibeStep = async () => {
    await botSay(
      "Who should this reward reach? Pick a vibe, write your own, or skip and let Parley infer it.",
      700,
    );
    setStage("awaiting_vibe");
    setVibeLoading(true);
    setVibeSuggestions([]);
    try {
      const c = campaignRef.current;
      const res = await suggest({
        data: {
          message: originalMessageRef.current,
          product: c.product,
          audience: c.audience,
          location: c.location,
        },
      });
      setVibeSuggestions(res.suggestions);
    } catch {
      setVibeSuggestions(suggestVibesFor(campaignRef.current.product, originalMessageRef.current));
    } finally {
      setVibeLoading(false);
    }
  };

  const goToReview = async () => {
    appendSponsor({
      id: mid(),
      sender: "bot",
      kind: "extraction",
      data: campaignRef.current,
      ts: now(),
    });
    await botSay("Before I mint the QR rewards, do you want to change anything?", 700);
    setStage("reviewing");
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
      originalMessageRef.current = text;
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
      campaignRef.current = {
        brand: c.brand,
        product: c.product,
        quantity: c.quantity,
        vibe: c.vibe,
        audience: c.audience,
        location: c.location,
        expiry: c.expiry,
      };
      appendSponsor({
        id: mid(),
        sender: "bot",
        kind: "extraction",
        data: campaignRef.current,
        ts: now(),
      });

      if (!campaignRef.current.brand) {
        await botSay(
          "What brand or business name should this campaign run under?",
          500,
        );
        setStage("awaiting_brand");
        return;
      }

      if (!campaignRef.current.expiry) {
        await askExpiry();
        return;
      }

      await goToVibeStep();
      return;
    }

    if (stage === "awaiting_brand") {
      campaignRef.current = { ...campaignRef.current, brand: text };
      if (!campaignRef.current.expiry) {
        await askExpiry();
        return;
      }
      await goToVibeStep();
      return;
    }

    if (stage === "awaiting_expiry") {
      campaignRef.current = { ...campaignRef.current, expiry: text };
      await goToVibeStep();
      return;
    }

    if (stage === "awaiting_custom_vibe") {
      const tags = text.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);
      if (tags.length) {
        campaignRef.current = { ...campaignRef.current, vibe: tags };
      }
      await goToReview();
      return;
    }

    if (stage.startsWith("awaiting_edit_")) {
      const field = stage.replace("awaiting_edit_", "") as EditField;
      const c = campaignRef.current;
      if (field === "quantity") {
        const n = parseInt(text.replace(/\D/g, ""), 10);
        campaignRef.current = { ...c, quantity: Number.isFinite(n) && n > 0 ? n : c.quantity };
      } else if (field === "vibe") {
        const tags = text.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);
        campaignRef.current = { ...c, vibe: tags.length ? tags : c.vibe };
      } else {
        campaignRef.current = { ...c, [field]: text };
      }
      await goToReview();
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

  const handlePickVibe = async (v: string) => {
    appendSponsor({ id: mid(), sender: "sponsor", kind: "text", text: `Vibe: ${v}`, ts: now() });
    campaignRef.current = { ...campaignRef.current, vibe: [v] };
    await goToReview();
  };

  const handleSkipVibe = async () => {
    appendSponsor({ id: mid(), sender: "sponsor", kind: "text", text: "Skip vibe", ts: now() });
    await botSay("On it — inferring the vibe from your message…", 400);
    setSponsorTyping(true);
    try {
      const res = await infer({
        data: {
          message: originalMessageRef.current,
          product: campaignRef.current.product,
        },
      });
      campaignRef.current = { ...campaignRef.current, vibe: res.vibe };
    } catch {
      // keep whatever vibe we already had
    }
    setSponsorTyping(false);
    await goToReview();
  };

  const handleEdit = async (field: EditField) => {
    const labels: Record<EditField, string> = {
      product: "product",
      quantity: "quantity (a number)",
      vibe: "target vibe (comma-separated)",
      location: "location",
      expiry: "expiry",
    };
    appendSponsor({
      id: mid(),
      sender: "sponsor",
      kind: "text",
      text: `Edit ${field}`,
      ts: now(),
    });
    await botSay(`Sure — what's the new ${labels[field]}?`, 400);
    setStage(`awaiting_edit_${field}` as Stage);
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
          text: personalMessage(u, campaignRef.current),
        });
        setTimeout(() => {
          const c = campaignRef.current;
          const reward: Reward = {
            code: newRewardCode(),
            brand: c.brand || "Sponsor",
            product: c.product || "reward",
            expiry: c.expiry ?? "in 7 days",
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
                  mode={
                    stage === "awaiting_vibe"
                      ? "vibe"
                      : stage === "reviewing"
                        ? "review"
                        : "input"
                  }
                  vibeSuggestions={vibeSuggestions}
                  onPickVibe={handlePickVibe}
                  onSkipVibe={handleSkipVibe}
                  onConfirm={handleConfirm}
                  onEdit={handleEdit}
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
  mode,
  vibeSuggestions,
  onPickVibe,
  onSkipVibe,
  onConfirm,
  onEdit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  chips: string[];
  onChip: (c: string) => void;
  mode: "input" | "vibe" | "review";
  vibeSuggestions: string[];
  onPickVibe: (v: string) => void;
  onSkipVibe: () => void;
  onConfirm: () => void;
  onEdit: (field: EditField) => void;
}) {
  if (mode === "vibe") {
    return (
      <div className="space-y-2 px-3 py-3">
        <div className="scrollbar-thin flex flex-wrap gap-1.5">
          {vibeSuggestions.map((v) => (
            <button
              key={v}
              onClick={() => onPickVibe(v)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition hover:bg-muted"
            >
              {v}
            </button>
          ))}
        </div>
        <button
          onClick={onSkipVibe}
          className="w-full rounded-2xl border border-border bg-card py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Skip vibe — let Parley infer
        </button>
      </div>
    );
  }

  if (mode === "review") {
    const editBtns: Array<[EditField, string]> = [
      ["product", "Edit product"],
      ["quantity", "Edit quantity"],
      ["vibe", "Edit vibe"],
      ["location", "Edit location"],
      ["expiry", "Edit expiry"],
    ];
    return (
      <div className="space-y-2 px-3 py-3">
        <button
          onClick={onConfirm}
          className="w-full rounded-2xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition active:scale-[0.99]"
        >
          Confirm campaign
        </button>
        <div className="flex flex-wrap gap-1.5">
          {editBtns.map(([f, label]) => (
            <button
              key={f}
              onClick={() => onEdit(f)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition hover:bg-muted"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

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
    </div>
  );
}
