import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClientDto } from './create-client.dto';
import { QueryClientsDto } from './query-clients.dto';
import { CreatePublicBookingDto } from '../../public-booking/dto/create-public-booking.dto';

describe('Client DTO contracts', () => {
  it('trims values and lowercases email before validation', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: '  Ana Pérez  ',
      email: ' ANA@EXAMPLE.COM ',
      phone: ' (809) 555-1234 ',
      notes: ' nota ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '(809) 555-1234',
      notes: 'nota',
    });
  });

  it('rejects a page size above 100', async () => {
    const errors = await validate(
      plainToInstance(QueryClientsDto, { limit: '101' }),
    );
    expect(errors).toHaveLength(1);
  });

  it('validates UUIDs in the public booking input', async () => {
    const errors = await validate(
      plainToInstance(CreatePublicBookingDto, {
        serviceId: 'not-a-uuid',
        professionalId: 'also-not-a-uuid',
        startTime: '2099-01-01T10:00:00.000Z',
        clientName: 'Ana',
        clientPhone: '8095551234',
      }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['serviceId', 'professionalId']),
    );
  });
});
