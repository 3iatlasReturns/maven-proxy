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
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Only allow requests from frankmares.com
  const origin = req.headers.origin || "";
  const allowed = ["https://frankmares.com", "https://www.frankmares.com"];
  if (!allowed.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages" });
  }

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
    return res.status(200).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
