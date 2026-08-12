import { Prisma, ProfessionalStatus } from '@prisma/client';

export const professionalDirectorySelect = {
  id: true,
  name: true,
  avatar: true,
  specialty: true,
  status: true,
} satisfies Prisma.ProfessionalSelect;

export const professionalManagementSelect = {
  id: true,
  name: true,
  bio: true,
  phone: true,
  avatar: true,
  specialty: true,
  experienceYears: true,
  status: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ProfessionalSelect;

export const professionalOwnProfileSelect = {
  id: true,
  name: true,
  bio: true,
  avatar: true,
  specialty: true,
  experienceYears: true,
  status: true,
  isPublic: true,
} satisfies Prisma.ProfessionalSelect;

type DirectoryRecord = Prisma.ProfessionalGetPayload<{
  select: typeof professionalDirectorySelect;
}>;
type ManagementRecord = Prisma.ProfessionalGetPayload<{
  select: typeof professionalManagementSelect;
}>;
type OwnProfileRecord = Prisma.ProfessionalGetPayload<{
  select: typeof professionalOwnProfileSelect;
}>;

export class ProfessionalDirectoryResponseDto {
  id!: string;
  name!: string;
  avatar!: string | null;
  specialty!: string | null;
  status!: ProfessionalStatus;
  isActive!: boolean;
}

export class ProfessionalManagementResponseDto {
  id!: string;
  name!: string;
  bio!: string | null;
  phone!: string | null;
  avatar!: string | null;
  specialty!: string | null;
  experienceYears!: number | null;
  status!: ProfessionalStatus;
  isActive!: boolean;
  isPublic!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  linkedUser!: { id: string; name: string; email: string } | null;
}

export class ProfessionalOwnProfileResponseDto {
  id!: string;
  name!: string;
  bio!: string | null;
  avatar!: string | null;
  specialty!: string | null;
  experienceYears!: number | null;
  status!: ProfessionalStatus;
  isActive!: boolean;
  isPublic!: boolean;
}

export interface ProfessionalListResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function toProfessionalDirectory(
  record: DirectoryRecord,
): ProfessionalDirectoryResponseDto {
  return {
    ...record,
    isActive: record.status === ProfessionalStatus.ACTIVE,
  };
}

export function toProfessionalManagement(
  record: ManagementRecord,
): ProfessionalManagementResponseDto {
  const { user, ...professional } = record;
  return {
    ...professional,
    isActive: record.status === ProfessionalStatus.ACTIVE,
    linkedUser: user,
  };
}

export function toProfessionalOwnProfile(
  record: OwnProfileRecord,
): ProfessionalOwnProfileResponseDto {
  return {
    ...record,
    isActive: record.status === ProfessionalStatus.ACTIVE,
  };
}
