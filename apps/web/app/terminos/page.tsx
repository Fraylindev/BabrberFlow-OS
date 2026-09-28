import { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Términos del Servicio",
  description: `Términos y condiciones de uso de la plataforma ${BRAND.name}.`,
};

export default function TerminosPage() {
  return (
    <LegalLayout
      title="Términos del Servicio"
      subtitle="Condiciones generales que regulan el acceso y uso de la plataforma Kortek Booking para propietarios, profesionales y clientes."
      lastUpdated="26 de septiembre de 2026"
      activeDoc="terminos"
    >
      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            01
          </span>
          <span>Aceptación y Ámbito de Aplicación</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Al acceder o utilizar {BRAND.name} (en adelante, la &quot;Plataforma&quot;), operada bajo la titularidad de {BRAND.company}, usted acepta quedar vinculado por los presentes Términos del Servicio. Si utiliza la Plataforma en representación de un establecimiento comercial (barbería, salón o negocio afín), manifiesta contar con la autoridad legal para vincular a dicha entidad a estos términos.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            02
          </span>
          <span>Descripción del Servicio y Multi-Tenancy</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          {BRAND.name} es una solución tecnológica de software como servicio (SaaS) diseñada para la gestión operativa de barberías y salones, incluyendo agenda de citas, directorio de profesionales, catálogo de servicios, registro interno de facturación y sitio público de reservas para clientes finales.
        </p>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          La arquitectura de la Plataforma es multi-tenant, garantizando el aislamiento lógico y estricto de los datos entre diferentes organizaciones. Cada negocio tiene acceso exclusivo a su propia información de clientes, citas y finanzas mediante credenciales autenticadas y controles de acceso basados en roles.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            03
          </span>
          <span>Cuentas, Roles y Responsabilidad de Acceso</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          El acceso al panel de administración requiere la creación de una cuenta y la asignación de una membresía organizacional. Los roles definidos (Dueño, Administrador, Recepción, Profesional/Barbero) determinan el alcance de visibilidad y permisos en la Plataforma.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--color-muted)]">
          <li>Usted es responsable de custodiar la confidencialidad de sus credenciales de acceso.</li>
          <li>Cada profesional tiene derecho y responsabilidad sobre la gestión de su propio perfil operativo y horarios de disponibilidad.</li>
          <li>Cualquier actividad efectuada bajo su cuenta se considerará realizada por usted o bajo su autorización directa.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            04
          </span>
          <span>Reservas de Clientes y Cancelaciones</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          La Plataforma permite a los clientes finales solicitar citas de manera directa y pública. El establecimiento es el único responsable de definir los precios de sus servicios, los horarios de atención y las políticas de cancelación o penalidad aplicables a sus citas.
        </p>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          {BRAND.name} actúa como facilitador tecnológico y no asume responsabilidad directa por la prestación de los servicios de peluquería, demoras, ausencias involuntarias o discrepancias entre el profesional y el cliente final.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            05
          </span>
          <span>Notificaciones y Mensajería Transaccional</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Al confirmar una cita o registrar un número telefónico o correo electrónico, el usuario y el cliente final consienten expresamente la recepción de mensajes transaccionales necesarios para la operación de la cita (confirmaciones, recordatorios o enlaces de gestión vía WhatsApp o email). No utilizamos dichos canales para fines publicitarios no autorizados ni cesión a terceros.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            06
          </span>
          <span>Propiedad Intelectual</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Todos los derechos de propiedad intelectual, software, código fuente, logotipos, diseños visuales y marcas asociadas a {BRAND.name} son propiedad exclusiva de {BRAND.company}. El establecimiento conserva en todo momento la titularidad sobre sus datos comerciales, logotipos propios y material multimedia cargado en su perfil.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            07
          </span>
          <span>Disponibilidad y Limitación de Responsabilidad</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Procuramos una disponibilidad de servicio continua y de alta fiabilidad; no obstante, el servicio se suministra &quot;tal cual&quot; y según disponibilidad, sin garantías de operatividad ininterrumpida frente a incidencias técnicas ajenas, tareas de mantenimiento programado o fallos de proveedores de infraestructura externa.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            08
          </span>
          <span>Ley Aplicable y Jurisdicción</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Los presentes Términos se rigen e interpretan de conformidad con las leyes de la República Dominicana. Para cualquier controversia derivada del uso de la Plataforma, las partes se someten a la jurisdicción de los tribunales competentes de la República Dominicana.
        </p>
      </section>
    </LegalLayout>
  );
}
