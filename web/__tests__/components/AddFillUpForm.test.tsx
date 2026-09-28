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

  it("renders the photo-assisted entry control in the normal (authed) form", () => {
    render(<AddFillUpForm />);
    expect(screen.getByLabelText(/scan pump/i)).toBeInTheDocument();
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

describe("AddFillUpForm photo-assisted entry (extract-and-discard)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function selectPhoto() {
    const input = screen.getByLabelText(/scan pump/i) as HTMLInputElement;
    const file = new File(["fake-jpeg-bytes"], "pump.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
  }

  it("posts the photo to the auth-gated endpoint and populates editable draft fields", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalCost: 52.4,
        gallons: 13.2,
        pricePerGallon: 3.97,
        odometer: 91000,
        fuelGrade: "91",
      }),
    });
    render(<AddFillUpForm />);

    selectPhoto();

    await waitFor(() =>
      expect((screen.getByLabelText(/total cost/i) as HTMLInputElement).value).toBe("52.4"),
    );
    expect((screen.getByLabelText(/^gallons/i) as HTMLInputElement).value).toBe("13.2");
    expect((screen.getByLabelText(/price per gallon/i) as HTMLInputElement).value).toBe("3.97");
    expect((screen.getByLabelText(/odometer/i) as HTMLInputElement).value).toBe("91000");
    expect((screen.getByLabelText(/fuel grade/i) as HTMLSelectElement).value).toBe("91");

    // Populated fields remain EDITABLE drafts, not locked.
    fireEvent.change(screen.getByLabelText(/total cost/i), { target: { value: "60.00" } });
    expect((screen.getByLabelText(/total cost/i) as HTMLInputElement).value).toBe("60.00");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/extract-pump",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows a visible error and falls back to manual entry when extraction fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<AddFillUpForm />);

    selectPhoto();

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();

    // Manual entry still works: fill the required date, Save becomes enabled.
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-05-25" } });
    expect(screen.getByRole("button", { name: /save fill-up/i })).not.toBeDisabled();
  });

  it("does NOT render the photo control in demo mode (no extraction path on /demo)", () => {
    render(<AddFillUpForm onDemoSubmit={async () => {}} />);
    expect(screen.queryByLabelText(/scan pump/i)).not.toBeInTheDocument();
  });
});
