import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export type ExtractedCampaign = {
  product: string | null;
  quantity: number | null;
  vibe: string[];
  location: string | null;
  brand: string | null;
};

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

function validate(extracted: ExtractedCampaign, source: string): ExtractedCampaign {
  const src = normalize(source);
  const check = (v: string | null) =>
    v && src.includes(normalize(v)) ? v : null;
  return {
    product: check(extracted.product),
    quantity:
      extracted.quantity != null && src.includes(String(extracted.quantity))
        ? extracted.quantity
        : null,
    vibe: (extracted.vibe ?? []).filter((t) => src.includes(normalize(t))),
    location: check(extracted.location),
    brand: check(extracted.brand),
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
      "Do NOT invent, guess, or default values. Never inject 'matcha' or any other product unless the user wrote it.",
      "If a field is not mentioned, return null (or [] for vibe).",
      "If the brand/business name is not mentioned, return brand: null — do not hallucinate one.",
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
                    product: {
                      type: ["string", "null"],
                      description:
                        "The item being given away (e.g. 'iced latte'). Null if not stated.",
                    },
                    quantity: {
                      type: ["integer", "null"],
                      description: "How many will be given out. Null if not stated.",
                    },
                    vibe: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Short descriptors of the target audience taken verbatim from the message (e.g. ['study girls']). [] if not stated.",
                    },
                    location: {
                      type: ["string", "null"],
                      description: "City or place. Null if not stated.",
                    },
                    brand: {
                      type: ["string", "null"],
                      description:
                        "Brand or business name. Null if the user did not mention one.",
                    },
                  },
                  required: ["product", "quantity", "vibe", "location", "brand"],
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
            tool_calls?: Array<{
              function?: { arguments?: string };
            }>;
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

      const parsed = JSON.parse(args) as ExtractedCampaign;
      const safe = validate(
        {
          product: parsed.product ?? null,
          quantity: parsed.quantity ?? null,
          vibe: parsed.vibe ?? [],
          location: parsed.location ?? null,
          brand: parsed.brand ?? null,
        },
        data.message,
      );

      // Title-case the location for nicer display when validated.
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
