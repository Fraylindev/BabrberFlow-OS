import { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: `Política de cookies y tecnologías de almacenamiento local de ${BRAND.name}.`,
};

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Política de Cookies"
      subtitle="Conozca el uso responsable y mínimo de cookies y almacenamiento web que empleamos para garantizar el funcionamiento técnico del servicio."
      lastUpdated="26 de septiembre de 2026"
      activeDoc="cookies"
    >
      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            01
          </span>
          <span>¿Qué son las Cookies y Almacenamiento Local?</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Las cookies son pequeños ficheros de texto que los sitios web descargan en su dispositivo (computadora, tableta o teléfono móvil) al navegar por determinadas páginas. Además de las cookies tradicionales, las aplicaciones web modernas utilizan tecnologías equivalentes como el almacenamiento local (localStorage o sessionStorage) para guardar configuraciones de navegación temporal.
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            02
          </span>
          <span>¿Qué Cookies y Almacenamiento Emplea {BRAND.name}?</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          En {BRAND.name} seguimos un principio de mínima huella digital. Solo empleamos almacenamiento estrictamente necesario para la funcionalidad operativa de la aplicación:
        </p>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-paper)]">
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Finalidad</th>
                <th className="p-3.5">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-xs text-[var(--color-muted)]">
              <tr className="hover:bg-[var(--color-surface)]/50 transition-colors">
                <td className="p-3.5 font-medium text-[var(--color-paper)]">Sesión y Autenticación</td>
                <td className="p-3.5">Identificar al usuario autenticado y proteger el panel de administración contra accesos no autorizados.</td>
                <td className="p-3.5 font-mono text-[var(--color-brass)]">Sesión</td>
              </tr>
              <tr className="hover:bg-[var(--color-surface)]/50 transition-colors">
                <td className="p-3.5 font-medium text-[var(--color-paper)]">Flujo de Reserva</td>
                <td className="p-3.5">Almacenar de forma efímera los pasos de selección (servicio, barbero, hora) mientras el cliente final completa su cita.</td>
                <td className="p-3.5 font-mono text-[var(--color-brass)]">Temporal</td>
              </tr>
              <tr className="hover:bg-[var(--color-surface)]/50 transition-colors">
                <td className="p-3.5 font-medium text-[var(--color-paper)]">Seguridad CSRF</td>
                <td className="p-3.5">Proteger las peticiones contra falsificación de peticiones en sitios cruzados.</td>
                <td className="p-3.5 font-mono text-[var(--color-brass)]">Sesión</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
            03
          </span>
          <span>Ausencia de Cookies Publicitarias o de Rastreo Cruzado</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]">
          <strong className="text-emerald-400">No utilizamos cookies publicitarias de terceros, ni píxeles de retargeting ni redes de rastreo de comportamiento publicitario.</strong> Creemos firmemente en el respeto a la privacidad del profesional y de sus clientes finales.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            04
          </span>
          <span>¿Cómo Puede Gestionar o Desactivar las Cookies?</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Usted puede restringir, bloquear o borrar las cookies de este o cualquier otro sitio web mediante la configuración de su navegador web (Chrome, Safari, Firefox, Edge). Tenga en cuenta que, dado que nuestras cookies son estrictamente técnicas, desactivarlas por completo podría impedir el inicio de sesión en el panel o el funcionamiento del flujo de reservas.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-6 sm:p-7 backdrop-blur-sm">
        <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--color-brass)] bg-[var(--color-brass)]/10 px-2 py-0.5 rounded-md border border-[var(--color-brass)]/20">
            05
          </span>
          <span>Modificaciones</span>
        </h2>
        <p className="leading-relaxed text-[var(--color-paper)]/90">
          Nos reservamos el derecho de actualizar esta Política de Cookies en función de innovaciones técnicas o modificaciones normativas. Cualquier cambio será publicado de forma inmediata en esta misma página con su fecha de revisión actualizada.
        </p>
      </section>
    </LegalLayout>
  );
}
