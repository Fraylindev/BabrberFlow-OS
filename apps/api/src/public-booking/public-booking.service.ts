import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
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
import { rangesOverlap } from './availability.util';
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';
import {
  getZonedDateParts,
  isValidTimeZone,
  zonedLocalDateTimeToUtc,
  legacyZonedLocalDateTimeToUtc,
} from '../professionals/professional-availability.util';
import { projectContent } from '../cms/cms.projection';
import {
  businessPolicySelect,
  canReadPublicSchedule,
  candidatesForPolicy,
  policyFromOrganization,
} from '../business-schedule/business-schedule.policy';

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

  private async resolveOrganization(
    slug: string,
    db: Prisma.TransactionClient = this.prisma.db,
  ) {
    if (process.env.PUBLIC_BOOKING_CLOSED === 'true') {
      throw new NotFoundException('Información no disponible.');
    }
    const organization = await db.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        isActive: true,
        deletedAt: true,
        ...businessPolicySelect,
        cmsPage: { select: { isPublished: true, publishedSnapshot: true } },
      },
    });
    if (
      !organization ||
      !organization.isActive ||
      organization.deletedAt ||
      !organization.cmsPage?.isPublished ||
      !organization.cmsPage.publishedSnapshot
    ) {
      throw new NotFoundException('Información no disponible.');
    }
    if (!isValidTimeZone(organization.timeZone))
      throw new ServiceUnavailableException(
        'No fue posible calcular la fecha del negocio.',
      );
    let publiclyEligible: boolean;
    try {
      publiclyEligible = canReadPublicSchedule(
        policyFromOrganization(organization),
      );
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible calcular la fecha del negocio.',
      );
    }
    if (!publiclyEligible)
      throw new NotFoundException('Información no disponible.');
    return { ...organization, cmsPage: organization.cmsPage };
  }

  async getBookingData(slug: string) {
    const organization = await this.resolveOrganization(slug);
    if (!isValidTimeZone(organization.timeZone)) {
      throw new ServiceUnavailableException(
        'No fue posible calcular la fecha del negocio.',
      );
    }
    const content = projectContent(organization.cmsPage.publishedSnapshot);
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
      minimumBookingDate: getZonedDateParts(new Date(), organization.timeZone)
        .date,
      timeZone: organization.timeZone,
      organization: {
        name: content.publicName,
        slug: organization.slug,
        phone: content.phone,
        description: content.description,
        address: content.address,
        googleMapsUrl: content.googleMapsUrl,
      },
      whatsappBaseUrl: process.env.WHATSAPP_BASE_URL || 'https://wa.me/',
      services,
      professionals,
    };
  }

  async getAvailability(slug: string, query: GetAvailabilityQueryDto) {
    const organization = await this.resolveOrganization(slug);
    if (!isValidTimeZone(organization.timeZone)) {
      throw new ServiceUnavailableException(
        'No fue posible calcular la fecha del negocio.',
      );
    }
    const dayRange = this.availabilityService.getUtcRangeForLocalDate(
      query.date,
      organization.timeZone,
      organization.businessSchedule?.state === 'LEGACY_UNCONFIRMED',
    );
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
    const candidateTimes = candidatesForPolicy(
      availabilityContext.policy,
      query.date,
      getZonedDateParts(dayRange.start, availabilityContext.timeZone).dayOfWeek,
      service.duration,
    );

    const now = new Date();
    const slots: {
      time: string;
      professionalId: string;
      startTime: string;
    }[] = [];
    for (const time of candidateTimes) {
      const convert =
        availabilityContext.policy.state === 'LEGACY_UNCONFIRMED'
          ? legacyZonedLocalDateTimeToUtc
          : zonedLocalDateTimeToUtc;
      const slotStart = convert(query.date, time, availabilityContext.timeZone);
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
        slots.push({
          time,
          professionalId: freeProfessionalId,
          startTime: slotStart.toISOString(),
        });
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
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${organization.id} FOR UPDATE`,
      );
      // Retiro y nueva reserva se ordenan bajo el mismo bloqueo. No usar estado precargado.
      await this.resolveOrganization(slug, transaction);
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
          ...(dto.emailNotifications
            ? {
                emailNotifications: {
                  ...dto.emailNotifications,
                  reviewedEmail: normalized.email ?? undefined,
                },
              }
            : {}),
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
      );
      return { created: false, error: 'ACCOUNT_CREATION_FAILED' };
    }
  }
}
