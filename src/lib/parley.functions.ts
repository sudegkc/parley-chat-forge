import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export type ExtractedCampaign = {
  brand: string | null;
  product: string | null;
  quantity: number | null;
  vibe: string[];
  audience: string | null;
  location: string | null;
  expiry: string | null;
};

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

function validate(extracted: ExtractedCampaign, source: string): ExtractedCampaign {
  const src = normalize(source);
  const check = (v: string | null) =>
    v && src.includes(normalize(v)) ? v : null;
  return {
    brand: check(extracted.brand),
    product: check(extracted.product),
    quantity:
      extracted.quantity != null && source.includes(String(extracted.quantity))
        ? extracted.quantity
        : null,
    vibe: (extracted.vibe ?? []).filter((t) => src.includes(normalize(t))),
    audience: check(extracted.audience),
    location: check(extracted.location),
    expiry:
      extracted.expiry && extracted.expiry.trim().length > 0
        ? extracted.expiry.trim()
        : null,
  };
}

/**
 * Local regex fallback when OpenAI is unreachable / misconfigured.
 * Never invents values — returns null for anything it can't identify.
 */
export function fallbackExtract(message: string): ExtractedCampaign {
  const msg = message.trim();

  // "10 iced lattes", "5 coffees"
  const qpMatch = msg.match(
    /(\d+)\s+([a-zA-Z][\w\s-]{1,40}?)(?=\s+(?:to|for|in|at|by|near)\b|[.,!?]|$)/i,
  );
  let quantity: number | null = null;
  let product: string | null = null;
  if (qpMatch) {
    quantity = parseInt(qpMatch[1], 10);
    product = qpMatch[2].trim().toLowerCase();
  } else {
    const qOnly = msg.match(/\b(\d+)\b/);
    if (qOnly) quantity = parseInt(qOnly[1], 10);
  }

  // "to study girls", "for students"
  const audMatch = msg.match(
    /\b(?:to|for)\s+([a-zA-Z][\w\s-]{1,60}?)(?=\s+(?:in|at|near|by)\b|[.,!?]|$)/i,
  );
  const audience = audMatch ? audMatch[1].trim().toLowerCase() : null;

  // "in Turin", "at Milan"
  const locMatch = msg.match(
    /\b(?:in|at|near)\s+([A-Za-z][\w\s-]{1,40}?)(?=[.,!?]|$)/i,
  );
  const location = locMatch
    ? locMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return {
    brand: null,
    product,
    quantity,
    vibe: [],
    audience,
    location,
    expiry: null,
  };
}

function fallbackResult(message: string) {
  const fb = fallbackExtract(message);
  const anyField =
    !!fb.brand || !!fb.product || fb.quantity != null || !!fb.audience || !!fb.location;
  return {
    campaign: anyField ? fb : null,
    error: anyField
      ? (null as string | null)
      : "I couldn't read that. Try something like: '10 iced lattes for students in Turin'.",
    source: "fallback" as const,
  };
}

