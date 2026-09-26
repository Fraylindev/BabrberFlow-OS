import { InputField } from "@/components/ui/Field";
import { EmailConsent } from '@/components/notifications/EmailConsent';
import { NavButtons, StepWrapper } from "./shared";

interface ContactStepProps {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  emailOptedIn: boolean;
  onEmailOptInChange: (value: boolean) => void;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ContactStep({
  clientName,
  clientPhone,
  clientEmail,
  emailOptedIn,
  onEmailOptInChange,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  onBack,
  onNext,
}: ContactStepProps) {
  return (
    <StepWrapper title="Tus datos">
      <div className="flex flex-col gap-4">
        <InputField
          label="Nombre completo"
          value={clientName}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <InputField
          label="Teléfono"
          value={clientPhone}
          maxLength={11}
          placeholder="8091234567"
          onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d]/g, ""))}
        />
        <InputField
          label="Correo (opcional)"
          type="email"
          value={clientEmail}
          onChange={(e) => onEmailChange(e.target.value)}
        />
        <EmailConsent tone="dark" checked={emailOptedIn} onChange={onEmailOptInChange} />
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!clientName.trim() || clientPhone.trim().length < 7}
      />
    </StepWrapper>
  );
}
