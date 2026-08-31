import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ProfessionalStatus } from '@prisma/client';
import { CreateProfessionalDto } from './create-professional.dto';
import { LinkProfessionalUserDto } from './link-professional-user.dto';
import { QueryProfessionalsDto } from './query-professionals.dto';
import { UpdateOwnProfessionalDto } from './update-own-professional.dto';
import {
  CreateAvailabilityBlockDto,
  ReplaceWeeklyScheduleDto,
  UpdateAvailabilityBlockDto,
} from './professional-availability.dto';

describe('Professional DTO validation', () => {
  it('trims string fields before applying validation limits', () => {
    const dto = plainToInstance(CreateProfessionalDto, {
      name: '  Ana  ',
      avatar: '  https://example.com/avatar.jpg  ',
      bio: '  Bio  ',
    });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.name).toBe('Ana');
    expect(dto.avatar).toBe('https://example.com/avatar.jpg');
    expect(dto.bio).toBe('Bio');
  });

  it.each([
    { name: '   ' },
    { name: 'Ana', avatar: 'data:image/png;base64,AAAA' },
    { name: 'Ana', avatar: 'not-a-url' },
    { name: 'Ana', experienceYears: -1 },
    { name: 'Ana', experienceYears: 1.5 },
  ])('rejects invalid create payload %#', (payload) => {
    const dto = plainToInstance(CreateProfessionalDto, payload);
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it.each([
    ['normalizado', '  +18095550101  ', '+18095550101'],
    ['limpio', null, null],
  ])('accepts own phone %s for BARBER', (_case, phone, expected) => {
    const dto = plainToInstance(UpdateOwnProfessionalDto, {
      phone,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
    expect(dto.phone).toBe(expected);
  });

  it('accepts the A1 public profile fields together with private own phone', () => {
    const dto = plainToInstance(UpdateOwnProfessionalDto, {
      name: '  Ana  ',
      bio: '  Bio  ',
      avatar: '  https://example.com/avatar.jpg  ',
      specialty: '  Fade  ',
      experienceYears: 5,
      phone: '  +18095550101  ',
    });
    expect(
      validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    expect(dto).toEqual({
      name: 'Ana',
      bio: 'Bio',
      avatar: 'https://example.com/avatar.jpg',
      specialty: 'Fade',
      experienceYears: 5,
      phone: '+18095550101',
    });
  });

  it('allows clearing optional own fields without clearing the name', () => {
    const dto = plainToInstance(UpdateOwnProfessionalDto, {
      bio: null,
      avatar: null,
      specialty: null,
      experienceYears: null,
      phone: null,
    });
    expect(
      validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
  });

  it.each([
    { name: null },
    { name: '   ' },
    { name: 'x'.repeat(121) },
    { bio: 'x'.repeat(2001) },
    { specialty: 'x'.repeat(121) },
    { phone: 123 },
    { phone: 'x'.repeat(31) },
    { avatar: 'javascript:alert(1)' },
    { avatar: 'data:image/png;base64,AAAA' },
    { experienceYears: -1 },
    { experienceYears: 1.5 },
  ])('rejects invalid own profile payload %#', (payload) => {
    expect(
      validateSync(plainToInstance(UpdateOwnProfessionalDto, payload)).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    ['status', ProfessionalStatus.ACTIVE],
    ['isPublic', true],
    ['userId', '00000000-0000-4000-8000-000000000001'],
    ['organizationId', '00000000-0000-4000-8000-000000000002'],
    ['id', '00000000-0000-4000-8000-000000000003'],
    ['role', 'OWNER'],
    ['linkedUser', { id: 'other-user' }],
  ])('rejects BARBER self-edit field %s', (field, value) => {
    const dto = plainToInstance(UpdateOwnProfessionalDto, {
      phone: '+18095550101',
      [field]: value,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property)).toContain(field);
  });

  it.each([
    { page: '0' },
    { page: '-1' },
    { limit: '0' },
    { limit: '101' },
    { status: 'DELETED' },
    { search: '   ' },
  ])('rejects invalid list query %#', (payload) => {
    const dto = plainToInstance(QueryProfessionalsDto, payload);
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('accepts page/limit boundaries and a valid state', () => {
    const dto = plainToInstance(QueryProfessionalsDto, {
      page: ' 1 ',
      limit: ' 100 ',
      status: ProfessionalStatus.ARCHIVED,
    });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.page).toBe('1');
    expect(dto.limit).toBe('100');
  });

  it('requires a UUID for explicit account linking', () => {
    const invalid = plainToInstance(LinkProfessionalUserDto, {
      userId: 'barber-id',
    });
    const valid = plainToInstance(LinkProfessionalUserDto, {
      userId: ' 00000000-0000-4000-8000-000000000001 ',
    });

    expect(validateSync(invalid).length).toBeGreaterThan(0);
    expect(validateSync(valid)).toEqual([]);
    expect(valid.userId).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('validates multiple weekly shifts with strict HH:mm values', () => {
    const valid = plainToInstance(ReplaceWeeklyScheduleDto, {
      shifts: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
      ],
    });
    const invalid = plainToInstance(ReplaceWeeklyScheduleDto, {
      shifts: [{ dayOfWeek: 7, startTime: '9:00', endTime: '25:00' }],
    });

    expect(validateSync(valid)).toEqual([]);
    expect(validateSync(invalid).length).toBeGreaterThan(0);
  });

  it('validates block timestamps, status and internal note limit', () => {
    const valid = plainToInstance(CreateAvailabilityBlockDto, {
      startTime: '2099-01-05T14:00:00.000Z',
      endTime: '2099-01-05T15:00:00.000Z',
      note: 'Interna',
    });
    const invalid = plainToInstance(UpdateAvailabilityBlockDto, {
      startTime: 'tomorrow',
      status: 'DELETED',
      note: 'x'.repeat(501),
    });

    expect(validateSync(valid)).toEqual([]);
    expect(validateSync(invalid).length).toBeGreaterThan(0);
  });

  it.each([
    {
      startTime: '2099-01-05T14:00:00',
      endTime: '2099-01-05T15:00:00.000Z',
    },
    {
      startTime: '2099-01-05T14:00:00.000Z',
      endTime: '2099-01-05T15:00:00',
    },
  ])('rejects block timestamps without an explicit time zone %#', (payload) => {
    const dto = plainToInstance(CreateAvailabilityBlockDto, payload);

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it.each([
    {
      startTime: '2099-01-05T14:00:00.000Z',
      endTime: '2099-01-05T15:00:00.000Z',
    },
    {
      startTime: '2099-01-05T10:00:00.000-04:00',
      endTime: '2099-01-05T11:00:00.000-04:00',
    },
  ])(
    'accepts block timestamps with UTC or an explicit offset %#',
    (payload) => {
      const dto = plainToInstance(CreateAvailabilityBlockDto, payload);

      expect(validateSync(dto)).toEqual([]);
    },
  );

  it('applies the explicit-zone rule to partial block updates', () => {
    const dto = plainToInstance(UpdateAvailabilityBlockDto, {
      startTime: '2099-01-05T14:00:00',
    });

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
