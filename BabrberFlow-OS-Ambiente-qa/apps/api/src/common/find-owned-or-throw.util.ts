import { NotFoundException } from '@nestjs/common';

// Cualquier delegate de Prisma expone findFirst con esta forma — no hace
// falta importar los tipos concretos de cada modelo para esto.
interface OwnedRecordDelegate<T> {
  findFirst(args: {
    where: { id: string; organizationId: string };
  }): Promise<T | null>;
}

/**
 * Antes duplicado tal cual en ProfessionalsService, ServicesService y
 * ClientsService — misma consulta, mismo patrón de 404, solo cambiaba el
 * modelo y el mensaje. Un solo lugar ahora.
 *
 * 🔒 organizationId es parte de la MISMA consulta que busca el registro,
 * no una verificación aparte después. Si el registro existe pero es de
 * otra organización, esto lanza 404 exactamente igual que si no
 * existiera — nunca revela que el id pertenece a otra organización.
 */
export async function findOwnedByOrgOrThrow<T>(
  delegate: OwnedRecordDelegate<T>,
  id: string,
  organizationId: string,
  notFoundMessage: string,
): Promise<T> {
  const record = await delegate.findFirst({ where: { id, organizationId } });

  if (!record) {
    throw new NotFoundException(notFoundMessage);
  }

  return record;
}
