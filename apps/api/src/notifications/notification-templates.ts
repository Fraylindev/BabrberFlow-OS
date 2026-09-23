import {
  type EmailEvent,
  EMAIL_TEMPLATE_VERSION,
  hasControlCharacters,
} from './notification-policy';

const subjects: Record<EmailEvent, string> = {
  CREATED: 'Reserva registrada',
  CONFIRMED: 'Reserva confirmada',
  CANCELLED: 'Reserva cancelada',
  RESCHEDULED: 'Reserva reprogramada',
  COMPLETED: 'Reserva completada',
};

function safeVariable(value: unknown, maximum: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    hasControlCharacters(value)
  ) {
    throw new Error('INVALID_NOTIFICATION_VARIABLE');
  }
  return value.trim();
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

export interface EmailTemplateVariables {
  organizationName: string;
  serviceName: string;
  startTime: Date;
  timeZone: string;
}

export function renderNotification(
  event: EmailEvent,
  variables: EmailTemplateVariables,
): { subject: string; text: string; html: string; version: string } {
  const allowed = ['organizationName', 'serviceName', 'startTime', 'timeZone'];
  if (Object.keys(variables).some((key) => !allowed.includes(key))) {
    throw new Error('UNKNOWN_NOTIFICATION_VARIABLE');
  }
  if (!Object.hasOwn(subjects, event)) {
    throw new Error('UNKNOWN_NOTIFICATION_EVENT');
  }
  const business = safeVariable(variables.organizationName, 200);
  let text: string;
  if (event === 'COMPLETED') {
    text = `${business}: tu reserva fue completada, gracias por visitarnos`;
  } else {
    const service = safeVariable(variables.serviceName, 200);
    if (
      !(variables.startTime instanceof Date) ||
      !Number.isFinite(variables.startTime.getTime())
    ) {
      throw new Error('INVALID_NOTIFICATION_DATE');
    }
    const timeZone = safeVariable(variables.timeZone, 100);
    let date: string;
    let time: string;
    try {
      date = new Intl.DateTimeFormat('es-DO', {
        timeZone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(variables.startTime);
      time = new Intl.DateTimeFormat('es-DO', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(variables.startTime);
    } catch {
      throw new Error('INVALID_NOTIFICATION_DATE');
    }
    const schedule = `${date}, ${time} (hora del negocio)`;
    const opening = `${business}: tu reserva de ${service}`;
    switch (event) {
      case 'CREATED':
        text = `${opening} para ${schedule}, quedó registrada y está pendiente de confirmación`;
        break;
      case 'CONFIRMED':
        text = `${opening} para ${schedule}, está confirmada`;
        break;
      case 'CANCELLED':
        text = `${opening} para ${schedule}, fue cancelada`;
        break;
      case 'RESCHEDULED':
        text = `${opening} fue reprogramada para ${schedule}`;
    }
  }
  return {
    subject: subjects[event],
    text,
    html: `<p>${escapeHtml(text)}</p>`,
    version: EMAIL_TEMPLATE_VERSION,
  };
}
