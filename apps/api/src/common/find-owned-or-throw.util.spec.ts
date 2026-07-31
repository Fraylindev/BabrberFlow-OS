import { NotFoundException } from '@nestjs/common';
import { findOwnedByOrgOrThrow } from './find-owned-or-throw.util';

// Esta única función respalda el aislamiento multi-tenant de Update/Delete
// en Profesionales, Servicios y Clientes (Fase 4 la centralizó ahí) — una
// prueba sólida aquí cubre las tres a la vez.
describe('findOwnedByOrgOrThrow — aislamiento multi-tenant', () => {
  it('devuelve el registro cuando pertenece a la organización', async () => {
    const record = { id: 'x-1', organizationId: 'org-1', name: 'Ana' };
    const delegate = { findFirst: jest.fn().mockResolvedValue(record) };

    const result = await findOwnedByOrgOrThrow(
      delegate,
      'x-1',
      'org-1',
      'No encontrado',
    );

    expect(result).toBe(record);
    // 🔒 organizationId debe ir en la MISMA consulta, no verificarse aparte.
    expect(delegate.findFirst).toHaveBeenCalledWith({
      where: { id: 'x-1', organizationId: 'org-1' },
    });
  });

  it('lanza 404 — nunca el registro — cuando existe pero es de otra organización', async () => {
    // Simula exactamente lo que Prisma devuelve: null, porque el filtro
    // compuesto (id + organizationId) no encontró coincidencia — como si
    // el registro no existiera. La función nunca puede saber "existe pero
    // no es tuyo" vs. "no existe", y eso es intencional.
    const delegate = { findFirst: jest.fn().mockResolvedValue(null) };

    await expect(
      findOwnedByOrgOrThrow(delegate, 'x-1', 'org-ajena', 'No encontrado'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el mensaje de error es el que pasa el llamador, no uno genérico', async () => {
    const delegate = { findFirst: jest.fn().mockResolvedValue(null) };

    await expect(
      findOwnedByOrgOrThrow(delegate, 'x-1', 'org-1', 'Cliente no encontrado'),
    ).rejects.toThrow('Cliente no encontrado');
  });
});
