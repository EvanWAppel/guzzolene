/* IndexedDB-backed outbox for fill-up drafts captured while offline.
 * Drafts are queued by the add form (Stream D) and drained back through
 * the createPurchase server action once the network returns.
 */

export type FillUpDraft = {
  date: string;
  cost: string;
  gallons: string;
  pricePerGallon: string;
  odometer: string;
  fuelGrade: string;
  lat?: number;
  lng?: number;
};

export type StoredDraft = FillUpDraft & {
  id: number;
  createdAt: number;
  lastError?: string;
};

export type DrainResult = {
  synced: number;
  failed: { id: number; error: string }[];
};

const DB_NAME = "guzzolene-offline";
const DB_VERSION = 1;
const STORE = "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await requestToPromise(fn(db.transaction(STORE, mode).objectStore(STORE)));
  } finally {
    db.close();
  }
}

export async function saveDraft(draft: FillUpDraft): Promise<number> {
  const id = await withStore("readwrite", (store) =>
    store.add({ ...draft, createdAt: Date.now() }),
  );
  return id as number;
}

export async function listDrafts(): Promise<StoredDraft[]> {
  return withStore("readonly", (store) => store.getAll() as IDBRequest<StoredDraft[]>);
}

export async function deleteDraft(id: number): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

async function markDraftError(id: number, error: string): Promise<void> {
  const draft = await withStore("readonly", (store) => store.get(id) as IDBRequest<StoredDraft>);
  if (!draft) return;
  await withStore("readwrite", (store) => store.put({ ...draft, lastError: error }));
}

export function draftToFormData(draft: FillUpDraft): FormData {
  const fd = new FormData();
  fd.set("date", draft.date);
  fd.set("cost", draft.cost);
  fd.set("gallons", draft.gallons);
  fd.set("pricePerGallon", draft.pricePerGallon);
  fd.set("odometer", draft.odometer);
  fd.set("fuelGrade", draft.fuelGrade);
  if (draft.lat !== undefined && draft.lng !== undefined) {
    fd.set("lat", String(draft.lat));
    fd.set("lng", String(draft.lng));
  }
  return fd;
}

/** Submit every pending draft, deleting each on success. Failed drafts stay
 * in the outbox with `lastError` set so the UI can surface them — errors are
 * reported, never silently retried away. */
export async function drainOutbox(
  submit: (fd: FormData) => Promise<void>,
): Promise<DrainResult> {
  const drafts = await listDrafts();
  const result: DrainResult = { synced: 0, failed: [] };

  for (const draft of drafts) {
    try {
      await submit(draftToFormData(draft));
      await deleteDraft(draft.id);
      result.synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`outbox: draft ${draft.id} failed to sync:`, err);
      await markDraftError(draft.id, message);
      result.failed.push({ id: draft.id, error: message });
    }
  }

  return result;
}
