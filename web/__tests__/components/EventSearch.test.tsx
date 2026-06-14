import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { saveEvent } = vi.hoisted(() => ({
  saveEvent: vi.fn<(fd: FormData) => Promise<void>>(async () => undefined),
}));
const { searchWikipedia } = vi.hoisted(() => ({
  searchWikipedia: vi.fn(async () => [
    { pageid: 1, title: "Test article", snippet: "test snippet" },
  ]),
}));

vi.mock("@/actions/events", () => ({ saveEvent }));
vi.mock("@/actions/wikipedia", () => ({ searchWikipedia }));

import EventSearch from "@/components/EventSearch";

describe("EventSearch pin-to-public-home toggle", () => {
  it("hides the toggle for non-admin users", async () => {
    render(<EventSearch isAdmin={false} />);
    fireEvent.change(screen.getByPlaceholderText(/search wikipedia/i), {
      target: { value: "iran" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await screen.findByText("Test article");
    fireEvent.click(screen.getByText("Test article"));
    expect(screen.queryByLabelText(/pin to public home/i)).not.toBeInTheDocument();
  });

  it("shows the toggle for admin users and includes its value in the submit payload", async () => {
    render(<EventSearch isAdmin={true} />);
    fireEvent.change(screen.getByPlaceholderText(/search wikipedia/i), {
      target: { value: "iran" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await screen.findByText("Test article");
    fireEvent.click(screen.getByText("Test article"));

    const toggle = screen.getByLabelText(/pin to public home/i) as HTMLInputElement;
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText(/event date/i), {
      target: { value: "2024-06-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add to charts/i }));

    expect(saveEvent).toHaveBeenCalledOnce();
    const fd = saveEvent.mock.calls[0][0] as FormData;
    expect(fd.get("pinToPublic")).toBe("1");
  });
});

describe("EventSearch result states", () => {
  it("surfaces an error message when the search fails", async () => {
    searchWikipedia.mockRejectedValueOnce(new Error("Wikipedia search failed: 503"));
    render(<EventSearch />);
    fireEvent.change(screen.getByPlaceholderText(/search wikipedia/i), {
      target: { value: "iran" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/wikipedia search failed/i);
  });

  it("shows a no-results message when the search returns nothing", async () => {
    searchWikipedia.mockResolvedValueOnce([]);
    render(<EventSearch />);
    fireEvent.change(screen.getByPlaceholderText(/search wikipedia/i), {
      target: { value: "zzzznomatches" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
  });
});
