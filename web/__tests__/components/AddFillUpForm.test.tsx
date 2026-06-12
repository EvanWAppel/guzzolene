import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const createPurchaseMock = vi.fn<(fd: FormData) => Promise<void>>(async () => undefined);
vi.mock("@/actions/purchases", () => ({
  createPurchase: (fd: FormData) => createPurchaseMock(fd),
}));

const saveDraftMock = vi.fn<(draft: unknown) => Promise<number>>(async () => 1);
vi.mock("@/lib/offline-outbox", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/offline-outbox")>()),
  saveDraft: (draft: unknown) => saveDraftMock(draft),
}));

import AddFillUpForm from "@/components/AddFillUpForm";

beforeEach(() => {
  createPurchaseMock.mockClear();
  saveDraftMock.mockClear();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

afterEach(() => {
  // Restore navigator.geolocation if a test set it.
  // @ts-expect-error — vitest jsdom adds it dynamically.
  delete navigator.geolocation;
});

function mockGeolocationSuccess(coords: { latitude: number; longitude: number }) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({ coords, timestamp: Date.now() } as GeolocationPosition),
    },
  });
}

function mockGeolocationDenied() {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (_ok: PositionCallback, err?: PositionErrorCallback) =>
        err?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
    },
  });
}

async function fillRequiredFieldsAndSubmit() {
  fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-05-25" } });
  fireEvent.change(screen.getByLabelText(/total cost/i), { target: { value: "45.00" } });
  fireEvent.change(screen.getByLabelText(/^gallons/i), { target: { value: "12.5" } });
  fireEvent.change(screen.getByLabelText(/price per gallon/i), { target: { value: "3.60" } });
  fireEvent.change(screen.getByLabelText(/odometer/i), { target: { value: "82000" } });
  fireEvent.click(screen.getByRole("button", { name: /save fill-up/i }));
  await waitFor(() => expect(createPurchaseMock).toHaveBeenCalled());
}

describe("AddFillUpForm fuel-grade dropdown", () => {
  it("renders a fuelGrade select with the expected options and defaults to 87", () => {
    render(<AddFillUpForm />);

    const select = screen.getByLabelText(/fuel grade/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
    expect(select.name).toBe("fuelGrade");
    expect(select.value).toBe("87");

    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(["87", "89", "91", "93", "diesel"]);
  });

  it("does not render any photo upload UI", () => {
    render(<AddFillUpForm />);
    expect(screen.queryByText(/drop pump photo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/extracting data with claude/i)).not.toBeInTheDocument();
  });

  it("numeric fields use inputMode=decimal for a mobile-friendly keypad", () => {
    render(<AddFillUpForm />);
    for (const label of [/total cost/i, /^gallons/i, /price per gallon/i, /odometer/i]) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input.inputMode).toBe("decimal");
    }
  });

  it("save button is anchored sticky to viewport bottom for one-handed use", () => {
    render(<AddFillUpForm />);
    const btn = screen.getByRole("button", { name: /save fill-up/i });
    const sticky = btn.closest("[data-sticky-save]");
    expect(sticky).not.toBeNull();
  });
});

describe("AddFillUpForm geolocation capture", () => {
  it("requests geolocation on mount and submits captured lat/lng", async () => {
    mockGeolocationSuccess({ latitude: 41.8781, longitude: -87.6298 });
    render(<AddFillUpForm />);

    await fillRequiredFieldsAndSubmit();

    const fd = createPurchaseMock.mock.calls[0][0] as FormData;
    expect(fd.get("lat")).toBe("41.8781");
    expect(fd.get("lng")).toBe("-87.6298");
  });

  it("submits without lat/lng when permission is denied", async () => {
    mockGeolocationDenied();
    render(<AddFillUpForm />);

    await fillRequiredFieldsAndSubmit();

    const fd = createPurchaseMock.mock.calls[0][0] as FormData;
    expect(fd.has("lat")).toBe(false);
    expect(fd.has("lng")).toBe(false);
  });

  it("submits without lat/lng when geolocation is unsupported", async () => {
    // navigator.geolocation deliberately not set.
    render(<AddFillUpForm />);

    await fillRequiredFieldsAndSubmit();

    const fd = createPurchaseMock.mock.calls[0][0] as FormData;
    expect(fd.has("lat")).toBe(false);
    expect(fd.has("lng")).toBe(false);
  });
});

describe("AddFillUpForm offline capture", () => {
  function fillFields() {
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-06-11" } });
    fireEvent.change(screen.getByLabelText(/total cost/i), { target: { value: "45.00" } });
    fireEvent.change(screen.getByLabelText(/^gallons/i), { target: { value: "12.5" } });
    fireEvent.change(screen.getByLabelText(/price per gallon/i), { target: { value: "3.60" } });
    fireEvent.change(screen.getByLabelText(/odometer/i), { target: { value: "82000" } });
  }

  it("offline submit saves a draft to the outbox instead of calling the server action", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<AddFillUpForm />);

    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /save fill-up/i }));

    await waitFor(() => expect(saveDraftMock).toHaveBeenCalledTimes(1));
    expect(createPurchaseMock).not.toHaveBeenCalled();

    expect(saveDraftMock.mock.calls[0][0]).toMatchObject({
      date: "2026-06-11",
      cost: "45.00",
      gallons: "12.5",
      pricePerGallon: "3.60",
      odometer: "82000",
      fuelGrade: "87",
    });
  });

  it("shows a queued indicator after an offline submit", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<AddFillUpForm />);

    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /save fill-up/i }));

    expect(await screen.findByText(/queued — will sync when online/i)).toBeInTheDocument();
  });

  it("online submit still calls the server action, not the outbox", async () => {
    render(<AddFillUpForm />);

    await fillRequiredFieldsAndSubmit();

    expect(saveDraftMock).not.toHaveBeenCalled();
  });
});
