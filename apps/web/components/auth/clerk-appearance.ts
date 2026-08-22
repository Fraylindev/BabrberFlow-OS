export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] shadow-none",
    headerTitle: "text-[var(--color-paper)] font-[family-name:var(--font-display)]",
    headerSubtitle: "text-[var(--color-muted)]",
    socialButtonsBlockButton:
      "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-paper)] hover:bg-[var(--color-border)]",
    dividerLine: "bg-[var(--color-border)]",
    dividerText: "text-[var(--color-muted)]",
    formFieldLabel: "text-[var(--color-paper)]",
    formFieldInput:
      "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-paper)] focus:border-[var(--color-brass)]",
    formButtonPrimary:
      "bg-[var(--color-brass)] text-black hover:bg-[var(--color-brass-hover)]",
    footerActionText: "text-[var(--color-muted)]",
    footerActionLink: "text-[var(--color-brass)] hover:text-[var(--color-brass-hover)]",
    identityPreviewText: "text-[var(--color-paper)]",
    identityPreviewEditButton: "text-[var(--color-brass)]",
    formFieldErrorText: "text-[var(--color-danger)]",
    alertText: "text-[var(--color-danger)]",
  },
} as const;
