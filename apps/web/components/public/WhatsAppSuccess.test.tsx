import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuccessView } from "@/app/[slug]/_components/SuccessView";
import { WHATSAPP_EXPLANATION, WHATSAPP_MESSAGE } from "@/lib/whatsapp-link";
import type { PublicBookingResult } from "@/lib/api";

const result: PublicBookingResult = {
  booking: {
    id: "booking-private-id", serviceId: "service-1", professionalId: "professional-1",
    startTime: "2099-01-05T14:00:00.000Z", endTime: "2099-01-05T14:30:00.000Z", status: "PENDING",
  },
  accountCreated: false, accountCreationError: null,
};
const props = {
  result, organizationPhone: "+18095551234", serviceName: "Servicio privado",
  professionalName: "Profesional privado", timeZone: 'America/Santo_Domingo',
};

describe("WhatsApp C2 SuccessView", () => {
  it("uses one native accessible link, generic text and no automatic or click-driven JS popup", () => {
    const open = vi.spyOn(window, "open");
    const { rerender } = render(<SuccessView {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent("Tu reserva quedó registrada");
    const link = screen.getByRole("link", { name: "Abrir WhatsApp (se abre en una pestaña nueva)" });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAccessibleDescription(WHATSAPP_EXPLANATION);
    expect(link.querySelector("button, a, input, [role=button]")).toBeNull();
    expect(link.parentElement?.closest("button, a, [role=button]")).toBeNull();
    const url = new URL(link.getAttribute("href")!);
    expect([...url.searchParams]).toEqual([["text", WHATSAPP_MESSAGE]]);
    expect(url.href).not.toMatch(/private|2099|Servicio|Profesional/);
    fireEvent.click(link);
    fireEvent.click(link);
    rerender(<SuccessView {...props} />);
    expect(open).not.toHaveBeenCalled();
    expect(result.booking.status).toBe("PENDING");
  });

  it.each([null, "", "8095551234", "+18095551234\n"])("omits link and explanation for %j", (phone) => {
    render(<SuccessView {...props} organizationPhone={phone} />);
    expect(screen.getByRole("status")).toHaveTextContent("Tu reserva quedó registrada");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(WHATSAPP_EXPLANATION)).not.toBeInTheDocument();
  });

  it("changes only to the newly provided published recipient", () => {
    const { rerender } = render(<SuccessView {...props} />);
    rerender(<SuccessView {...props} organizationPhone="+34912345678" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", expect.stringContaining("https://wa.me/34912345678?"));
    rerender(<SuccessView {...props} organizationPhone={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
