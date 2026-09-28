import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

/**
 * Photo-assisted fill-up entry, rebuilt as EXTRACT-AND-DISCARD (Stream H / D-1):
 * one vision call reads the numbers off a pump display or receipt, and the image
 * is NEVER persisted — no Vercel Blob, no stored-photo column. The base64 bytes
 * live only for the duration of this request. Callers use the returned fields as
 * editable drafts; the user reviews and submits through the normal `createPurchase`.
 *
 * Model: `claude-haiku-4-5` (D-2) — cheap, vision-capable, sufficient for reading a
 * handful of numbers. Structured outputs (not free-text parsing) return typed fields.
 * Errors are NOT swallowed (per CLAUDE.md): a failed/empty extraction throws so the
 * route surfaces it and the client falls back to manual entry.
 */

const EXTRACT_MODEL = "claude-haiku-4-5";

const FUEL_GRADES = ["87", "89", "91", "93", "diesel"] as const;

/** Media types the Anthropic base64 image source accepts. */
export type PumpImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface PumpImage {
  /** Base64-encoded image bytes (no data: prefix). */
  data: string;
  mediaType: PumpImageMediaType;
}

/**
 * Fields read off the pump. Every field is optional: anything the model cannot read
 * confidently is left `undefined` rather than guessed.
 */
export interface ExtractedPumpFields {
  gallons?: number;
  pricePerGallon?: number;
  totalCost?: number;
  odometer?: number;
  fuelGrade?: (typeof FUEL_GRADES)[number];
}

// JSON Schema for the structured output. No field is `required`, so the model omits
// any value it can't read — `additionalProperties: false` keeps the shape tight.
const pumpSchema = {
  type: "object",
  properties: {
    totalCost: {
      type: "number",
      description: "Total sale in dollars (e.g. 45.10). Omit if not clearly visible.",
    },
    gallons: {
      type: "number",
      description: "Gallons pumped (e.g. 12.345). Omit if not clearly visible.",
    },
    pricePerGallon: {
      type: "number",
      description: "Price per gallon in dollars (e.g. 3.649). Omit if not clearly visible.",
    },
    odometer: {
      type: "integer",
      description: "Odometer reading in miles, only if plainly shown. Omit otherwise.",
    },
    fuelGrade: {
      type: "string",
      enum: [...FUEL_GRADES],
      description: "Fuel grade if labeled on the display/receipt. Omit if not shown.",
    },
  },
  required: [],
  additionalProperties: false,
} as const;

const PROMPT = [
  "This is a photo of a gas-pump display or a fuel receipt.",
  "Read the values that are clearly legible and return them in the structured format.",
  "Do NOT guess: if a value is not clearly visible, leave that field out entirely.",
  "Costs and price are in US dollars; gallons is volume; odometer is whole miles.",
].join(" ");

export async function extractPumpData(image: PumpImage): Promise<ExtractedPumpFields> {
  // Construct lazily so importing this module never requires a key (tests mock the SDK).
  const client = new Anthropic();

  const message = await client.messages.parse({
    model: EXTRACT_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: image.data,
            },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
    output_config: { format: jsonSchemaOutputFormat(pumpSchema) },
  });

  const parsed = message.parsed_output;
  if (!parsed) {
    // Surface the failure — do not fabricate an empty result.
    throw new Error("pump-extract: model returned no parseable structured output");
  }

  return parsed as ExtractedPumpFields;
}
