import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Marquee } from "@/components/landing/Marquee";
import { Story } from "@/components/landing/Story";
import { Benefits } from "@/components/landing/Benefits";
import { Modules } from "@/components/landing/Modules";
import { Proof } from "@/components/landing/Proof";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <Marquee />
        <Story />
        <Benefits />
        <Modules />
        <Proof />
        <FAQ />
        <CTASection />
      </main>
      <LandingFooter />
    </>
  );
}
