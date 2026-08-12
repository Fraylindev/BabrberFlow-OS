import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

// 1. Tipados estrictos de entrada para los métodos evaluados
type FindFirstArgs = [{ where: { status?: { not?: BookingStatus } } }];
type CreateBookingArgs = [
  { data: { startTime: Date; endTime: Date; [key: string]: unknown } },
];
type UpdateBookingArgs = [
  {
    data: {
      professionalId: string;
      serviceId: string;
      startTime: Date;
      endTime: Date;
    };
  },
];

// 2. Mock tipado desde el origen usando genéricos nativos de Jest.
// ProfessionalService NO se incluye: fue eliminado como barrera de negocio
// (decisión de producto 2026-08-10). Cualquier profesional activo puede
// realizar cualquier servicio activo de la organización.
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
        update: jest.fn<
          Promise<{ id: string; [key: string]: unknown }>,
          UpdateBookingArgs
        >(),
        findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
      },
    },
  };
}

const ORG_ID = 'org-1';
const SERVICE = {
  id: 'service-1',
  organizationId: ORG_ID,
  duration: 30,
  isActive: true,
};
const PROFESSIONAL = { id: 'prof-1', organizationId: ORG_ID, isActive: true };
const CLIENT = { id: 'client-1', organizationId: ORG_ID };

// Fecha futura fija — evita que los tests dependan del reloj real y
// fallen solos con el paso del tiempo.
const FUTURE_DATE = '2099-01-01T10:00:00.000Z';

