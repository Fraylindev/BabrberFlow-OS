import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Marquee } from "@/components/landing/Marquee";
import { Story } from "@/components/landing/Story";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { Benefits } from "@/components/landing/Benefits";
import { Modules } from "@/components/landing/Modules";
import { Pricing } from "@/components/landing/Pricing";
import { Proof } from "@/components/landing/Proof";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/landing/ScrollToTop";
import { CookieBanner } from "@/components/landing/CookieBanner";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-paper)]">
      <LandingNav />
      <main>
        <Hero />
        <Marquee />
        <Story />
        <FeaturesBento />
        <InteractiveDemo />
        <Benefits />
        <Modules />
        <Pricing />
        <Proof />
        <Testimonials />
        <FAQ />
        <CTASection />
      </main>
      <LandingFooter />
      <ScrollToTop />
      <CookieBanner />
    </div>
  );
}
