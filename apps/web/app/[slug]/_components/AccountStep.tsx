import { PasswordField } from "@/components/ui/PasswordField";
import { NavButtons, StepWrapper } from "./shared";

interface AccountStepProps {
  clientEmail: string;
  createAccount: boolean;
  password: string;
  onToggle: (v: boolean) => void;
  onPasswordChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function AccountStep({
  clientEmail,
  createAccount,
  password,
  onToggle,
  onPasswordChange,
  onBack,
  onNext,
}: AccountStepProps) {
  return (
    <StepWrapper title="Un último paso">
      <label className="flex cursor-pointer items-start gap-3 border border-[var(--color-border)] p-4">
        <input
          type="checkbox"
          checked={createAccount}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm text-[var(--color-paper)]">
          Crear cuenta para reservar más rápido la próxima vez
        </span>
      </label>

      {createAccount && (
        <div className="mt-4">
          {!clientEmail.trim() && (
            <p className="mb-3 text-xs text-[var(--color-danger)]">
              Necesitas un correo para crear la cuenta — vuelve al paso anterior y agrégalo.
            </p>
          )}
          <PasswordField
            label="Crea una contraseña"
            value={password}
            minLength={6}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        </div>
      )}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={createAccount && (!clientEmail.trim() || password.length < 6)}
      />
    </StepWrapper>
  );
}
