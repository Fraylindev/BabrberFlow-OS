import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { AuditService } from '../audit/audit.service';
import {
  normalizeClientName,
  normalizeClientPhone,
} from '../clients/client-normalization.util';
import {
  businessPolicySelect,
  canReadPublicSchedule,
  policyFromOrganization,
} from '../business-schedule/business-schedule.policy';
import { projectContent } from '../cms/cms.projection';
import { isValidTimeZone } from '../professionals/professional-availability.util';
import {
  isSerializationFailureError,
  isUniqueConstraintError,
} from '../common/prisma-error.util';
import {
  CustomerCreateDto,
  CustomerListDto,
  CustomerProfileDto,
} from './customer.dto';
import {
  customerDigest,
  decodeCustomerCursor,
  encodeCustomerCursor,
} from './customer-crypto';

const organizationSelect = {
  id: true,
  name: true,
  slug: true,
  isActive: true,
  deletedAt: true,
  ...businessPolicySelect,
  cmsPage: { select: { isPublished: true, publishedSnapshot: true } },
} satisfies Prisma.OrganizationSelect;
const clientSelect = {
  id: true,
  organizationId: true,
  userId: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
  customerAccessBlocked: true,
  customerBookingRevision: true,
  organization: { select: organizationSelect },
} satisfies Prisma.ClientSelect;
const bookingSelect = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  service: {
    select: { id: true, name: true, isActive: true, organizationId: true },
  },
  professional: {
    select: {
      id: true,
      name: true,
      status: true,
      isPublic: true,
      organizationId: true,
    },
  },
} satisfies Prisma.BookingSelect;
type Context = Prisma.ClientGetPayload<{ select: typeof clientSelect }>;
type Organization = Context['organization'];
type Booking = Prisma.BookingGetPayload<{ select: typeof bookingSelect }>;
const unavailable = () => new NotFoundException('Información no disponible.');
const conflict = () =>
  new ConflictException(
    'No pudimos completar la operación. Actualiza la información e inténtalo de nuevo.',
  );

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly audit: AuditService,
  ) {}

  private canBook(organization: Organization): boolean {
    if (
      process.env.PUBLIC_BOOKING_CLOSED === 'true' ||
      !organization.cmsPage?.isPublished ||
      !organization.cmsPage.publishedSnapshot
    )
      return false;
    try {
      projectContent(organization.cmsPage.publishedSnapshot);
      return canReadPublicSchedule(policyFromOrganization(organization));
    } catch {
      return false;
    }
  }

  private async resolve(
    db: Prisma.TransactionClient,
    clerkUserId: string,
    slug: string,
  ): Promise<Context> {
    const client = await db.client.findFirst({
      where: {
        user: { clerkUserId },
        customerAccessBlocked: false,
        customerHistoryAmbiguous: false,
        organization: { slug, isActive: true, deletedAt: null },
      },
      select: clientSelect,
    });
    if (!client) throw unavailable();
    if (!isValidTimeZone(client.organization.timeZone))
      throw new ServiceUnavailableException(
        'La información del negocio no está disponible temporalmente.',
      );
    return client;
  }

  private profileProjection(client: Context) {
    return {
      name: client.name,
      phone: client.phone,
      email: client.email,
      canEditContact: client.isActive,
    };
  }

  private businessProjection(organization: Organization, contacts = false) {
    const result = {
      slug: organization.slug,
      name: organization.name,
      timeZone: organization.timeZone,
    };
    if (!contacts) return result;
    const content =
      organization.cmsPage?.isPublished &&
      organization.cmsPage.publishedSnapshot
        ? projectContent(organization.cmsPage.publishedSnapshot)
        : null;
    return {
      ...result,
      phone: content?.phone ?? null,
      address: content?.address ?? null,
      googleMapsUrl: content?.googleMapsUrl ?? null,
    };
  }

  private summary(client: Context, booking: Booking) {
    // Relaciones históricas corruptas nunca sirven para descubrir otro tenant.
    if (
      booking.service.organizationId !== client.organizationId ||
      booking.professional.organizationId !== client.organizationId
    )
      throw unavailable();
    return {
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      service: { id: booking.service.id, name: booking.service.name },
      professional: {
        id: booking.professional.id,
        name: booking.professional.name,
      },
      canBookAgain:
        client.isActive &&
        this.canBook(client.organization) &&
        booking.service.isActive &&
        booking.professional.status === 'ACTIVE' &&
        booking.professional.isPublic,
    };
  }

  private async detailInTransaction(
    db: Prisma.TransactionClient,
    client: Context,
    id: string,
  ) {
    const booking = await db.booking.findFirst({
      where: {
        id,
        organizationId: client.organizationId,
        clientId: client.id,
        client: {
          userId: client.userId,
          customerAccessBlocked: false,
          customerHistoryAmbiguous: false,
        },
      },
      select: bookingSelect,
    });
    if (!booking) throw unavailable();
    const summary = this.summary(client, booking);
    return {
      ...summary,
      business: this.businessProjection(client.organization, true),
      actions: { canBookAgain: summary.canBookAgain },
    };
  }

  private async read<T>(
    work: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.db.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'La información no está disponible temporalmente. Inténtalo de nuevo.',
      );
    }
  }

  businesses(clerkUserId: string) {
    return this.read(async (db) => {
      const clients = await db.client.findMany({
        where: {
          user: { clerkUserId },
          customerAccessBlocked: false,
          customerHistoryAmbiguous: false,
          organization: { isActive: true, deletedAt: null },
        },
        select: {
          isActive: true,
          organization: { select: organizationSelect },
        },
        orderBy: { organization: { slug: 'asc' } },
      });
      return {
        businesses: clients.map((c) => ({
          slug: c.organization.slug,
          name: c.organization.name,
          canBook: c.isActive && this.canBook(c.organization),
        })),
      };
    });
  }

  profile(clerkUserId: string, slug: string) {
    return this.read(async (db) =>
      this.profileProjection(await this.resolve(db, clerkUserId, slug)),
    );
  }

  detail(clerkUserId: string, slug: string, id: string) {
    return this.read(async (db) =>
      this.detailInTransaction(
        db,
        await this.resolve(db, clerkUserId, slug),
        id,
      ),
    );
  }

  list(clerkUserId: string, slug: string, dto: CustomerListDto) {
    return this.read(async (db) => {
      const client = await this.resolve(db, clerkUserId, slug);
      const cursor = dto.cursor ? decodeCustomerCursor(dto.cursor) : null;
      if (
        cursor &&
        (cursor.actor !== client.userId ||
          cursor.organization !== client.organizationId ||
          cursor.client !== client.id ||
          cursor.view !== dto.view)
      )
        throw unavailable();
      if (
        cursor &&
        cursor.revision !== client.customerBookingRevision.toString()
      )
        throw new ConflictException(
          'Tus reservas cambiaron. Actualiza la lista para continuar.',
        );
      const asOf = cursor?.asOf ?? new Date().toISOString();
      const active: BookingStatus[] = ['PENDING', 'CONFIRMED'];
      const partition: Prisma.BookingWhereInput =
        dto.view === 'upcoming'
          ? { status: { in: active }, endTime: { gt: new Date(asOf) } }
          : {
              OR: [
                { status: { notIn: active } },
                { endTime: { lte: new Date(asOf) } },
              ],
            };
      const direction = dto.view === 'upcoming' ? 'asc' : 'desc';
      const after: Prisma.BookingWhereInput = cursor
        ? {
            OR: [
              {
                startTime:
                  direction === 'asc'
                    ? { gt: new Date(cursor.startTime) }
                    : { lt: new Date(cursor.startTime) },
              },
              {
                startTime: new Date(cursor.startTime),
                id: direction === 'asc' ? { gt: cursor.id } : { lt: cursor.id },
              },
            ],
          }
        : {};
      const rows = await db.booking.findMany({
        where: {
          organizationId: client.organizationId,
          clientId: client.id,
          client: {
            userId: client.userId,
            customerAccessBlocked: false,
            customerHistoryAmbiguous: false,
          },
          AND: [partition, after],
        },
        select: bookingSelect,
        orderBy: [{ startTime: direction }, { id: direction }],
        take: dto.limit + 1,
      });
      const items = rows
        .slice(0, dto.limit)
        .map((b) => this.summary(client, b));
      const last = items.at(-1);
      return {
        business: this.businessProjection(client.organization),
        items,
        asOf,
        nextCursor:
          rows.length > dto.limit && last
            ? encodeCustomerCursor({
                v: 1,
                actor: client.userId!,
                organization: client.organizationId,
                client: client.id,
                view: dto.view,
                revision: client.customerBookingRevision.toString(),
                asOf,
                startTime: last.startTime.toISOString(),
                id: last.id,
              })
            : null,
      };
    });
  }

  private async mutate<T>(
    clerkUserId: string,
    slug: string,
    work: (db: Prisma.TransactionClient, client: Context) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.db.$transaction(
          async (db) => {
            const initial = await this.resolve(db, clerkUserId, slug);
            await db.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${initial.organizationId} FOR UPDATE`;
            await db.$queryRaw`SELECT "id" FROM "Client" WHERE "id" = ${initial.id} AND "organizationId" = ${initial.organizationId} FOR UPDATE`;
            const client = await this.resolve(db, clerkUserId, slug);
            if (client.id !== initial.id || client.userId !== initial.userId)
              throw unavailable();
            return work(db, client);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 10000,
          },
        );
      } catch (error) {
        if (isSerializationFailureError(error) && attempt < 2) continue;
        if (
          isSerializationFailureError(error) ||
          isUniqueConstraintError(error)
        )
          throw conflict();
        if (error instanceof HttpException) throw error;
        throw new ServiceUnavailableException(
          'No pudimos completar la operación. Inténtalo de nuevo.',
        );
      }
    }
    throw conflict();
  }

  updateProfile(
    clerkUserId: string,
    slug: string,
    dto: CustomerProfileDto,
    rawKey: string | undefined,
  ) {
    if (dto.name === undefined && dto.phone === undefined)
      throw new BadRequestException('Indica los datos que quieres guardar.');
    const data = {
      ...(dto.name !== undefined
        ? { name: normalizeClientName(dto.name) }
        : {}),
      ...(dto.phone !== undefined
        ? { phone: normalizeClientPhone(dto.phone) }
        : {}),
    };
    const keyDigest = this.operationKey(rawKey);
    const commandDigest = customerDigest('command', JSON.stringify(data));
    return this.mutate(clerkUserId, slug, async (db, client) => {
      const receipt = await db.customerOperation.findUnique({
        where: {
          organizationId_actorUserId_operation_keyDigest: {
            organizationId: client.organizationId,
            actorUserId: client.userId!,
            operation: 'UPDATE_PROFILE',
            keyDigest,
          },
        },
      });
      const now = new Date();
      if (receipt) {
        if (receipt.clientId !== client.id) throw unavailable();
        if (receipt.commandDigest !== commandDigest || receipt.expiresAt <= now)
          throw conflict();
        return this.profileProjection(client);
      }
      if (!client.isActive) throw conflict();
      if (
        data.phone &&
        (await db.client.findFirst({
          where: {
            organizationId: client.organizationId,
            id: { not: client.id },
            phone: data.phone,
          },
          select: { id: true },
        }))
      )
        throw conflict();
      const updated = await db.client.update({
        where: {
          id: client.id,
          organizationId: client.organizationId,
          userId: client.userId,
          customerAccessBlocked: false,
          customerHistoryAmbiguous: false,
        },
        data,
        select: clientSelect,
      });
      await this.cleanupReceipts(db);
      await db.customerOperation.create({
        data: {
          organizationId: client.organizationId,
          actorUserId: client.userId!,
          clientId: client.id,
          operation: 'UPDATE_PROFILE',
          keyDigest,
          commandDigest,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        },
      });
      await this.audit.logTransactional(
        {
          organizationId: client.organizationId,
          userId: client.userId!,
          action: 'UPDATE',
          entity: 'Client',
          entityId: client.id,
        },
        db,
      );
      return this.profileProjection(updated);
    });
  }

  private operationKey(rawKey: string | undefined) {
    if (
      !rawKey ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rawKey,
      )
    )
      throw new BadRequestException('Indica una clave de operación válida.');
    return customerDigest('idempotency-key', rawKey.toLowerCase());
  }

  private cleanupReceipts(db: Prisma.TransactionClient) {
    return db.$executeRaw`DELETE FROM "CustomerOperation" WHERE "id" IN (SELECT "id" FROM "CustomerOperation" WHERE "expiresAt" < NOW() - INTERVAL '24 hours' ORDER BY "expiresAt" LIMIT 100)`;
  }

  create(
    clerkUserId: string,
    slug: string,
    dto: CustomerCreateDto,
    rawKey: string | undefined,
  ) {
    // Una clave aleatoria UUID evita identificadores de contacto usados como claves.
    const keyDigest = this.operationKey(rawKey);
    const commandDigest = customerDigest(
      'command',
      JSON.stringify({
        serviceId: dto.serviceId.toLowerCase(),
        professionalId: dto.professionalId.toLowerCase(),
        startTime: new Date(dto.startTime).toISOString(),
        emailNotifications: dto.emailNotifications
          ? {
              optedIn: dto.emailNotifications.optedIn,
              noticeVersion: dto.emailNotifications.noticeVersion,
            }
          : null,
      }),
    );
    return this.mutate(clerkUserId, slug, async (db, client) => {
      const receipt = await db.customerOperation.findUnique({
        where: {
          organizationId_actorUserId_operation_keyDigest: {
            organizationId: client.organizationId,
            actorUserId: client.userId!,
            operation: 'CREATE_BOOKING',
            keyDigest,
          },
        },
      });
      const now = new Date();
      if (receipt) {
        if (receipt.clientId !== client.id) throw unavailable();
        if (
          receipt.commandDigest !== commandDigest ||
          receipt.expiresAt <= now ||
          !receipt.bookingId
        )
          throw conflict();
        // Ownership vigente incluso para recibos; no devuelve snapshots privados.
        const booking = await this.detailInTransaction(
          db,
          client,
          receipt.bookingId,
        );
        return { booking, isNew: false };
      }
      if (!client.isActive || !this.canBook(client.organization))
        throw conflict();
      if (dto.emailNotifications?.optedIn && !client.email)
        throw new BadRequestException(
          'Revisa el correo de contacto con el negocio antes de activar avisos.',
        );
      // Limpieza acotada; expirar no autoriza reenvío automático de una petición incierta.
      await this.cleanupReceipts(db);
      const created = await this.bookings.create(
        client.organizationId,
        {
          serviceId: dto.serviceId,
          professionalId: dto.professionalId,
          startTime: dto.startTime,
          clientId: client.id,
          ...(dto.emailNotifications
            ? {
                emailNotifications: {
                  ...dto.emailNotifications,
                  reviewedEmail: client.email ?? undefined,
                },
              }
            : {}),
        },
        db,
        true,
      );
      await db.customerOperation.create({
        data: {
          organizationId: client.organizationId,
          actorUserId: client.userId!,
          operation: 'CREATE_BOOKING',
          clientId: client.id,
          keyDigest,
          commandDigest,
          bookingId: created.id,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        },
      });
      await this.audit.logTransactional(
        {
          organizationId: client.organizationId,
          userId: client.userId!,
          action: 'CREATE',
          entity: 'Booking',
          entityId: created.id,
        },
        db,
      );
      return {
        booking: await this.detailInTransaction(db, client, created.id),
        isNew: true,
      };
    });
  }
}
