import { validate } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';
import { UpdateServiceDto } from './update-service.dto';

function createDto(price: number): CreateServiceDto {
  return Object.assign(new CreateServiceDto(), {
    name: 'Corte QA',
    duration: 30,
    price,
  });
}

describe('Service price DTO', () => {
  it.each([0.01, 1, 125.5, 125.55])(
    'acepta precio DOP válido %s',
    async (price) => {
      await expect(validate(createDto(price))).resolves.toHaveLength(0);
    },
  );

  it.each([0, -1, 125.555])('rechaza precio inválido %s', async (price) => {
    const errors = await validate(createDto(price));
    expect(errors.some((error) => error.property === 'price')).toBe(true);
  });

  it.each([0, 125.555])(
    'UpdateServiceDto conserva la validación monetaria para %s',
    async (price) => {
      const dto = Object.assign(new UpdateServiceDto(), { price });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'price')).toBe(true);
    },
  );
});
