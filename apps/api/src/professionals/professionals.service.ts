import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { isForeignKeyConstraintError } from '../common/prisma-error.util';

@Injectable()
export class ProfessionalsService {
  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    createProfessionalDto: CreateProfessionalDto,
  ) {
    return await this.prisma.db.professional.create({
      data: {
        ...createProfessionalDto,
        organizationId, // 🔒 Inyectado de forma segura desde el JWT
      },
    });
  }

  async findAll(organizationId: string) {
    return await this.prisma.db.professional.findMany({
      where: { organizationId }, // 🔒 Filtro estricto multi-tenant
    });
  }

  // Resuelve qué Professional corresponde a un User dado (vínculo opcional
  // 1:1, ver schema.prisma). Usado para que un BARBER solo vea su propia
  // agenda/clientes, nunca los de sus compañeros.
  async findByUserId(userId: string) {
    return await this.prisma.db.professional.findUnique({
      where: { userId },
    });
  }

  // 🔒 findFirst (no findUnique por id solo) — así el filtro de
  // organizationId es parte de la MISMA consulta que busca el registro,
  // no una verificación aparte después. Si el profesional existe pero es
  // de otra organización, esto devuelve null exactamente igual que si no
  // existiera — nunca revela que el id pertenece a otra barbería.
  private async findOwnedByOrgOrThrow(id: string, organizationId: string) {
    const professional = await this.prisma.db.professional.findFirst({
      where: { id, organizationId },
    });

    if (!professional) {
      throw new NotFoundException('Profesional no encontrado');
    }

    return professional;
  }

  async update(
    id: string,
    organizationId: string,
    updateProfessionalDto: UpdateProfessionalDto,
  ) {
    await this.findOwnedByOrgOrThrow(id, organizationId);

    return await this.prisma.db.professional.update({
      where: { id },
      data: updateProfessionalDto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOwnedByOrgOrThrow(id, organizationId);

    try {
      return await this.prisma.db.professional.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        // Restrict a propósito (ver schema.prisma): un profesional con
        // reservas o servicios asignados no se borra en cascada — es
        // exactamente el mismo principio ya aplicado a Booking/Invoice.
        throw new ConflictException(
          'No se puede eliminar: este profesional tiene reservas o servicios asociados. Desactívalo en vez de borrarlo si ya no trabaja aquí.',
        );
      }
      throw err;
    }
  }
}
