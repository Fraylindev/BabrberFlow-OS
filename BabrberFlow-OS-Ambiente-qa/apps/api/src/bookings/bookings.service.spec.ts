import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

// 1. Tipados estrictos de entrada para los métodos evaluados
type FindFirstArgs = [{ where: { status?: { not?: BookingStatus } } }];
type CreateBookingArgs = [
  { data: { startTime: Date; endTime: Date; [key: string]: unknown } },
];

// 2. Mock tipado desde el origen usando genéricos nativos de Jest
function createMockPrisma() {
  return {
    db: {
      service: { findUnique: jest.fn() },
      professional: { findUnique: jest.fn() },
      client: { findUnique: jest.fn() },
      booking: {
        findFirst: jest.fn<
          Promise<{ id: string; status: BookingStatus } | null>,
          FindFirstArgs
        >(),
        create: jest.fn<
          Promise<{ id: string; [key: string]: unknown }>,
          CreateBookingArgs
        >(),
      },
    },
  };
}

const ORG_ID = 'org-1';
const SERVICE = { id: 'service-1', organizationId: ORG_ID, duration: 30 };
const PROFESSIONAL = { id: 'prof-1', organizationId: ORG_ID };
const CLIENT = { id: 'client-1', organizationId: ORG_ID };

const VALID_DTO = {
  clientId: CLIENT.id,
  professionalId: PROFESSIONAL.id,
  serviceId: SERVICE.id,
  startTime: '2026-08-01T10:00:00.000Z',
};

describe('BookingsService — conflictos de reservas', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);

    prisma.db.service.findUnique.mockResolvedValue(SERVICE);
    prisma.db.professional.findUnique.mockResolvedValue(PROFESSIONAL);
    prisma.db.client.findUnique.mockResolvedValue(CLIENT);
    prisma.db.booking.findFirst.mockResolvedValue(null);
    prisma.db.booking.create.mockImplementation((args) =>
      Promise.resolve({ id: 'booking-nuevo', ...args.data }),
    );
  });

  it('crea la reserva cuando no hay choque de horario', async () => {
    const result = await service.create(ORG_ID, VALID_DTO);

    expect(result.id).toBe('booking-nuevo');
    expect(prisma.db.booking.create).toHaveBeenCalledTimes(1);
  });

  it('rechaza la reserva si el profesional ya tiene una cita en ese horario', async () => {
    prisma.db.booking.findFirst.mockResolvedValue({
      id: 'booking-existente',
      status: BookingStatus.CONFIRMED,
    });

    await expect(service.create(ORG_ID, VALID_DTO)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.db.booking.create).not.toHaveBeenCalled();
  });

  it('ignora las citas CANCELLED al buscar choques de horario', async () => {
    await service.create(ORG_ID, VALID_DTO);

    // Cero castings: mock.calls infiere directamente FindFirstArgs
    const whereArg = prisma.db.booking.findFirst.mock.calls[0][0].where;
    expect(whereArg.status).toEqual({ not: BookingStatus.CANCELLED });
  });

  it('calcula endTime a partir de la duración real del servicio', async () => {
    prisma.db.service.findUnique.mockResolvedValue({
      ...SERVICE,
      duration: 45,
    });

    await service.create(ORG_ID, VALID_DTO);

    // Cero castings: mock.calls infiere directamente CreateBookingArgs
    const createArgs = prisma.db.booking.create.mock.calls[0][0].data;
    const diffMinutes =
      (createArgs.endTime.getTime() - createArgs.startTime.getTime()) / 60000;

    expect(diffMinutes).toBe(45);
  });

  it('rechaza si el servicio no pertenece a la organización del token', async () => {
    prisma.db.service.findUnique.mockResolvedValue(null);

    await expect(service.create(ORG_ID, VALID_DTO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza si el profesional no pertenece a la organización del token', async () => {
    prisma.db.professional.findUnique.mockResolvedValue(null);

    await expect(service.create(ORG_ID, VALID_DTO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza si el cliente no pertenece a la organización del token', async () => {
    prisma.db.client.findUnique.mockResolvedValue(null);

    await expect(service.create(ORG_ID, VALID_DTO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
