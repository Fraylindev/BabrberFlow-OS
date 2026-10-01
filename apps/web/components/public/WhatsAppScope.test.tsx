import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { api, type PublicBookingResult } from "@/lib/api";
import { PublicMiniSite } from "./PublicMiniSite";

it("ignores a late POST from the previous visit after slug A → B → A", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  vi.spyOn(api, "get").mockImplementation(async (path) => {
    if (path.includes("/availability")) return {
      date: "2099-01-05", serviceId: "service-qa", slots: [{
        time: "10:00", professionalId: "professional-qa", startTime: "2099-01-05T14:00:00.000Z",
      }],
    };
    const slug = path.split("/")[2];
    return {
      minimumBookingDate: "2026-09-14",
      timeZone: 'America/Santo_Domingo',
      organization: { slug, name: `Estudio ${slug}`, phone: slug === "a" ? "+18095551234" : "+34912345678",
        description: null, address: null, googleMapsUrl: null },
      services: [{ id: "service-qa", name: "Corte QA", description: null, duration: 30, price: "500.00" }],
      professionals: [{ id: "professional-qa", name: "Alex QA", bio: null, avatar: null }],
    };
  });
  let resolvePost!: (value: PublicBookingResult) => void;
  vi.spyOn(api, "post").mockImplementation(() => new Promise((resolve) => { resolvePost = resolve; }));
  const open = vi.spyOn(window, "open");
  Element.prototype.scrollIntoView = vi.fn();
  // Match the actual /[slug]/page.tsx key, which destroys the previous visit's state.
  const view = (slug: string) => <QueryClientProvider client={client}><PublicMiniSite key={slug} slug={slug} /></QueryClientProvider>;
  const { rerender } = render(view("a"));
  fireEvent.click(await screen.findByRole("button", { name: "Reservar cita" }));
  fireEvent.click(await screen.findByRole("button", { name: /Corte QA/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: /Alex QA/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2099-01-05" } });
  fireEvent.click(await screen.findByRole("button", { name: "10:00 a. m." }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Visitante QA" } });
  fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "8095554321" } });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  rerender(view("b"));
  await screen.findByRole("heading", { level: 1, name: "Estudio b" });
  expect(screen.queryByRole("link", { name: /Abrir WhatsApp/ })).not.toBeInTheDocument();
  rerender(view("a"));
  await screen.findByRole("heading", { level: 1, name: "Estudio a" });
  await act(async () => resolvePost({
    booking: { id: "old-booking", serviceId: "service-qa", professionalId: "professional-qa",
      startTime: "2099-01-05T14:00:00.000Z", endTime: "2099-01-05T14:30:00.000Z", status: "PENDING" },
    accountCreated: false, accountCreationError: null,
  }));
  expect(screen.queryByText("Tu reserva quedó registrada")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Abrir WhatsApp/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reservar cita" })).toBeVisible();
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(open).not.toHaveBeenCalled();
});
