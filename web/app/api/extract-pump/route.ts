import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { extractPumpData, type PumpImageMediaType } from "@/lib/pump-extract";

const ALLOWED_MEDIA_TYPES: readonly PumpImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Photo-assisted entry endpoint (extract-and-discard). Requires an authenticated
 * session — approval is enforced upstream by the Clerk proxy, which never lists
 * this route as public, so there is no extraction path from `/demo` or while
 * signed out (H-1). The uploaded bytes are forwarded to the model and discarded;
 * nothing is stored. Errors are NOT swallowed — extraction failures propagate.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { imageData?: unknown; mediaType?: unknown };
  const { imageData, mediaType } = body;

  if (typeof imageData !== "string" || !imageData) {
    return NextResponse.json({ error: "Missing image data" }, { status: 400 });
  }
  if (
    typeof mediaType !== "string" ||
    !ALLOWED_MEDIA_TYPES.includes(mediaType as PumpImageMediaType)
  ) {
    return NextResponse.json(
      { error: "Unsupported or missing image media type" },
      { status: 400 },
    );
  }

  const fields = await extractPumpData({
    data: imageData,
    mediaType: mediaType as PumpImageMediaType,
  });

  return NextResponse.json(fields);
}
