import { Button } from "@/components/ui/Button";
import { PublicBookingResult } from "@/lib/api";
import { waLink } from "./shared";

interface SuccessViewProps {
  result: PublicBookingResult;
  organizationName: string;
  organizationPhone: string | null;
  serviceName?: string;
  professionalName?: string;
  date: string;
  time: string;
}

export function SuccessView({
  result,
  organizationName,
  organizationPhone,
  serviceName,
  professionalName,
  date,
  time,
}: SuccessViewProps) {
  const link = waLink(organizationPhone, `Hola! Quería confirmar mi cita en ${organizationName}.`);

  return (
    <div className="text-center">
      <p className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
        ¡Tu cita quedó confirmada!
      </p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {serviceName} el {date} a las {time} con {professionalName}.
      </p>
      {result.accountCreated && (
        <p className="mt-2 text-xs text-[var(--color-success)]">
          Tu cuenta fue creada — la próxima vez puedes iniciar sesión con tu correo.
        </p>
      )}
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
          <Button className="px-6 py-3">Abrir WhatsApp</Button>
        </a>
      )}
    </div>
  );
}
