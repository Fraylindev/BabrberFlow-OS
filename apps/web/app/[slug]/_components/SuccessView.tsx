import { useId } from "react";
import { PublicBookingResult } from "@/lib/api";
import { bookingWhatsAppLink, WHATSAPP_EXPLANATION } from "@/lib/whatsapp-link";
import { formatCalendarDate } from '@/lib/business-time';
import { clockLabel } from '@/lib/business-schedule';

interface SuccessViewProps {
  result: PublicBookingResult;
  organizationPhone: string | null;
  serviceName?: string;
  professionalName?: string;
  date: string;
  time: string;
}

export function SuccessView({
  result,
  organizationPhone,
  serviceName,
  professionalName,
  date,
  time,
}: SuccessViewProps) {
  const link = bookingWhatsAppLink(organizationPhone);
  const explanationId = useId();

  return (
    <div className="text-center">
      <p role="status" className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
        Tu reserva quedó registrada
      </p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {serviceName} el {formatCalendarDate(date, 'long')} a las {clockLabel(time)} con {professionalName}.
      </p>
      {result.accountCreated && (
        <p className="mt-2 text-xs text-[var(--color-success)]">
          Tu cuenta fue creada — la próxima vez puedes iniciar sesión con tu correo.
        </p>
      )}
      {link && (
        <div className="mt-6">
          <p id={explanationId} className="text-sm leading-6 text-[var(--color-muted)]">
            {WHATSAPP_EXPLANATION}
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir WhatsApp (se abre en una pestaña nueva)"
            aria-describedby={explanationId}
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-sm bg-[var(--color-brass)] px-6 py-3 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-brass-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-brass)]"
          >
            Abrir WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
