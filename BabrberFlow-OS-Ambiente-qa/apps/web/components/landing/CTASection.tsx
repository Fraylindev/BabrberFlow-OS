import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <Image
        src={LANDING_PHOTOS.storyInterior.src}
        alt=""
        fill
        sizes="100vw"
        className="cinematic-grade object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[var(--color-ink)]/85"
      />
      <div aria-hidden className="film-grain absolute inset-0" />

      <Container className="relative text-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--color-paper)] sm:text-5xl">
            Tu agenda merece algo mejor que un cuaderno
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-[var(--color-paper)]/75">
            Regístrate en minutos. Sin tarjeta de crédito para empezar.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button className="px-6 py-3 text-base">Registra tu barbería gratis</Button>
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
