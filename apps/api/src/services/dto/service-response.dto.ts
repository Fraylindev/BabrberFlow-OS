import { Prisma } from '@prisma/client';

export const serviceResponseSelect = {
  id: true,
  name: true,
  description: true,
  duration: true,
  price: true,
  isActive: true,
} satisfies Prisma.ServiceSelect;

type ServiceResponseRecord = Prisma.ServiceGetPayload<{
  select: typeof serviceResponseSelect;
}>;

export class ServiceResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  duration!: number;
  price!: string;
  isActive!: boolean;
}

export function toServiceResponse(
  record: ServiceResponseRecord,
): ServiceResponseDto {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    duration: record.duration,
    price: record.price.toFixed(2),
    isActive: record.isActive,
  };
}
