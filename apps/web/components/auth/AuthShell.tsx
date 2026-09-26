import { Brand } from "@/components/Brand";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Brand />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-brass)]">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              {description}
            </p>
          </div>
        </div>
        <div className="flex justify-center">{children}</div>
      </div>
    </main>
  );
}
