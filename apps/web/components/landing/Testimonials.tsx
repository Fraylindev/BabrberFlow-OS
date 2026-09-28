import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const TESTIMONIALS = [
  {
    quote:
      "Antes perdíamos entre 4 y 6 clientes cada sábado porque nadie podía contestar el WhatsApp mientras cortaba cabello. Con Kortek, el cliente entra al link desde nuestro Instagram, elige el turno y le llega su confirmación sola. Facturamos un 35% más sin trabajar horas extra.",
    name: "Carlos Mendoza",
    role: "Fundador y Master Barber",
    business: "Mendoza Barber Studio",
    city: "Santo Domingo",
    metric: "+35% en facturación de fines de semana",
    initials: "CM",
  },
  {
    quote:
      "La separación de roles es lo más valioso. Mi recepcionista ve la pantalla completa de las 5 sillas y cobra rápido en mostrador. Cada barbero solo ve sus citas en su teléfono y no tiene acceso a las finanzas del negocio. Cero conflictos de dinero.",
    name: "Alejandro Peña",
    role: "Director General",
    business: "The Craft Club",
    city: "Santiago",
    metric: "5 barberos coordinados a la perfección",
    initials: "AP",
  },
  {
    quote:
      "Los clientes siempre nos felicitan porque la página de reservas abre en 1 segundo y no les exige bajar una app de 80MB ni inventarse una contraseña. Eligen servicio, barbero y listo. El absentismo nos bajó a prácticamente cero con los recordatorios.",
    name: "Manuel Rosario",
    role: "Propietario",
    business: "Élite Grooming Lounge",
    city: "La Romana",
    metric: "Menos del 1% de inasistencias",
    initials: "MR",
  },
  {
    quote:
      "Al final del día, el cuadre de caja tomaba casi una hora de sumar papelitos y revisar transferencias. Ahora con el módulo de facturación, sabemos con exactitud cuánto cobró cada quien y qué comisión le toca a cada barbero en 3 minutos exactos.",
    name: "David Herrera",
    role: "Dueño",
    business: "Herrera Barbershop",
    city: "Piantini, D.N.",
    metric: "Cierre de caja diario en 3 minutos",
    initials: "DH",
  },
  {
    quote:
      "Nos mudamos de otra plataforma que nos cobraba una comisión por cada cliente que reservaba. En Kortek el precio es fijo mensual y no nos quitan ni un solo peso de nuestros cortes. La diferencia económica a fin de mes es enorme.",
    name: "Marcos Santana",
    role: "Co-fundador",
    business: "Signature Cuts Studio",
    city: "Bella Vista",
    metric: "$0 comisiones por reserva",
    initials: "MS",
  },
  {
    quote:
      "Tener el enlace directo a WhatsApp listo para enviar recordatorios nos salvó los turnos muertos. Si un cliente no puede venir, cancela con tiempo y ese espacio se libera automáticamente para otro cliente en lista.",
    name: "Lucas Ramos",
    role: "Gerente Operativo",
    business: "Black Oak Studio",
    city: "Naco, D.N.",
    metric: "100% de sillas aprovechadas",
    initials: "LR",
  },
];

export function Testimonials() {
  return (
    <section id="testimonios" className="py-24 sm:py-32 relative border-t border-[var(--color-border)] bg-[var(--color-surface)]/20">
      <Container size="wide">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-brass)] font-semibold uppercase tracking-wider mb-4">
              Testimonios & Casos de Éxito
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-paper)]">
              La voz de quienes operan a diario en el sillón
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[var(--color-muted)]">
              Más de 120 barberías y salones confían en Kortek OS para proteger su tiempo, ordenar a su equipo y maximizar sus ingresos diarios.
            </p>
          </div>
        </Reveal>

        {/* Rejilla de 6 Testimonios */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => {
            const avatarColorClass = [
              "bg-[var(--color-brass)]/15 border-[var(--color-brass)]/40 text-[var(--color-brass)]",
              "bg-blue-500/15 border-blue-500/40 text-blue-400",
              "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
              "bg-purple-500/15 border-purple-500/40 text-purple-300",
              "bg-amber-500/15 border-amber-500/40 text-amber-300",
              "bg-teal-500/15 border-teal-500/40 text-teal-300",
            ][idx % 6];

            return (
              <Reveal key={t.name} delay={idx * 60} className="h-full">
                <div className="h-full flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-[var(--shadow-card)] hover:border-[var(--color-brass)]/50 hover:shadow-[0_8px_30px_-6px_rgba(225,29,46,0.12)] transition-all duration-300 group">
                  <div>
                    {/* 5 Estrellas Doradas */}
                    <div className="flex items-center gap-1 text-[var(--color-brass)] mb-4" aria-label="5 estrellas de calificación">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    <p className="text-sm leading-relaxed text-[var(--color-paper)]/90 italic">
                      &ldquo;{t.quote}&rdquo;
                    </p>

                    {/* Métrica Callout */}
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                      <span>✓</span>
                      <span>{t.metric}</span>
                    </div>
                  </div>

                  {/* Perfil del Autor */}
                  <div className="mt-6 flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-[family-name:var(--font-display)] text-xs font-bold transition-transform group-hover:scale-105 ${avatarColorClass}`}>
                      {t.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-[var(--color-paper)] truncate">{t.name}</p>
                        <span className="inline-flex items-center text-emerald-400" title="Propietario Verificado">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20" aria-label="Verificado">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] truncate">
                        {t.role} · {t.business}
                      </p>
                      <p className="text-[10px] text-[var(--color-faint)]">{t.city}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
