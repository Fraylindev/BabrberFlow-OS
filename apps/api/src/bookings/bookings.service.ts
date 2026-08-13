import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import {
  BookingStatus,
  ProfessionalStatus,
  type Booking,
  type Prisma,
} from '@prisma/client';
import { isBookingScheduleConflictError } from '../common/prisma-error.util';
import { lockProfessionalForBookingIntegrity } from '../common/professional-booking-lock';

export const bookingClientResponseSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
} satisfies Prisma.ClientSelect;

const BARBER_STATUS_TRANSITIONS: Partial<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW],
};

const ADMIN_STATUS_TRANSITIONS: Partial<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.COMPLETED,
    BookingStatus.NO_SHOW,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CANCELLED]: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
};

const FUTURE_OPERATIONAL_STATUSES: readonly BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

const SCHEDULE_CONFLICT_MESSAGE =
  'El profesional ya tiene una cita reservada en este horario';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    createBookingDto: CreateBookingDto,
    transaction?: Prisma.TransactionClient,
    requirePublicProfessional = false,
  ): Promise<Booking> {
    if (transaction) {
      return this.createInTransaction(
        transaction,
        organizationId,
        createBookingDto,
        requirePublicProfessional,
      );
    }

    return this.prisma.db.$transaction((tx) =>
      this.createInTransaction(
        tx,
        organizationId,
        createBookingDto,
        requirePublicProfessional,
      ),
    );
  }

  private async createInTransaction(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    createBookingDto: CreateBookingDto,
    requirePublicProfessional: boolean,
  ): Promise<Booking> {
    const db = transaction;
    const { clientId, professionalId, serviceId, startTime } = createBookingDto;

    const lockedProfessional = await lockProfessionalForBookingIntegrity(
      transaction,
      professionalId,
      organizationId,
    );
    if (
      lockedProfessional?.status !== ProfessionalStatus.ACTIVE ||
      (requirePublicProfessional && !lockedProfessional.isPublic)
    ) {
      throw new BadRequestException(
        'Profesional no encontrado en esta barbería',
      );
    }

    // isActive: true — rechaza servicios o profesionales dados de baja.
    // No afecta reservas históricas ya creadas (no se tocan registros existentes).
    const service = await db.service.findUnique({
      where: { id: serviceId, organizationId, isActive: true },
    });
    if (!service) {
      throw new BadRequestException('Servicio no encontrado en esta barbería');
    }

    const client = await db.client.findUnique({
      where: { id: clientId, organizationId, isActive: true },
    });
    if (!client) {
      throw new BadRequestException('Cliente no encontrado en esta barbería');
    }

    // ProfessionalService NO se usa como barrera de negocio en esta fase:
    // cualquier profesional activo puede realizar cualquier servicio activo
    // de la organización. La tabla se conserva para precio/comisión
    // individual y para futura restricción opcional por profesional.

    const startDate = new Date(startTime);
    if (startDate.getTime() < Date.now()) {
      throw new BadRequestException(
        'No se puede reservar una cita en una fecha u hora que ya pasó',
      );
    }
    const endDate = new Date(startDate.getTime() + service.duration * 60000);

    // 🛡️ Buscamos choques, pero IGNORAMOS las citas canceladas usando el Enum oficial
    await this.assertNoConflict(
      organizationId,
      professionalId,
      startDate,
      endDate,
      undefined,
      db,
    );

    try {
      return await db.booking.create({
        data: {
          organizationId,
          clientId,
          professionalId,
          serviceId,
          startTime: startDate,
          endTime: endDate,
        },
      });
    } catch (error) {
      this.rethrowScheduleConflict(error);
    }
  }

  private async assertNoConflict(
    organizationId: string,
    professionalId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
    db: Prisma.TransactionClient = this.prisma.db,
  ) {
    const conflictingBooking = await db.booking.findFirst({
      where: {
        organizationId,
        professionalId,
        startTime: { lt: endDate },
        endTime: { gt: startDate },
        status: { not: BookingStatus.CANCELLED },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    });

    if (conflictingBooking) {
      throw new ConflictException(SCHEDULE_CONFLICT_MESSAGE);
    }
  }

  // professionalId opcional: cuando se pasa, restringe el listado a la
  // agenda de ese profesional únicamente — así es como un BARBER ve "mi
  // agenda" en vez de la de toda la barbería.
  // from/to/status opcionales: sin ellos se mantiene el comportamiento
  // anterior (todo el historial de la organización) por compatibilidad,
  // pero el frontend ya puede pedir solo el rango que necesita en vez de
  // traer todas las reservas desde el día 1 y filtrar en el cliente.
  async findAll(
    organizationId: string,
    professionalId?: string,
    from?: Date,
    to?: Date,
    status?: BookingStatus,
  ) {
    return await this.prisma.db.booking.findMany({
      where: {
        organizationId,
        ...(professionalId ? { professionalId } : {}),
        ...(status ? { status } : {}),
        ...(from ? { startTime: { gte: from } } : {}),
        ...(to ? { endTime: { lte: to } } : {}),
      },
      include: {
        client: { select: bookingClientResponseSelect },
        professional: true,
        service: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // Reutilizado por PublicBookingService para calcular disponibilidad:
  // trae solo lo estrictamente necesario (horario + profesional) de las
  // citas no canceladas de un rango de fecha, para uno o varios
  // profesionales a la vez. Nunca expone cliente ni servicio — quien
  // llama esto es un endpoint público y esos datos no deben salir de ahí.
  async findActiveBookingsInRange(
    organizationId: string,
    professionalIds: string[],
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    return await this.prisma.db.booking.findMany({
      where: {
        organizationId,
        professionalId: { in: professionalIds },
        status: { not: BookingStatus.CANCELLED },
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      select: { professionalId: true, startTime: true, endTime: true },
    });
  }

  // Reprogramar: cambia fecha/hora y, opcionalmente, profesional y/o
  // servicio de una cita ya creada. No permite reasignar el cliente —
  // eso sería una operación distinta (crear una reserva nueva), no
  // "reprogramar" la existente.
  async reschedule(
    id: string,
    organizationId: string,
    dto: RescheduleBookingDto,
  ): Promise<Booking> {
    return this.prisma.db.$transaction((tx) =>
      this.rescheduleInTransaction(tx, id, organizationId, dto),
    );
  }

  private async rescheduleInTransaction(
    transaction: Prisma.TransactionClient,
    id: string,
    organizationId: string,
    dto: RescheduleBookingDto,
  ): Promise<Booking> {
    const booking = await transaction.booking.findFirst({
      where: { id, organizationId },
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada en esta barbería');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(
        'No se puede reprogramar una reserva cancelada',
      );
    }

    const professionalId = dto.professionalId ?? booking.professionalId;
    const serviceId = dto.serviceId ?? booking.serviceId;

    // isActive: true — rechaza servicios o profesionales dados de baja.
    const lockedProfessional = await lockProfessionalForBookingIntegrity(
      transaction,
      professionalId,
      organizationId,
    );
    if (lockedProfessional?.status !== ProfessionalStatus.ACTIVE) {
      throw new BadRequestException(
        'Profesional no encontrado en esta barbería',
      );
    }

    const service = await transaction.service.findUnique({
      where: { id: serviceId, organizationId, isActive: true },
    });
    if (!service) {
      throw new BadRequestException('Servicio no encontrado en esta barbería');
    }

    // ProfessionalService NO se usa como barrera de negocio en esta fase
    // (ver create() — misma decisión de producto aplica a reprogramación).

    const startDate = dto.startTime
      ? new Date(dto.startTime)
      : booking.startTime;
    if (startDate.getTime() < Date.now()) {
      throw new BadRequestException(
        'No se puede reprogramar una cita a una fecha u hora que ya pasó',
      );
    }
    const endDate = new Date(startDate.getTime() + service.duration * 60000);

    await this.assertNoConflict(
      organizationId,
      professionalId,
      startDate,
      endDate,
      id,
      transaction,
    );

    try {
      return await transaction.booking.update({
        where: { id, organizationId },
        data: {
          professionalId,
          serviceId,
          startTime: startDate,
          endTime: endDate,
        },
      });
    } catch (error) {
      this.rethrowScheduleConflict(error);
    }
  }

  async updateStatus(
    id: string,
    organizationId: string,
    updateBookingStatusDto: UpdateBookingStatusDto,
    professionalId?: string,
  ): Promise<Booking> {
    return this.prisma.db.$transaction((tx) =>
      this.updateStatusInTransaction(
        tx,
        id,
        organizationId,
        updateBookingStatusDto,
        professionalId,
      ),
    );
  }

  private async updateStatusInTransaction(
    transaction: Prisma.TransactionClient,
    id: string,
    organizationId: string,
    updateBookingStatusDto: UpdateBookingStatusDto,
    professionalId?: string,
  ): Promise<Booking> {
    const booking = await transaction.booking.findFirst({
      where: {
        id,
        organizationId,
        ...(professionalId ? { professionalId } : {}),
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada en esta barbería');
    }

    if (booking.status === updateBookingStatusDto.status) return booking;

    const allowedStatuses = professionalId
      ? (BARBER_STATUS_TRANSITIONS[booking.status] ?? [])
      : (ADMIN_STATUS_TRANSITIONS[booking.status] ?? []);
    if (!allowedStatuses.includes(updateBookingStatusDto.status)) {
      throw new BadRequestException(
        professionalId
          ? 'Transición de estado no permitida para BARBER'
          : 'Transición administrativa de estado no permitida',
      );
    }

    const reactivatesFutureSchedule =
      booking.status === BookingStatus.CANCELLED &&
      FUTURE_OPERATIONAL_STATUSES.includes(updateBookingStatusDto.status) &&
      booking.startTime.getTime() > Date.now();
    if (reactivatesFutureSchedule) {
      const lockedProfessional = await lockProfessionalForBookingIntegrity(
        transaction,
        booking.professionalId,
        organizationId,
      );
      if (lockedProfessional?.status !== ProfessionalStatus.ACTIVE) {
        throw new ConflictException(
          'No se puede reactivar una reserva futura de un profesional inactivo o archivado',
        );
      }
    }

    try {
      return await transaction.booking.update({
        where: {
          id,
          organizationId,
          ...(professionalId ? { professionalId } : {}),
        },
        data: { status: updateBookingStatusDto.status },
      });
    } catch (error) {
      this.rethrowScheduleConflict(error);
    }
  }

  private rethrowScheduleConflict(error: unknown): never {
    if (isBookingScheduleConflictError(error)) {
      throw new ConflictException(SCHEDULE_CONFLICT_MESSAGE);
    }
    throw error;
  }
}
