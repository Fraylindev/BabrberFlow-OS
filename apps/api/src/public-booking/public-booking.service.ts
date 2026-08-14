import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, ProfessionalStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { AuditService } from '../audit/audit.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { GetAvailabilityQueryDto } from './dto/get-availability-query.dto';
import { PublicBookingResponseDto } from './dto/public-booking-response.dto';
import { isUniqueConstraintError } from '../common/prisma-error.util';
import {
  normalizeClientEmail,
  normalizeClientName,
  normalizeClientPhone,
} from '../clients/client-normalization.util';
import {
  generateCandidateSlots,
  rangesOverlap,
  resolveBusinessHours,
} from './availability.util';
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';
import { zonedLocalDateTimeToUtc } from '../professionals/professional-availability.util';

type PublicClientAction = 'CREATE' | 'RESTORE' | null;

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private prisma: PrismaService,
    private bookingsService: BookingsService,
    private audit: AuditService,
    private availabilityService: ProfessionalAvailabilityService,
  ) {}

  private async resolveOrganization(slug: string) {
    const organization = await this.prisma.db.organization.findUnique({
      where: { slug },
    });
    if (!organization || !organization.isActive) {
      throw new NotFoundException('No existe una organización con ese slug');
    }
    return organization;
  }

  async getBookingData(slug: string) {
    const organization = await this.resolveOrganization(slug);
    const [services, professionals] = await Promise.all([
      this.prisma.db.service.findMany({
        where: { organizationId: organization.id, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          price: true,
        },
      }),
      this.prisma.db.professional.findMany({
        where: {
          organizationId: organization.id,
          status: ProfessionalStatus.ACTIVE,
          isPublic: true,
        },
        select: { id: true, name: true, bio: true, avatar: true },
      }),
    ]);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        phone: organization.phone,
      },
      whatsappBaseUrl: process.env.WHATSAPP_BASE_URL || 'https://wa.me/',
      services,
      professionals,
    };
  }

  async getAvailability(slug: string, query: GetAvailabilityQueryDto) {
    const organization = await this.resolveOrganization(slug);
    const service = await this.prisma.db.service.findFirst({
      where: {
        id: query.serviceId,
        organizationId: organization.id,
        isActive: true,
      },
      select: { duration: true },
    });
    if (!service) {
      throw new BadRequestException('Servicio no encontrado en esta barbería');
    }

    let candidateProfessionalIds: string[];
    if (query.professionalId) {
      const professional = await this.prisma.db.professional.findFirst({
        where: {
          id: query.professionalId,
          organizationId: organization.id,
          status: ProfessionalStatus.ACTIVE,
          isPublic: true,
        },
        select: { id: true },
      });
      if (!professional) {
        throw new BadRequestException(
          'Profesional no encontrado en esta barbería',
        );
      }
      candidateProfessionalIds = [professional.id];
    } else {
      const activeProfessionals = await this.prisma.db.professional.findMany({
        where: {
          organizationId: organization.id,
          status: ProfessionalStatus.ACTIVE,
          isPublic: true,
        },
        select: { id: true },
        orderBy: { name: 'asc' },
      });
      candidateProfessionalIds = activeProfessionals.map((item) => item.id);
    }

    if (candidateProfessionalIds.length === 0) {
      return { date: query.date, serviceId: query.serviceId, slots: [] };
    }

    const dayRange = this.availabilityService.getUtcRangeForLocalDate(
      query.date,
      organization.timeZone,
    );

    const businessHours = resolveBusinessHours(organization.businessHours);
    const candidateTimes = generateCandidateSlots(
      businessHours,
      service.duration,
    );
    const existingBookings =
      await this.bookingsService.findActiveBookingsInRange(
        organization.id,
        candidateProfessionalIds,
        dayRange.start,
        dayRange.end,
      );
    const availabilityContext = await this.availabilityService.getPublicContext(
      organization.id,
      candidateProfessionalIds,
      dayRange.start,
      dayRange.end,
    );

    const now = new Date();
    const slots: { time: string; professionalId: string }[] = [];
    for (const time of candidateTimes) {
      const slotStart = zonedLocalDateTimeToUtc(
        query.date,
        time,
        organization.timeZone,
      );
      if (!slotStart) continue;
      const slotEnd = new Date(slotStart.getTime() + service.duration * 60000);
      if (slotStart <= now) continue;

      const freeProfessionalId = candidateProfessionalIds.find(
        (professionalId) =>
          this.availabilityService.isAvailableInContext(
            availabilityContext,
            professionalId,
            slotStart,
            slotEnd,
          ) &&
          !existingBookings.some(
            (booking) =>
              booking.professionalId === professionalId &&
              rangesOverlap(
                slotStart,
                slotEnd,
                booking.startTime,
                booking.endTime,
              ),
          ),
      );
      if (freeProfessionalId) {
        slots.push({ time, professionalId: freeProfessionalId });
      }
    }

    return { date: query.date, serviceId: query.serviceId, slots };
  }

  async createBooking(
    slug: string,
    dto: CreatePublicBookingDto,
  ): Promise<PublicBookingResponseDto> {
    const organization = await this.resolveOrganization(slug);
    if (dto.createAccount && !dto.clientEmail) {
      throw new BadRequestException(
        'Se necesita un correo para crear la cuenta',
      );
    }

    const normalizedPhone = normalizeClientPhone(dto.clientPhone);
    if (!normalizedPhone) {
      throw new BadRequestException('Se necesita un teléfono válido');
    }
    const normalized = {
      name: normalizeClientName(dto.clientName),
      phone: normalizedPhone,
      email: normalizeClientEmail(dto.clientEmail),
    };

    const result = await this.prisma.db.$transaction(async (transaction) => {
      const clientResult = await this.findOrCreateClient(
        transaction,
        organization.id,
        normalized,
      );
      const booking = await this.bookingsService.create(
        organization.id,
        {
          serviceId: dto.serviceId,
          professionalId: dto.professionalId,
          clientId: clientResult.id,
          startTime: dto.startTime,
        },
        transaction,
        true,
      );
      return { booking, clientResult };
    });

    await this.auditPublicClientAction(
      organization.id,
      result.clientResult.id,
      result.clientResult.action,
    );

    let accountCreated = false;
    let accountCreationError: string | null = null;
    if (dto.createAccount && normalized.email && dto.password) {
      const account = await this.tryCreateCustomerAccount(
        organization.id,
        normalized.name,
        normalized.email,
        dto.password,
      );
      accountCreated = account.created;
      accountCreationError = account.error;
    }

    return {
      booking: {
        id: result.booking.id,
        serviceId: result.booking.serviceId,
        professionalId: result.booking.professionalId,
        startTime: result.booking.startTime,
        endTime: result.booking.endTime,
        status: result.booking.status,
      },
      accountCreated,
      accountCreationError,
    };
  }

  private async findOrCreateClient(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    input: { name: string; phone: string; email: string | null },
  ): Promise<{ id: string; action: PublicClientAction }> {
    const byPhone = await transaction.client.findFirst({
      where: { organizationId, phone: input.phone },
      select: { id: true, isActive: true },
    });
    const byEmail = input.email
      ? await transaction.client.findFirst({
          where: {
            organizationId,
            email: { equals: input.email, mode: 'insensitive' },
          },
          select: { id: true, isActive: true },
        })
      : null;

    if (byPhone && byEmail && byPhone.id !== byEmail.id) {
      throw new ConflictException(
        'El correo y el teléfono corresponden a clientes diferentes.',
      );
    }

    const existing = byPhone ?? byEmail;
    if (existing) {
      if (existing.isActive) return { id: existing.id, action: null };
      const restored = await transaction.client.update({
        where: { id: existing.id, organizationId },
        data: { isActive: true },
        select: { id: true },
      });
      return { id: restored.id, action: 'RESTORE' };
    }

    try {
      const created = await transaction.client.create({
        data: {
          organizationId,
          name: input.name,
          phone: input.phone,
          email: input.email,
        },
        select: { id: true },
      });
      return { id: created.id, action: 'CREATE' };
    } catch (error) {
      if (isUniqueConstraintError(error, 'email')) {
        throw new ConflictException(
          'Ya existe un cliente con ese correo en esta organización.',
        );
      }
      throw error;
    }
  }

  private async auditPublicClientAction(
    organizationId: string,
    clientId: string,
    action: PublicClientAction,
  ) {
    if (!action) return;
    await this.audit.log({
      organizationId,
      userId: null,
      action,
      entity: 'Client',
      entityId: clientId,
    });
  }

  private async tryCreateCustomerAccount(
    organizationId: string,
    name: string,
    email: string,
    password: string,
  ): Promise<{ created: boolean; error: string | null }> {
    try {
      const existing = await this.prisma.db.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing) {
        return { created: false, error: 'EMAIL_ALREADY_EXISTS' };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await this.prisma.db.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            lastOrganizationId: organizationId,
          },
        });
        await transaction.membership.create({
          data: {
            userId: user.id,
            organizationId,
            role: UserRole.CUSTOMER,
          },
        });
      });
      return { created: true, error: null };
    } catch (error) {
      if (isUniqueConstraintError(error, 'email')) {
        return { created: false, error: 'EMAIL_ALREADY_EXISTS' };
      }
      this.logger.error(
        'No se pudo crear la cuenta CUSTOMER secundaria; la reserva permanece válida.',
        error instanceof Error ? error.stack : String(error),
      );
      return { created: false, error: 'ACCOUNT_CREATION_FAILED' };
    }
  }
}
