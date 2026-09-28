import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SnapshotShareButton from "@/components/SnapshotShareButton";

/**
 * Stream J (J-3): the "share this view" affordance. It is a self-contained
 * client component that turns a server-signed token into a copyable snapshot
 * URL (`/s/<token>`) rooted at the current origin. It never signs anything
 * itself (the secret stays server-side) — it only builds and copies the link.
 */

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

describe("SnapshotShareButton (J-3)", () => {
  it("renders an accessible share control", () => {
    render(<SnapshotShareButton token="tok123" />);
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("copies the origin-rooted /s/<token> URL to the clipboard on click", async () => {
    render(<SnapshotShareButton token="tok123" />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/tok123`);
  });

  it("confirms the copy to the user", async () => {
    render(<SnapshotShareButton token="tok123" />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
    await waitFor(() => expect(screen.getByText(/copied/i)).toBeInTheDocument());
  });
});
