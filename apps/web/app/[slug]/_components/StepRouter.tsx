import { PublicAvailabilitySlot, PublicBookingData } from "@/lib/api";
import { ServiceStep } from "./ServiceStep";
import { ProfessionalStep, ANY_PROFESSIONAL } from "./ProfessionalStep";
import { DateTimeStep } from "./DateTimeStep";
import { ContactStep } from "./ContactStep";
import { AccountStep } from "./AccountStep";
import { ConfirmStep } from "./ConfirmStep";

export type Step = "service" | "professional" | "datetime" | "contact" | "account" | "confirm";

interface StepRouterProps {
  step: Step;
  setStep: (s: Step) => void;
  slug: string;
  data: PublicBookingData;
  serviceId: string;
  setServiceId: (id: string) => void;
  professionalId: string | null;
  setProfessionalId: (id: string) => void;
  date: string;
  time: string;
  onDateChange: (d: string) => void;
  onSlotSelect: (slot: PublicAvailabilitySlot) => void;
  clientName: string;
  setClientName: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  createAccount: boolean;
  setCreateAccount: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  serviceName?: string;
  professionalLabel?: string;
  submitError: string | null;
  submitting: boolean;
  onConfirm: () => void;
}

export function StepRouter(props: StepRouterProps) {
  const { step, setStep, data } = props;

  switch (step) {
    case "service":
      return (
        <ServiceStep
          services={data.services}
          serviceId={props.serviceId}
          onSelect={props.setServiceId}
          onNext={() => setStep("professional")}
        />
      );
    case "professional":
      return (
        <ProfessionalStep
          professionals={data.professionals}
          professionalId={props.professionalId}
          onSelect={props.setProfessionalId}
          onBack={() => setStep("service")}
          onNext={() => setStep("datetime")}
        />
      );
    case "datetime":
      return (
        <DateTimeStep
          slug={props.slug}
          serviceId={props.serviceId}
          professionalId={props.professionalId ?? ANY_PROFESSIONAL}
          date={props.date}
          time={props.time}
          onDateChange={props.onDateChange}
          onSlotSelect={props.onSlotSelect}
          onBack={() => setStep("professional")}
          onNext={() => setStep("contact")}
        />
      );
    case "contact":
      return (
        <ContactStep
          clientName={props.clientName}
          clientPhone={props.clientPhone}
          clientEmail={props.clientEmail}
          onNameChange={props.setClientName}
          onPhoneChange={props.setClientPhone}
          onEmailChange={props.setClientEmail}
          onBack={() => setStep("datetime")}
          onNext={() => setStep("account")}
        />
      );
    case "account":
      return (
        <AccountStep
          clientEmail={props.clientEmail}
          createAccount={props.createAccount}
          password={props.password}
          onToggle={props.setCreateAccount}
          onPasswordChange={props.setPassword}
          onBack={() => setStep("contact")}
          onNext={() => setStep("confirm")}
        />
      );
    case "confirm":
      return (
        <ConfirmStep
          serviceName={props.serviceName}
          professionalName={props.professionalLabel}
          date={props.date}
          time={props.time}
          clientName={props.clientName}
          clientPhone={props.clientPhone}
          clientEmail={props.clientEmail}
          submitError={props.submitError}
          submitting={props.submitting}
          onBack={() => setStep("account")}
          onConfirm={props.onConfirm}
        />
      );
  }
}
