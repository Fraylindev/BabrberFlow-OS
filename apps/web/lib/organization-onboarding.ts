export interface OrganizationOnboardingDraft {
  organizationName: string;
  organizationSlug: string;
  organizationEmail: string;
}

export function organizationSlugFromName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function organizationOnboardingPayload(
  draft: OrganizationOnboardingDraft,
): OrganizationOnboardingDraft {
  return {
    organizationName: draft.organizationName.trim(),
    organizationSlug: draft.organizationSlug.trim(),
    organizationEmail: draft.organizationEmail.trim(),
  };
}
