import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { isUniqueConstraintError } from '../common/prisma-error.util';

@Injectable()
export class PublicBookingService {
  constructor(
    private prisma: PrismaService,
    private bookingsService: BookingsService,
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

  // Datos públicos mínimos para armar el formulario de reserva: solo lo
  // que un visitante anónimo necesita ver, nada sensible.
  async getBookingData(slug: string) {
    const organization = await this.resolveOrganization(slug);

    const [services, professionals] = await Promise.all([
      this.prisma.db.service.findMany({
        where: { organizationId: organization.id },
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          price: true,
        },
      }),
      this.prisma.db.professional.findMany({
        where: { organizationId: organization.id, isActive: true },
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

  async createBooking(slug: string, dto: CreatePublicBookingDto) {
    const organization = await this.resolveOrganization(slug);

    if (dto.createAccount && !dto.clientEmail) {
      throw new BadRequestException(
        'Se necesita un correo para crear la cuenta',
      );
    }

    const client = await this.findOrCreateClient(organization.id, dto);

    // Reutiliza tal cual la validación y detección de conflictos de
    // BookingsService — cero lógica de negocio duplicada.
    const booking = await this.bookingsService.create(organization.id, {
      serviceId: dto.serviceId,
      professionalId: dto.professionalId,
      clientId: client.id,
      startTime: dto.startTime,
    });

    let accountCreated = false;
    let accountCreationError: string | null = null;

    if (dto.createAccount && dto.clientEmail && dto.password) {
      const result = await this.tryCreateCustomerAccount(
        organization.id,
        dto.clientName,
        dto.clientEmail,
        dto.password,
      );
      accountCreated = result.created;
      accountCreationError = result.error;
    }

    // La reserva SIEMPRE se confirma aunque falle la creación de cuenta
    // (es una funcionalidad secundaria dentro del flujo) — accountCreated
    // en false con un motivo es la respuesta correcta, no un 409 que
    // tumbe una reserva que sí se hizo.
    return { booking, client, accountCreated, accountCreationError };
  }

  // Empareja por teléfono dentro de la organización primero (no hay
  // restricción única sobre el teléfono, es un match best-effort). Si no
  // hay match y sí se crea, protege contra la restricción única nueva de
  // (organizationId, email): si alguien ya existe con ese correo pero
  // otro teléfono, reutiliza ese cliente en vez de fallar la reserva.
  private async findOrCreateClient(
    organizationId: string,
    dto: CreatePublicBookingDto,
  ) {
    const existing = await this.prisma.db.client.findFirst({
      where: { organizationId, phone: dto.clientPhone },
    });
    if (existing) return existing;

    try {
      return await this.prisma.db.client.create({
        data: {
          organizationId,
          name: dto.clientName,
          phone: dto.clientPhone,
          email: dto.clientEmail,
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err, 'email') && dto.clientEmail) {
        const byEmail = await this.prisma.db.client.findFirst({
          where: { organizationId, email: dto.clientEmail },
        });
        if (byEmail) return byEmail;
      }
      throw err;
    }
  }

  // Crea la cuenta CUSTOMER (identidad global) + su Membership en esta
  // organización. Nunca lanza — si el correo ya existe en Kortek
  // (en cualquier organización), no se adjunta nada a esa cuenta ajena
  // sin verificar contraseña; se reporta el motivo, la reserva ya
  // confirmada sigue siendo válida.
  private async tryCreateCustomerAccount(
    organizationId: string,
    name: string,
    email: string,
    password: string,
  ): Promise<{ created: boolean; error: string | null }> {
    const existing = await this.prisma.db.user.findUnique({
      where: { email },
    });
    if (existing) {
      return { created: false, error: 'EMAIL_ALREADY_EXISTS' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await this.prisma.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            lastOrganizationId: organizationId,
          },
        });
        await tx.membership.create({
          data: { userId: user.id, organizationId, role: UserRole.CUSTOMER },
        });
      });
      return { created: true, error: null };
    } catch (err) {
      if (isUniqueConstraintError(err, 'email')) {
        // Carrera: alguien creó esa cuenta entre el chequeo y el create.
        return { created: false, error: 'EMAIL_ALREADY_EXISTS' };
      }
      throw err;
    }
  }
}
