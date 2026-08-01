import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { Features } from "@/components/landing/Features";
import { Modules } from "@/components/landing/Modules";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <Benefits />
        <Features />
        <Modules />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTASection />
      </main>
      <LandingFooter />
    </>
  );
}