export const extractCampaign = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[extractCampaign] missing OPENAI_API_KEY env var");
      return fallbackResult(data.message);
    }

    const systemPrompt = [
      "You extract campaign details from a sponsor's free-text message.",
      "Only use information explicitly present in the message.",
      "Do NOT invent, guess, or default values.",
      "If a field is not mentioned, return null (or [] for vibe).",
      "Fields: brand (business name, null if absent), product (item given away),",
      "quantity (integer), vibe (mood descriptors, [] if absent),",
      "audience (who the campaign is for, e.g. 'study girls'),",
      "location (city/place), expiry (time phrase like 'in 7 days', null if absent).",
    ].join(" ");

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: data.message },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_campaign",
                description: "Save extracted campaign fields.",
                parameters: {
                  type: "object",
                  properties: {
                    brand: { type: ["string", "null"] },
                    product: { type: ["string", "null"] },
                    quantity: { type: ["integer", "null"] },
                    vibe: { type: "array", items: { type: "string" } },
                    audience: { type: ["string", "null"] },
                    location: { type: ["string", "null"] },
                    expiry: { type: ["string", "null"] },
                  },
                  required: [
                    "brand",
                    "product",
                    "quantity",
                    "vibe",
                    "audience",
                    "location",
                    "expiry",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "save_campaign" } },
        }),
      });
    } catch (err) {
      console.error("[extractCampaign] network error reaching OpenAI:", err);
      return fallbackResult(data.message);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        console.error("[extractCampaign] invalid OpenAI API key:", res.status, text);
      } else if (res.status === 429) {
        console.error("[extractCampaign] OpenAI rate-limited:", text);
      } else if (res.status >= 500) {
        console.error("[extractCampaign] OpenAI server/model error:", res.status, text);
      } else {
        console.error("[extractCampaign] OpenAI request failed:", res.status, text);
      }
      return fallbackResult(data.message);
    }

    let parsed: Partial<ExtractedCampaign>;
    try {
      const json = (await res.json()) as {
        choices?: Array<{
          message?: {
            tool_calls?: Array<{ function?: { arguments?: string } }>;
          };
        }>;
      };
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) {
        console.error("[extractCampaign] model returned no tool_call arguments");
        return fallbackResult(data.message);
      }
      parsed = JSON.parse(args) as Partial<ExtractedCampaign>;
    } catch (err) {
      console.error("[extractCampaign] JSON parse error:", err);
      return fallbackResult(data.message);
    }

    const safe = validate(
      {
        brand: parsed.brand ?? null,
        product: parsed.product ?? null,
        quantity: parsed.quantity ?? null,
        vibe: parsed.vibe ?? [],
        audience: parsed.audience ?? null,
        location: parsed.location ?? null,
        expiry: parsed.expiry ?? null,
      },
      data.message,
    );

    const campaign: ExtractedCampaign = {
      ...safe,
      location: safe.location
        ? safe.location.charAt(0).toUpperCase() + safe.location.slice(1)
        : null,
    };

    return { campaign, error: null as string | null, source: "openai" as const };
  });

const inferInputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  product: z.string().trim().max(200).nullable(),
});

function fallbackInferVibe(message: string, product: string | null): string[] {
  const text = `${product ?? ""} ${message}`.toLowerCase();
  const tags: string[] = [];
  if (/study|student|university|college|library|exam/.test(text)) tags.push("study mode");
  if (/cafe|latte|coffee|matcha|espresso|cappuccino/.test(text)) tags.push("cafe lovers");
  if (/aesthetic|cozy|cute|pretty|girl/.test(text)) tags.push("aesthetic");
  if (/gym|workout|fitness|protein|run/.test(text)) tags.push("fitness");
  if (/book|read|novel/.test(text)) tags.push("bookworms");
  if (/morning/.test(text)) tags.push("cozy mornings");
  if (/work|productive|focus/.test(text)) tags.push("productivity");
  return tags.length ? tags.slice(0, 3) : ["locals"];
}

export const inferVibe = createServerFn({ method: "POST" })
  .inputValidator((input) => inferInputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { vibe: fallbackInferVibe(data.message, data.product) };
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Infer 2-3 short vibe tags (lowercase, 1-3 words each) describing the target audience mood for a reward campaign. Respond as JSON: {\"tags\": [\"tag1\", \"tag2\"]}.",
            },
            {
              role: "user",
              content: `Product: ${data.product ?? "unknown"}\nMessage: ${data.message}`,
            },
          ],
        }),
      });
      if (!res.ok) {
        console.error("[inferVibe] OpenAI error:", res.status);
        return { vibe: fallbackInferVibe(data.message, data.product) };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as { tags?: unknown };
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === "string").slice(0, 3)
        : [];
      return { vibe: tags.length ? tags : fallbackInferVibe(data.message, data.product) };
    } catch (err) {
      console.error("[inferVibe] error:", err);
      return { vibe: fallbackInferVibe(data.message, data.product) };
    }
  });
