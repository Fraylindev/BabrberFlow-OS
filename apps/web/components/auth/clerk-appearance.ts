export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent shadow-none p-0",
    headerTitle: "text-[var(--color-paper)] font-[family-name:var(--font-display)] text-xl font-semibold",
    headerSubtitle: "text-[var(--color-muted)] text-sm",
    socialButtonsBlockButton:
      "rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-paper)] text-sm font-medium hover:bg-[var(--color-border)] hover:border-[var(--color-brass)]/50 transition-colors shadow-sm",
    socialButtonsBlockButtonText: "text-[var(--color-paper)] font-medium text-xs",
    dividerLine: "bg-[var(--color-border)]",
    dividerText: "text-[var(--color-faint)] text-xs uppercase tracking-wider",
    formFieldLabel: "text-[var(--color-paper)] text-xs font-medium tracking-wide mb-1",
    formFieldInput:
      "rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-paper)] text-sm px-3.5 py-2.5 transition-colors focus:border-[var(--color-brass)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brass)] shadow-inner",
    formButtonPrimary:
      "rounded-lg bg-[var(--color-brass)] text-white text-sm font-semibold py-2.5 transition-all duration-200 hover:bg-[var(--color-brass-hover)] hover:shadow-[0_0_20px_-4px_rgba(225,29,46,0.5)] active:scale-[0.98] cursor-pointer",
    footerActionText: "text-[var(--color-muted)] text-xs",
    footerActionLink: "text-[var(--color-brass)] font-medium hover:text-[var(--color-brass-hover)] transition-colors text-xs",
    identityPreviewText: "text-[var(--color-paper)] text-sm font-medium",
    identityPreviewEditButton: "text-[var(--color-brass)] hover:text-[var(--color-brass-hover)] text-xs",
    formFieldErrorText: "text-[var(--color-danger)] text-xs mt-1",
    alertText: "text-[var(--color-danger)] text-xs",
    formFieldSuccessText: "text-[var(--color-success)] text-xs mt-1",
    formResendCodeLink: "text-[var(--color-brass)] text-xs hover:underline",
    otpCodeFieldInput:
      "rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-paper)] focus:border-[var(--color-brass)] text-base font-mono",
  },
} as const;
