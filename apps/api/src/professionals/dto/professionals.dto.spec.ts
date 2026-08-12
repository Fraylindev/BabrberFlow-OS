import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ProfessionalStatus } from '@prisma/client';
import { CreateProfessionalDto } from './create-professional.dto';
import { LinkProfessionalUserDto } from './link-professional-user.dto';
import { QueryProfessionalsDto } from './query-professionals.dto';
import { UpdateOwnProfessionalDto } from './update-own-professional.dto';

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

  it('rejects management-only fields from BARBER self-edit DTO', () => {
    const dto = plainToInstance(UpdateOwnProfessionalDto, {
      name: 'Ana',
      phone: '+18095550101',
      status: ProfessionalStatus.ACTIVE,
      isPublic: true,
      userId: '00000000-0000-4000-8000-000000000001',
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['phone', 'status', 'isPublic', 'userId']),
    );
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
});
