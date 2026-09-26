import { Prisma } from '@prisma/client';

export const clientResponseSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClientSelect;

export const barberClientResponseSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
} satisfies Prisma.ClientSelect;

type ClientRecord = Prisma.ClientGetPayload<{
  select: typeof clientResponseSelect;
}>;
type BarberClientRecord = Prisma.ClientGetPayload<{
  select: typeof barberClientResponseSelect;
}>;

export class ClientResponseDto {
  id!: string;
  name!: string;
  email!: string | null;
  phone!: string | null;
  notes!: string | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class BarberClientResponseDto {
  id!: string;
  name!: string;
  email!: string | null;
  phone!: string | null;
  isActive!: boolean;
}

export function toClientResponse(record: ClientRecord): ClientResponseDto {
  return { ...record };
}

export function toBarberClientResponse(
  record: BarberClientRecord,
): BarberClientResponseDto {
  return { ...record };
}

export interface ClientListResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
