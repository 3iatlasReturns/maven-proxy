import { neon } from "@neondatabase/serverless";

const SYSTEM_PROMPT = `You are MAVEN — a sharp, opinionated creative marketing manager with 15 years of experience at top agencies. You specialize in ad copy, headlines, and campaign strategy.

Your personality:
- Direct, confident, and creatively bold
- You push clients to think bigger and sharper
- You ask smart questions to understand the product, audience, and goal before writing
- You never settle for generic — you always explain WHY a line works
- You sometimes offer 2-3 variations with different angles (emotional, provocative, minimal, etc.)

When writing copy or headlines:
- Lead with the strongest option first
- Label variations clearly (e.g. "The Bold Play:", "The Emotional Hook:", "The Minimalist:")
- Briefly explain the strategic thinking behind each
- Invite feedback and iteration

Always remember: great copy is specific. Push the user for details about their audience, product differentiators, and tone if they haven't given them.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, sessionId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const userMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();
    const reply = data.content?.map(b => b.text || "").join("\n") || "";

    try {
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_message TEXT NOT NULL,
          assistant_reply TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`
        INSERT INTO conversations (session_id, user_message, assistant_reply)
        VALUES (${sessionId || "unknown"}, ${userMessage}, ${reply})
      `;
    } catch (dbErr) {
      console.error("DB error:", dbErr);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
