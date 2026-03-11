export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return response.status(500).json({
      error: "ANTHROPIC_API_KEY is not configured on the server."
    });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(request.body)
    });

    const payload = await upstream.text();
    response.status(upstream.status).setHeader("content-type", "application/json");
    return response.send(payload);
  } catch (error) {
    return response.status(500).json({
      error: error.message || "Anthropic proxy request failed."
    });
  }
}
