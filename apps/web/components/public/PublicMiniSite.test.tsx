import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, PublicBookingData } from "@/lib/api";
import { PublicMiniSite } from "./PublicMiniSite";

vi.mock('@/lib/queries/media', () => ({
  usePublicMedia: () => ({ data: null, isError: false, error: null, isFetching: false, refetch: vi.fn() }),
}));

const published: PublicBookingData = {
  minimumBookingDate: "2026-09-13",
  timeZone: 'America/Santo_Domingo',
  organization: {
    name: "Estudio Norte",
    slug: "estudio-norte",
    phone: "+18095551234",
    description: "Cortes cuidados y atención con cita.",
    address: "Calle Principal 10",
    googleMapsUrl: "https://www.google.com/maps/place/Test",
  },
  services: [
    {
      id: "service-1",
      name: "Corte clásico",
      description: "Corte personalizado",
      duration: 30,
      price: "500.00",
    },
  ],
  professionals: [
    {
      id: "professional-1",
      name: "Alex",
      bio: "Barbero",
      avatar: null,
    },
  ],
};

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PublicMiniSite slug="estudio-norte" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(api, "get").mockResolvedValue(published);
  vi.spyOn(api, "post").mockResolvedValue({});
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => focusManager.setFocused(undefined));

describe("Mini-sitio público C3", () => {
  it("muestra únicamente el perfil publicado y enlaces seguros", async () => {
    mount();

    expect(await screen.findByRole("heading", { level: 1, name: "Estudio Norte" })).toBeVisible();
    expect(screen.getByText("Cortes cuidados y atención con cita.")).toBeVisible();
    expect(screen.getByText("Calle Principal 10")).toBeVisible();
    expect(screen.getByRole("link", { name: "Llamar al +18095551234" })).toHaveAttribute(
      "href",
      "tel:+18095551234",
    );
    expect(screen.getByRole("link", { name: "Abrir en Google Maps" })).toHaveAttribute(
      "href",
      published.organization.googleMapsUrl,
    );
    expect(document.body.textContent).not.toMatch(/organizationId|private@example|tenant-/);
  });

  it("revalida la publicación antes de abrir el asistente y mueve el foco", async () => {
    mount();
    await screen.findByRole("button", { name: "Reservar cita" });

    fireEvent.click(screen.getByRole("button", { name: "Reservar cita" }));

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Reserva tu cita en Estudio Norte",
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(api.get).toHaveBeenLastCalledWith("/public/estudio-norte/booking-data");
    expect(heading).toHaveFocus();
    expect(screen.getByRole("progressbar", { name: "Progreso de la reserva" })).toHaveAttribute(
      "aria-valuenow",
      "17",
    );
    expect(screen.getByText("Corte clásico")).toBeVisible();
  });

  it("revalida al recuperar foco aunque los datos aún estén frescos", async () => {
    mount();
    await screen.findByRole("heading", { level: 1, name: "Estudio Norte" });
    expect(api.get).toHaveBeenCalledTimes(1);

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it("reemplaza contenido previo por la presentación neutra si se retira al iniciar", async () => {
    mount();
    await screen.findByRole("button", { name: "Reservar cita" });
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError(404, "Información no disponible."));

    fireEvent.click(screen.getByRole("button", { name: "Reservar cita" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Esta página no está disponible" }),
    ).toBeVisible();
    expect(screen.queryByText("Estudio Norte")).not.toBeInTheDocument();
    expect(screen.queryByText("Información no disponible.")).not.toBeInTheDocument();
  });

  it("distingue un fallo recuperable de una página retirada", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError(503, "Prisma private detail"));
    mount();

    expect(
      await screen.findByRole("heading", { level: 1, name: "No pudimos cargar esta página" }),
    ).toBeVisible();
    expect(screen.queryByText(/Prisma/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Estudio Norte" })).toBeVisible();
  });

  it("conserva el perfil y explica el vacío cuando la reserva no es posible", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ ...published, professionals: [] });
    mount();

    expect(await screen.findByRole("heading", { level: 1, name: "Estudio Norte" })).toBeVisible();
    expect(screen.getByText("Las reservas en línea no están disponibles por ahora.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reservar cita" })).not.toBeInTheDocument();
  });

  it("omite limpiamente las secciones editoriales opcionales vacías", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ...published,
      organization: {
        ...published.organization,
        phone: null,
        description: null,
        address: null,
        googleMapsUrl: null,
      },
    });
    mount();

    expect(await screen.findByRole("heading", { level: 1, name: "Estudio Norte" })).toBeVisible();
    expect(screen.queryByText("Nuestra ubicación")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Llamar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reservar cita" })).toBeVisible();
  });

  it("usa la fecha mínima y el instante UTC autoritativos del backend", async () => {
    vi.mocked(api.get)
      .mockReset()
      .mockResolvedValueOnce(published)
      .mockResolvedValueOnce(published)
      .mockResolvedValueOnce({
        date: "2099-01-05",
        serviceId: "service-1",
        slots: [
          {
            time: "10:00",
            professionalId: "professional-1",
            startTime: "2099-01-05T14:00:00.000Z",
          },
        ],
      });
    vi.mocked(api.post).mockResolvedValueOnce({
      booking: {
        id: "booking-1",
        serviceId: "service-1",
        professionalId: "professional-1",
        startTime: "2099-01-05T14:00:00.000Z",
        endTime: "2099-01-05T14:30:00.000Z",
        status: "PENDING",
      },
      accountCreated: false,
      accountCreationError: null,
    });
    vi.spyOn(window, "open").mockImplementation(() => null);
    mount();

    fireEvent.click(await screen.findByRole("button", { name: "Reservar cita" }));
    fireEvent.click(await screen.findByRole("button", { name: /Corte clásico/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: /Alex/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    const dateInput = screen.getByLabelText("Fecha");
    expect(dateInput).toHaveAttribute("min", published.minimumBookingDate);
    fireEvent.change(dateInput, { target: { value: "2099-01-05" } });
    fireEvent.click(await screen.findByRole("button", { name: "10:00 a. m." }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Cliente QA" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono"), {
      target: { value: "8095551234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/public/estudio-norte/bookings", {
        serviceId: "service-1",
        professionalId: "professional-1",
        startTime: "2099-01-05T14:00:00.000Z",
        clientName: "Cliente QA",
        clientPhone: "8095551234",
        clientEmail: undefined,
        createAccount: false,
        password: undefined,
      }),
    );
  });
});
