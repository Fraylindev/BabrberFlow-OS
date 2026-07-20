import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createInvoiceDto: CreateInvoiceDto) {
    const { bookingId, amount } = createInvoiceDto;

    // 1. Validar que la reserva existe y pertenece a la organización
    const booking = await this.prisma.db.booking.findUnique({
      where: { id: bookingId, organizationId },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada en esta barbería');
    }

    // 2. Validar que la reserva no tenga ya una factura emitida
    const existingInvoice = await this.prisma.db.invoice.findUnique({
      where: { bookingId },
    });

    if (existingInvoice) {
      throw new ConflictException('Esta reserva ya tiene una factura generada');
    }

    // 3. Crear la factura
    return await this.prisma.db.invoice.create({
      data: {
        organizationId,
        bookingId,
        amount,
      },
    });
  }

  async findAll(organizationId: string) {
    return await this.prisma.db.invoice.findMany({
      where: { organizationId },
      include: {
        booking: {
          include: {
            client: true,
            professional: true,
            service: true,
          },
        },
      },
    });
  }

  // 🔄 Endpoint especial para registrar el pago
  async markAsPaid(id: string, organizationId: string) {
    const invoice = await this.prisma.db.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada en esta barbería');
    }

    return await this.prisma.db.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
    });
  }
}
