import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import {
  saveDraft,
  listDrafts,
  deleteDraft,
  drainOutbox,
  type FillUpDraft,
} from "@/lib/offline-outbox";

const DRAFT: FillUpDraft = {
  date: "2026-06-11",
  cost: "45.00",
  gallons: "12.5",
  pricePerGallon: "3.60",
  odometer: "82000",
  fuelGrade: "91",
  lat: 41.8781,
  lng: -87.6298,
};

beforeEach(() => {
  // Fresh IndexedDB per test so drafts don't leak between cases.
  globalThis.indexedDB = new IDBFactory();
});

describe("offline outbox: saveDraft / listDrafts", () => {
  it("saveDraft writes the draft to the outbox store and listDrafts returns it", async () => {
    const id = await saveDraft(DRAFT);
    expect(id).toBeTypeOf("number");

    const drafts = await listDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject(DRAFT);
    expect(drafts[0].id).toBe(id);
  });

  it("stores multiple drafts independently", async () => {
    await saveDraft(DRAFT);
    await saveDraft({ ...DRAFT, date: "2026-06-12", lat: undefined, lng: undefined });

    const drafts = await listDrafts();
    expect(drafts).toHaveLength(2);
    expect(drafts.map((d) => d.date)).toEqual(["2026-06-11", "2026-06-12"]);
  });

  it("deleteDraft removes a single draft", async () => {
    const id = await saveDraft(DRAFT);
    await saveDraft({ ...DRAFT, date: "2026-06-12" });

    await deleteDraft(id);

    const drafts = await listDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].date).toBe("2026-06-12");
  });
});

describe("offline outbox: drainOutbox", () => {
  it("submits each pending draft and deletes it on success", async () => {
    await saveDraft(DRAFT);
    await saveDraft({ ...DRAFT, date: "2026-06-12" });

    const submit = vi.fn<(fd: FormData) => Promise<void>>(async () => undefined);
    const result = await drainOutbox(submit);

    expect(submit).toHaveBeenCalledTimes(2);
    const firstFd = submit.mock.calls[0][0];
    expect(firstFd.get("date")).toBe("2026-06-11");
    expect(firstFd.get("cost")).toBe("45.00");
    expect(firstFd.get("fuelGrade")).toBe("91");
    expect(firstFd.get("lat")).toBe("41.8781");
    expect(firstFd.get("lng")).toBe("-87.6298");

    expect(result.synced).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(await listDrafts()).toHaveLength(0);
  });

  it("omits lat/lng from the payload when the draft has none", async () => {
    await saveDraft({ ...DRAFT, lat: undefined, lng: undefined });

    const submit = vi.fn<(fd: FormData) => Promise<void>>(async () => undefined);
    await drainOutbox(submit);

    const fd = submit.mock.calls[0][0];
    expect(fd.has("lat")).toBe(false);
    expect(fd.has("lng")).toBe(false);
  });

  it("keeps a failed draft in the outbox with the error message visible", async () => {
    await saveDraft(DRAFT);
    await saveDraft({ ...DRAFT, date: "2026-06-12" });

    const submit = vi.fn<(fd: FormData) => Promise<void>>(async (fd) => {
      if (fd.get("date") === "2026-06-11") throw new Error("Unauthorized");
    });

    const result = await drainOutbox(submit);

    expect(result.synced).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBe("Unauthorized");

    const remaining = await listDrafts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].date).toBe("2026-06-11");
    expect(remaining[0].lastError).toBe("Unauthorized");
  });
});
