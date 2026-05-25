import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { WorldEvent } from "@/lib/db/schema";

const { deleteEvent, updateEvent } = vi.hoisted(() => ({
  deleteEvent: vi.fn(async () => undefined),
  updateEvent: vi.fn(async () => undefined),
}));

vi.mock("@/actions/events", () => ({ deleteEvent, updateEvent }));

import EventList from "@/components/EventList";

function evt(overrides: Partial<WorldEvent> = {}): WorldEvent {
  return {
    id: "evt-1",
    userId: "u_1",
    name: "Test event",
    date: "2024-06-15",
    description: null,
    wikipediaUrl: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("EventList", () => {
  it("renders one row per event with edit and delete buttons", () => {
    render(
      <EventList
        events={[
          evt({ id: "a", name: "First" }),
          evt({ id: "b", name: "Second" }),
        ]}
      />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /edit/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(2);
  });

  it("clicking delete (then confirm) calls the action", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<EventList events={[evt({ id: "a", name: "First" })]} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(deleteEvent).toHaveBeenCalledWith("a");
  });
});
