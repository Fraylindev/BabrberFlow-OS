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
import { BookingStatus } from '@prisma/client'; // 🛡️ Importamos el Enum oficial de Prisma

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createBookingDto: CreateBookingDto) {
    const { clientId, professionalId, serviceId, startTime } = createBookingDto;

    // isActive: true — rechaza servicios o profesionales dados de baja.
    // No afecta reservas históricas ya creadas (no se tocan registros existentes).
    const service = await this.prisma.db.service.findUnique({
      where: { id: serviceId, organizationId, isActive: true },
    });
    if (!service) {
      throw new BadRequestException('Servicio no encontrado en esta barbería');
    }

    const professional = await this.prisma.db.professional.findUnique({
      where: { id: professionalId, organizationId, isActive: true },
    });
    if (!professional) {
      throw new BadRequestException(
        'Profesional no encontrado en esta barbería',
      );
    }

    const client = await this.prisma.db.client.findUnique({
      where: { id: clientId, organizationId },
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
    );

    return await this.prisma.db.booking.create({
      data: {
        organizationId,
        clientId,
        professionalId,
        serviceId,
        startTime: startDate,
        endTime: endDate,
      },
    });
  }

  private async assertNoConflict(
    organizationId: string,
    professionalId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ) {
    const conflictingBooking = await this.prisma.db.booking.findFirst({
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
      throw new ConflictException(
        'El profesional ya tiene una cita reservada en este horario',
      );
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
        client: true,
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
  ) {
    const booking = await this.prisma.db.booking.findFirst({
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
    const service = await this.prisma.db.service.findUnique({
      where: { id: serviceId, organizationId, isActive: true },
    });
    if (!service) {
      throw new BadRequestException('Servicio no encontrado en esta barbería');
    }

    const professional = await this.prisma.db.professional.findUnique({
      where: { id: professionalId, organizationId, isActive: true },
    });
    if (!professional) {
      throw new BadRequestException(
        'Profesional no encontrado en esta barbería',
      );
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
    );

    return await this.prisma.db.booking.update({
      where: { id },
      data: {
        professionalId,
        serviceId,
        startTime: startDate,
        endTime: endDate,
      },
    });
  }

  async updateStatus(
    id: string,
    organizationId: string,
    updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.db.booking.findFirst({
      where: { id, organizationId },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada en esta barbería');
    }

    return await this.prisma.db.booking.update({
      where: { id },
      data: { status: updateBookingStatusDto.status },
    });
  }
}
