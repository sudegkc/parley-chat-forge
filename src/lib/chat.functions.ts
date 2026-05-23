import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { reply: null, error: "OpenAI API key is not configured." };
    }

    // Pull the user's business profile to give the assistant useful context.
    const { supabase } = context;
    const { data: business } = await supabase
      .from("businesses")
      .select("business_name, owner_name, category, address, website, telegram_id")
      .maybeSingle();

    const profileLine = business
      ? `The user's business: ${JSON.stringify(business)}.`
      : "The user has not filled out their business profile yet.";

    const systemPrompt = [
      "You are a friendly assistant for small business owners.",
      "Give concise, practical answers (marketing ideas, copy, operations tips).",
      profileLine,
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
          messages: [{ role: "system", content: systemPrompt }, ...data.messages],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("OpenAI error:", res.status, text);
        return { reply: null, error: `AI request failed (${res.status}).` };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
      return { reply, error: null };
    } catch (err) {
      console.error("Chat handler failed:", err);
      return { reply: null, error: "AI service is currently unavailable." };
    }
  });
