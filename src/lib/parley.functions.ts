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
    // Expiry is a time phrase ("in 7 days", "next Friday") — accept any non-empty string.
    expiry:
      extracted.expiry && extracted.expiry.trim().length > 0
        ? extracted.expiry.trim()
        : null,
  };
}

export const extractCampaign = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        campaign: null as ExtractedCampaign | null,
        error: "OpenAI API key is not configured.",
      };
    }

    const systemPrompt = [
      "You extract campaign details from a sponsor's free-text message.",
      "Only use information explicitly present in the message.",
      "Do NOT invent, guess, or default values. Never inject 'matcha' or any product the user did not write.",
      "If a field is not mentioned, return null (or [] for vibe).",
      "Fields:",
      "- brand: business name running the campaign (null if not mentioned).",
      "- product: the item being given away (e.g. 'iced latte').",
      "- quantity: integer number of items.",
      "- vibe: short mood/aesthetic descriptors taken verbatim (e.g. ['cozy','aesthetic']). [] if absent.",
      "- audience: who the campaign is for (e.g. 'study girls', 'students'). Null if absent.",
      "- location: city or place.",
      "- expiry: time phrase like 'in 7 days', 'end of month', 'next Friday'. Null if absent.",
    ].join(" ");

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
          tool_choice: {
            type: "function",
            function: { name: "save_campaign" },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("OpenAI extract error:", res.status, text);
        return {
          campaign: null as ExtractedCampaign | null,
          error: `AI request failed (${res.status}).`,
        };
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: {
            tool_calls?: Array<{ function?: { arguments?: string } }>;
          };
        }>;
      };

      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) {
        return {
          campaign: null as ExtractedCampaign | null,
          error: "AI did not return a structured result.",
        };
      }

      const parsed = JSON.parse(args) as Partial<ExtractedCampaign>;
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

      return { campaign, error: null as string | null };
    } catch (err) {
      console.error("extractCampaign failed:", err);
      return {
        campaign: null as ExtractedCampaign | null,
        error: "AI service is currently unavailable.",
      };
    }
  });
