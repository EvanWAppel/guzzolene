import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const drainOutboxMock = vi.fn<
  (submit: (fd: FormData) => Promise<void>) => Promise<{ synced: number; failed: { id: number; error: string }[] }>
>(async () => ({ synced: 0, failed: [] }));
vi.mock("@/lib/offline-outbox", () => ({
  drainOutbox: (submit: (fd: FormData) => Promise<void>) => drainOutboxMock(submit),
}));

vi.mock("@/actions/purchases", () => ({
  createPurchase: vi.fn(async () => undefined),
}));

const refreshMock = vi.fn();
// Stable object, matching the real useRouter contract — a fresh object per
// render would invalidate the component's useCallback deps every render.
const routerMock = { refresh: refreshMock };
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

import OutboxSync from "@/components/OutboxSync";

beforeEach(() => {
  drainOutboxMock.mockClear();
  refreshMock.mockClear();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

describe("OutboxSync", () => {
  it("drains the outbox on mount", async () => {
    render(<OutboxSync />);
    await waitFor(() => expect(drainOutboxMock).toHaveBeenCalledTimes(1));
  });

  it("drains the outbox when the window fires an online event", async () => {
    render(<OutboxSync />);
    await waitFor(() => expect(drainOutboxMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(drainOutboxMock).toHaveBeenCalledTimes(2));
  });

  it("refreshes the route after drafts sync so the new rows render", async () => {
    drainOutboxMock.mockResolvedValueOnce({ synced: 2, failed: [] });
    render(<OutboxSync />);

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("surfaces a visible error when drafts fail to sync", async () => {
    drainOutboxMock.mockResolvedValueOnce({
      synced: 0,
      failed: [{ id: 1, error: "Unauthorized" }],
    });
    render(<OutboxSync />);

    expect(await screen.findByText(/1 queued fill-up failed to sync/i)).toBeInTheDocument();
    expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
  });

  it("renders nothing when there is nothing to report", async () => {
    const { container } = render(<OutboxSync />);
    await waitFor(() => expect(drainOutboxMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
