import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '@prisma/client'; // 🛡️ Importamos el Enum oficial de Prisma

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createBookingDto: CreateBookingDto) {
    const { clientId, professionalId, serviceId, startTime } = createBookingDto;

    const service = await this.prisma.db.service.findUnique({
      where: { id: serviceId, organizationId },
    });
    if (!service) {
      throw new BadRequestException('Servicio no encontrado en esta barbería');
    }

    const professional = await this.prisma.db.professional.findUnique({
      where: { id: professionalId, organizationId },
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

    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + service.duration * 60000);

    // 🛡️ Buscamos choques, pero IGNORAMOS las citas canceladas usando el Enum oficial
    const conflictingBooking = await this.prisma.db.booking.findFirst({
      where: {
        organizationId,
        professionalId,
        startTime: { lt: endDate },
        endTime: { gt: startDate },
        status: { not: BookingStatus.CANCELLED }, // ✅ Error solucionado
      },
    });

    if (conflictingBooking) {
      throw new ConflictException(
        'El profesional ya tiene una cita reservada en este horario',
      );
    }

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

  // professionalId opcional: cuando se pasa, restringe el listado a la
  // agenda de ese profesional únicamente — así es como un BARBER ve "mi
  // agenda" en vez de la de toda la barbería.
  async findAll(organizationId: string, professionalId?: string) {
    return await this.prisma.db.booking.findMany({
      where: {
        organizationId,
        ...(professionalId ? { professionalId } : {}),
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
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
