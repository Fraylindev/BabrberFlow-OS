import { BadRequestException } from '@nestjs/common';

export function normalizeClientName(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('El nombre del cliente no puede estar vacío');
  }
  return normalized;
}

export function normalizeClientEmail(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function normalizeClientPhone(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw new BadRequestException(
      'El teléfono debe contener entre 7 y 15 dígitos',
    );
  }

  if (trimmed.startsWith('+')) return `+${digits}`;
  if (trimmed.startsWith('00')) return `+${digits.slice(2)}`;
  return digits;
}

export function normalizeClientNotes(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const normalized = value.trim();
  return normalized || null;
}
