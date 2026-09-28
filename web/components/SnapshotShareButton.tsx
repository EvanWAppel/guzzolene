"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Share this view" affordance (PRD §5.7, Stream J / J-3).
 *
 * Self-contained: it receives an already-signed snapshot token (minted
 * server-side, so the signing secret never reaches the client) and builds the
 * copyable, origin-rooted link `/s/<token>` for the current filtered view. It
 * signs nothing and reads no data — it only composes and copies the URL.
 *
 * Errors are not swallowed (see `claude.md`): if the clipboard write rejects,
 * the rejection propagates rather than silently pretending success.
 */
export default function SnapshotShareButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/s/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 px-4"
      onClick={share}
      aria-label="Share this view — copy a link to this snapshot"
    >
      {copied ? (
        <>
          <Check size={15} aria-hidden /> Link copied
        </>
      ) : (
        <>
          <Link2 size={15} aria-hidden /> Share this view
        </>
      )}
    </Button>
  );
}
