import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ExtractedPumpData {
  cost: number | null;
  gallons: number | null;
  pricePerGallon: number | null;
  date: string | null; // ISO date string if visible, null otherwise
}

/**
 * Uses Claude Haiku vision to extract pump data from a photo URL.
 */
export async function extractPumpData(imageUrl: string): Promise<ExtractedPumpData> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: `This is a photo of a gas pump display. Extract the following values:
- total_cost (dollars, numeric)
- gallons (numeric)
- price_per_gallon (dollars, numeric)
- date (ISO date string YYYY-MM-DD if visible, otherwise null)

Respond ONLY with valid JSON in this exact shape:
{"cost": <number|null>, "gallons": <number|null>, "pricePerGallon": <number|null>, "date": <string|null>}`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { cost: null, gallons: null, pricePerGallon: null, date: null };
    return JSON.parse(jsonMatch[0]) as ExtractedPumpData;
  } catch {
    return { cost: null, gallons: null, pricePerGallon: null, date: null };
  }
}