const VALID_DTO = {
  clientId: CLIENT.id,
  professionalId: PROFESSIONAL.id,
  serviceId: SERVICE.id,
  startTime: FUTURE_DATE,
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

  // ── Nueva regla: sin ProfessionalService ─────────────────────────────────
  // Decisión de producto (2026-08-10): la tabla ProfessionalService no actúa
  // como barrera de reserva. Cualquier profesional activo puede realizar
  // cualquier servicio activo de la organización — la ausencia de un registro
  // ProfessionalService no debe impedir crear ni reprogramar.
  it('permite crear una reserva sin registro ProfessionalService (nueva regla de producto)', async () => {
    // No hay mock de professionalService en el setup — si el código lo
    // consultara, lanzaría TypeError al llamar a undefined.findUnique.
    // El test pasa porque la consulta fue eliminada de la lógica de negocio.
    const result = await service.create(ORG_ID, VALID_DTO);

    expect(result.id).toBe('booking-nuevo');
    expect(prisma.db.booking.create).toHaveBeenCalledTimes(1);
    // Garantía explícita: professionalService no existe en el mock → si
    // el servicio lo invocara, el test fallaría con TypeError.
    expect(
      (prisma.db as Record<string, unknown>)['professionalService'],
    ).toBeUndefined();
  });

  // ── isActive — rechazar inactivos ─────────────────────────────────────────
  it('rechaza si el profesional está inactivo (isActive: false)', async () => {
    // Cuando isActive: true está en el where, Prisma devuelve null para
    // un profesional inactivo. Simulamos ese comportamiento aquí.
    prisma.db.professional.findUnique.mockResolvedValue(null);

    await expect(service.create(ORG_ID, VALID_DTO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.db.booking.create).not.toHaveBeenCalled();
  });

  it('rechaza si el servicio está inactivo (isActive: false)', async () => {
    prisma.db.service.findUnique.mockResolvedValue(null);

    await expect(service.create(ORG_ID, VALID_DTO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.db.booking.create).not.toHaveBeenCalled();
  });

  // ── Conflictos de horario ─────────────────────────────────────────────────
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

  // ── Aislamiento multi-tenant ─────────────────────────────────────────────
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

  it('rechaza una reserva con fecha/hora en el pasado', async () => {
    await expect(
      service.create(ORG_ID, {
        ...VALID_DTO,
        startTime: '2020-01-01T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.db.booking.create).not.toHaveBeenCalled();
  });
});

describe('BookingsService — reprogramar (reschedule)', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const EXISTING_BOOKING = {
    id: 'booking-1',
    organizationId: ORG_ID,
    professionalId: PROFESSIONAL.id,
    serviceId: SERVICE.id,
    startTime: new Date(FUTURE_DATE),
    status: BookingStatus.CONFIRMED,
  };

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
    prisma.db.booking.findFirst.mockResolvedValue(EXISTING_BOOKING);
    prisma.db.booking.update.mockImplementation(
      (args: {
        data: {
          professionalId: string;
          serviceId: string;
          startTime: Date;
          endTime: Date;
        };
      }) => Promise.resolve({ id: EXISTING_BOOKING.id, ...args.data }),
    );
  });

  it('reprograma la reserva a una nueva fecha', async () => {
    prisma.db.booking.findFirst
      .mockResolvedValueOnce(EXISTING_BOOKING) // búsqueda de la reserva propia
      .mockResolvedValueOnce(null); // búsqueda de choque de horario

    const result = await service.reschedule(EXISTING_BOOKING.id, ORG_ID, {
      startTime: FUTURE_DATE,
    });

    expect(result.id).toBe(EXISTING_BOOKING.id);
    expect(prisma.db.booking.update).toHaveBeenCalledTimes(1);
  });

  // ── Nueva regla: sin ProfessionalService ─────────────────────────────────
  it('permite reprogramar a un profesional diferente sin registro ProfessionalService', async () => {
    const OTHER_PROFESSIONAL = {
      id: 'prof-2',
      organizationId: ORG_ID,
      isActive: true,
    };
    prisma.db.professional.findUnique.mockResolvedValue(OTHER_PROFESSIONAL);
    prisma.db.booking.findFirst
      .mockResolvedValueOnce(EXISTING_BOOKING)
      .mockResolvedValueOnce(null);

    const result = await service.reschedule(EXISTING_BOOKING.id, ORG_ID, {
      professionalId: OTHER_PROFESSIONAL.id,
      startTime: FUTURE_DATE,
    });

    expect(result.id).toBe(EXISTING_BOOKING.id);
    expect(prisma.db.booking.update).toHaveBeenCalledTimes(1);
    // professionalService no está en el mock → cualquier llamada lanzaría TypeError
    expect(
      (prisma.db as Record<string, unknown>)['professionalService'],
    ).toBeUndefined();
  });

  it('rechaza reprogramar a un profesional inactivo', async () => {
    prisma.db.professional.findUnique.mockResolvedValue(null);
    prisma.db.booking.findFirst.mockResolvedValueOnce(EXISTING_BOOKING);

    await expect(
      service.reschedule(EXISTING_BOOKING.id, ORG_ID, {
        professionalId: 'prof-inactivo',
        startTime: FUTURE_DATE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.db.booking.update).not.toHaveBeenCalled();
  });

  it('rechaza reprogramar con un servicio inactivo', async () => {
    prisma.db.service.findUnique.mockResolvedValue(null);
    prisma.db.booking.findFirst.mockResolvedValueOnce(EXISTING_BOOKING);

    await expect(
      service.reschedule(EXISTING_BOOKING.id, ORG_ID, {
        serviceId: 'service-inactivo',
        startTime: FUTURE_DATE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.db.booking.update).not.toHaveBeenCalled();
  });

  // ── Validaciones existentes ───────────────────────────────────────────────
  it('rechaza reprogramar una reserva que no existe en la organización', async () => {
    prisma.db.booking.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.reschedule('booking-inexistente', ORG_ID, {
        startTime: FUTURE_DATE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza reprogramar una reserva cancelada', async () => {
    prisma.db.booking.findFirst.mockResolvedValueOnce({
      ...EXISTING_BOOKING,
      status: BookingStatus.CANCELLED,
    });

    await expect(
      service.reschedule(EXISTING_BOOKING.id, ORG_ID, {
        startTime: FUTURE_DATE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si el nuevo horario choca con otra cita del mismo profesional', async () => {
    prisma.db.booking.findFirst
      .mockResolvedValueOnce(EXISTING_BOOKING)
      .mockResolvedValueOnce({
        id: 'otra-reserva',
        status: BookingStatus.CONFIRMED,
      });

    await expect(
      service.reschedule(EXISTING_BOOKING.id, ORG_ID, {
        startTime: FUTURE_DATE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('BookingsService - Client security regressions', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new BookingsService(prisma as unknown as PrismaService);
    prisma.db.service.findUnique.mockResolvedValue(SERVICE);
    prisma.db.professional.findUnique.mockResolvedValue(PROFESSIONAL);
    prisma.db.booking.findFirst.mockResolvedValue(null);
  });

  it('requires an active client in the authoritative tenant query', async () => {
    prisma.db.client.findUnique.mockResolvedValue(null);

    await expect(service.create(ORG_ID, VALID_DTO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.db.client.findUnique).toHaveBeenCalledWith({
      where: { id: CLIENT.id, organizationId: ORG_ID, isActive: true },
    });
    expect(prisma.db.booking.create).not.toHaveBeenCalled();
  });

  it('selects only safe client contact fields in booking lists', async () => {
    prisma.db.booking.findMany.mockResolvedValue([]);

    await service.findAll(ORG_ID);

    const args = prisma.db.booking.findMany.mock.calls[0][0] as {
      include: { client: { select: Record<string, boolean> } };
    };
    expect(args.include.client.select).toEqual({
      id: true,
      name: true,
      email: true,
      phone: true,
    });
  });
});
