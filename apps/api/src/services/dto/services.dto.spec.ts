import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_MAX_DURATION_MINUTES,
  SERVICE_NAME_MAX_LENGTH,
} from '../services.constants';
import { CreateServiceDto } from './create-service.dto';
import { QueryServicesDto } from './query-services.dto';
import { UpdateServiceDto } from './update-service.dto';

function createDto(input: Partial<CreateServiceDto> = {}): CreateServiceDto {
  return plainToInstance(CreateServiceDto, {
    name: 'Corte QA',
    duration: 30,
    price: 125.5,
    ...input,
  });
}

describe('DTOs de Servicios', () => {
  it.each([0.01, 1, 125.5, 125.55])(
    'acepta precio DOP válido %s',
    async (price) => {
      await expect(validate(createDto({ price }))).resolves.toHaveLength(0);
    },
  );

  it.each([0, -1, 125.555])('rechaza precio inválido %s', async (price) => {
    const errors = await validate(createDto({ price }));
    expect(errors.some((error) => error.property === 'price')).toBe(true);
  });

  it('recorta los textos antes de validarlos', async () => {
    const dto = createDto({
      name: '  Corte clásico  ',
      description: '  Con terminación  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Corte clásico');
    expect(dto.description).toBe('Con terminación');
  });

  it.each([
    [{ name: undefined }, 'name'],
    [{ name: '   ' }, 'name'],
    [{ duration: undefined }, 'duration'],
    [{ price: undefined }, 'price'],
  ] as const)('exige los campos requeridos: %s', async (input, property) => {
    const errors = await validate(createDto(input));
    expect(errors.some((error) => error.property === property)).toBe(true);
  });

  it.each([
    [{ name: 'x'.repeat(SERVICE_NAME_MAX_LENGTH + 1) }, 'name'],
    [
      { description: 'x'.repeat(SERVICE_DESCRIPTION_MAX_LENGTH + 1) },
      'description',
    ],
    [{ duration: 30.5 }, 'duration'],
    [{ duration: SERVICE_MAX_DURATION_MINUTES + 1 }, 'duration'],
  ] as const)('rechaza límites inválidos: %s', async (input, property) => {
    const errors = await validate(createDto(input));
    expect(errors.some((error) => error.property === property)).toBe(true);
  });

  it('UpdateServiceDto conserva validaciones y no admite isActive', async () => {
    const monetary = plainToInstance(UpdateServiceDto, { price: 125.555 });
    const priceErrors = await validate(monetary);
    expect(priceErrors.some((error) => error.property === 'price')).toBe(true);

    const state = plainToInstance(UpdateServiceDto, { isActive: false });
    const stateErrors = await validate(state, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(stateErrors.some((error) => error.property === 'isActive')).toBe(
      true,
    );
  });

  it.each(['true', 'false', ' true '])(
    'acepta el filtro de estado %s',
    async (isActive) => {
      const dto = plainToInstance(QueryServicesDto, { isActive });
      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('rechaza un filtro de estado desconocido', async () => {
    const dto = plainToInstance(QueryServicesDto, { isActive: 'all' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'isActive')).toBe(true);
  });
});
