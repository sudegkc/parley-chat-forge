import { nanoid } from "nanoid";
import type { Campaign, MatchedUser } from "./parley-types";

export const SUGGESTED_PROMPT =
  "I wanna give 10 iced lattes to study girls in Turin.";

export const MOCK_USERS: MatchedUser[] = [
  { id: "u1", name: "Giulia", handle: "@giuli.studies", emoji: "📚", vibe: ["study", "library", "cafés"] },
  { id: "u2", name: "Marta", handle: "@martareads", emoji: "📖", vibe: ["study", "aesthetic", "turin"] },
  { id: "u3", name: "Chiara", handle: "@chiarareads", emoji: "📓", vibe: ["study", "books", "cafés"] },
  { id: "u4", name: "Sofia", handle: "@sof.ia", emoji: "✨", vibe: ["aesthetic", "turin", "study"] },
  { id: "u5", name: "Aurora", handle: "@auroranotes", emoji: "🖊️", vibe: ["study", "notes", "quiet"] },
];

export const personalMessage = (u: MatchedUser, c: Campaign) => {
  const product = c.product ?? "a little gift";
  const brand = c.brand ?? "A sponsor";
  const where = c.location ? ` in ${c.location}` : "";
  const tags = u.vibe.slice(0, 2).join(" & ");
  return `Hey ${u.name} — saw you love ${tags}. ${brand}${where} just sent you a free ${product} ✨`;
};

export const newRewardCode = () => `PRLY-${nanoid(6).toUpperCase()}`;
