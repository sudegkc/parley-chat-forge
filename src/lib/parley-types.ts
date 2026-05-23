export type Sender = "bot" | "sponsor" | "user" | "system";

export type Message =
  | { id: string; sender: Sender; kind: "text"; text: string; ts: number }
  | { id: string; sender: Sender; kind: "extraction"; data: Campaign; ts: number }
  | { id: string; sender: Sender; kind: "matches"; users: MatchedUser[]; ts: number }
  | { id: string; sender: Sender; kind: "analytics"; data: Analytics; ts: number }
  | { id: string; sender: Sender; kind: "qr"; reward: Reward; ts: number };

export type Campaign = {
  brand: string | null;
  product: string | null;
  quantity: number | null;
  vibe: string[];
  audience: string | null;
  location: string | null;
  expiry: string | null;
};

export type MatchedUser = {
  id: string;
  name: string;
  handle: string;
  emoji: string;
  vibe: string[];
  claimed?: boolean;
};

export type Reward = {
  code: string;
  brand: string;
  product: string;
  expiry: string;
};

export type Analytics = {
  claimed: number;
  total: number;
  topAreas: string[];
  avgClaimMinutes: number;
};
