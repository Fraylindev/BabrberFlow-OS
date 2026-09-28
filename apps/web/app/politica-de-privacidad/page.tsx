import { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Política de Privacidad y Tratamiento de Datos",
  description: `Política de privacidad y protección de datos personales de ${BRAND.name}.`,
};

export default function PoliticaDePrivacidadPage() {
  return (
    <LegalLayout
      title="Política de Privacidad"
      subtitle="Explicamos con total transparencia cómo tratamos, protegemos y resguardamos los datos personales de negocios, profesionales y clientes bajo estándares internacionales y locales."
      lastUpdated="26 de septiembre de 2026"
      activeDoc="privacidad"
    >
      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            01
          </span>
          <span>Responsable del Tratamiento</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          El responsable del tratamiento de los datos personales recopilados a través de la plataforma {BRAND.name} es {BRAND.company}, con domicilio operativo en República Dominicana. Para cualquier inquietud referente a sus datos personales, puede comunicarse a través de nuestros canales oficiales de contacto.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            02
          </span>
          <span>Datos Personales Objeto de Tratamiento</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Recopilamos únicamente los datos necesarios y proporcionales para la prestación adecuada del servicio:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--color-muted)]">
          <li>
            <strong className="text-[var(--color-paper)]">Datos de cuenta y equipo:</strong> Nombre, dirección de correo electrónico, teléfono de contacto y rol dentro del establecimiento.
          </li>
          <li>
            <strong className="text-[var(--color-paper)]">Datos de clientes para citas:</strong> Nombre o apodo, número de teléfono (para coordinación y notificaciones de cita) y notas específicas de servicio si son provistas voluntariamente.
          </li>
          <li>
            <strong className="text-[var(--color-paper)]">Datos de uso técnico:</strong> Registros de acceso técnico, identificadores de sesión y telemetría de rendimiento estrictamente para diagnóstico y prevención de abusos.
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            03
          </span>
          <span>Finalidad del Tratamiento y Base Jurídica</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Tratamos sus datos con las siguientes finalidades esenciales:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--color-muted)]">
          <li>Gestionar y confirmar solicitudes de reservas y citas con los profesionales seleccionados.</li>
          <li>Facilitar a los establecimientos la administración de su cartera de clientes y control interno de agenda.</li>
          <li>Remitir recordatorios y enlaces de modificación de cita a través de canales directos (WhatsApp o correo).</li>
          <li>Garantizar la seguridad, integridad y trazabilidad técnica del sistema.</li>
        </ul>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          La base jurídica del tratamiento es la ejecución del contrato de servicio solicitado por el usuario y el consentimiento explícito manifestado al momento de agendar una reserva.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            04
          </span>
          <span>Aislamiento Multi-Tenancy y Seguridad</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Implementamos medidas de seguridad técnicas y organizativas de nivel empresarial. Cada organización cuenta con aislamiento tenant-scoped a nivel de base de datos. Ningún establecimiento ni usuario externo tiene capacidad de visualizar, consultar o modificar los datos de clientes pertenecientes a otro negocio.
        </p>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          El teléfono y datos de contacto de cada profesional no se exponen públicamente en directorios externos ni en rutas no autorizadas, respetando el principio de mínima exposición y privacidad laboral.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-brass)]/30 bg-[var(--color-brass)]/5 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/20 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/40">
            05
          </span>
          <span>Principio de No Venta de Datos</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]">
          <strong className="text-[var(--color-brass)]">{BRAND.name} no vende, alquila ni comercializa datos personales de sus clientes o negocios bajo ninguna circunstancia.</strong> Solo compartimos datos con proveedores tecnológicos de infraestructura de confianza bajo estrictos acuerdos de confidencialidad y procesamiento de datos (servidores cloud y pasarelas de mensajería).
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            06
          </span>
          <span>Derechos del Usuario (ARCO)</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Usted tiene derecho a acceder a sus datos personales, rectificarlos cuando sean inexactos, solicitar su supresión cuando ya no sean necesarios para los fines de la reserva o revocar el consentimiento previamente otorgado. Para ejercer cualquiera de estos derechos, puede ponerse en contacto con el establecimiento que gestiona su cita o directamente con nuestro equipo de soporte.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            07
          </span>
          <span>Plazo de Conservación y Eliminación</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Los datos personales se conservarán mientras se mantenga la relación contractual o sea necesario para dar cumplimiento a obligaciones contables o legales aplicables, procediéndose a su bloqueo y posterior eliminación segura una vez expirados dichos plazos.
        </p>
      </section>
    </LegalLayout>
  );
}
