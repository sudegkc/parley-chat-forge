import { nanoid } from "nanoid";
import type { Campaign, MatchedUser } from "./parley-types";

export const SUGGESTED_PROMPT =
  "I want to give 100 free iced matchas to study girls in Turin.";

export const CAMPAIGN_DRAFT: Campaign = {
  brand: "Kioko Matcha Bar",
  product: "Iced matcha latte",
  quantity: 100,
  vibe: ["study", "matcha", "aesthetic", "quiet cafés"],
  location: "Turin, IT",
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
