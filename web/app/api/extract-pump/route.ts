import { auth } from "@clerk/nextjs/server";
import { extractPumpData } from "@/lib/claude";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const data = await extractPumpData(url);
  return NextResponse.json(data);
}
