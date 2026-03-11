const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT = `You are a USMLE Step 1 tutor for an IMG (International Medical Graduate) physician.

Your rules:
- Explain concepts at a medical school level, not layperson level
- Be concise: aim for 150-300 word responses
- Always structure answers as: Key Concept -> Mechanism -> Clinical Correlation -> High-Yield Buzzwords
- When relevant, mention the First Aid page range (e.g., "FA2024 pp. 578-582")
- Use mnemonics when they exist
- If asked about a UWorld question, explain the reasoning step by step
- Never say "I don't know" - if uncertain, say "This is a low-yield topic, but here's what you need to know for Step 1..."
- Keep the tone like a friendly senior resident teaching an intern: direct, supportive, no fluff
- End every response with one "Quick Test" question to check understanding`;

export async function askTutor(question, apiKey, conversationHistory = []) {
  const messages = [
    ...conversationHistory.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }]
    })),
    { role: "user", parts: [{ text: question }] }
  ];

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: messages,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n\n") || "No response received.";

  return text;
}

