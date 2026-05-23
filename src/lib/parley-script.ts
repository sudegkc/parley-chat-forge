import { nanoid } from "nanoid";
import type { Campaign, MatchedUser } from "./parley-types";

export const SUGGESTED_PROMPT =
  "I wanna give 10 iced lattes to study girls in Turin.";

export const CAMPAIGN_DRAFT: Campaign = {
  brand: null,
  product: null,
  quantity: null,
  vibe: [],
  audience: null,
  location: null,
  expiry: null,
};

export const MOCK_USERS: MatchedUser[] = [
  { id: "u1", name: "Giulia", handle: "@giuli.studies", emoji: "📚", vibe: ["study", "matcha", "library"] },
  { id: "u2", name: "Marta", handle: "@martamatcha", emoji: "🍵", vibe: ["matcha", "aesthetic", "turin"] },
  { id: "u3", name: "Chiara", handle: "@chiarareads", emoji: "📖", vibe: ["study", "books", "cafés"] },
  { id: "u4", name: "Sofia", handle: "@sof.ia", emoji: "✨", vibe: ["aesthetic", "matcha", "turin"] },
  { id: "u5", name: "Aurora", handle: "@auroranotes", emoji: "🖊️", vibe: ["study", "notes", "quiet"] },
];

export const personalMessage = (u: MatchedUser) =>
  `Hey ${u.name} — saw you love ${u.vibe[0]} & ${u.vibe[1]}. Kioko in Turin just sent you a free iced matcha 🍵`;

export const newRewardCode = () => `PRLY-${nanoid(6).toUpperCase()}`;
