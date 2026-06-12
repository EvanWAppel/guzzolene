"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchase } from "@/actions/purchases";
import { drainOutbox } from "@/lib/offline-outbox";

/* Drains the offline fill-up outbox on dashboard mount and whenever the
 * browser comes back online (Stream D). Failed drafts stay queued and the
 * error is shown — never silently retried away. */
export default function OutboxSync() {
  const router = useRouter();
  const [failed, setFailed] = useState<{ id: number; error: string }[]>([]);

  const drain = useCallback(async () => {
    const result = await drainOutbox(createPurchase);
    setFailed((prev) => (prev.length === 0 && result.failed.length === 0 ? prev : result.failed));
    if (result.synced > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    queueMicrotask(drain);
    window.addEventListener("online", drain);

    // Background-sync nudge from the service worker (D-8).
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "drain-outbox") drain();
    };
    const sw = "serviceWorker" in navigator ? navigator.serviceWorker : null;
    sw?.addEventListener("message", onSwMessage);

    return () => {
      window.removeEventListener("online", drain);
      sw?.removeEventListener("message", onSwMessage);
    };
  }, [drain]);

  if (failed.length === 0) return null;

  return (
    <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
      <p className="font-medium">
        {failed.length} queued fill-up{failed.length === 1 ? "" : "s"} failed to sync
      </p>
      <ul className="mt-1 list-disc pl-5 text-muted-foreground">
        {failed.map((f) => (
          <li key={f.id}>{f.error}</li>
        ))}
      </ul>
    </div>
  );
}
