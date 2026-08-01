import { InputField } from "@/components/ui/Field";
import { NavButtons, StepWrapper } from "./shared";

interface ContactStepProps {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
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
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!clientName.trim() || clientPhone.trim().length < 7}
      />
    </StepWrapper>
  );
}
