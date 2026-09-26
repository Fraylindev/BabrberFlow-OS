import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CmsService } from './cms.service';

function fixture(role: UserRole = UserRole.OWNER) {
  const content = {
    publicName: 'Name',
    phone: null,
    description: null,
    address: null,
    googleMapsUrl: null,
  };
  const page = {
    version: 0,
    draftRevision: 0,
    draft: content,
    publishedSnapshot: null,
    publishedRevision: null,
    isPublished: false,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'tenant' }]),
    membership: { findUnique: jest.fn().mockResolvedValue({ role }) },
    organization: {
      findUnique: jest.fn().mockResolvedValue({
        isActive: true,
        deletedAt: null,
        slug: 'tenant',
        businessHours: null,
        timeZone: 'America/Santo_Domingo',
      }),
    },
    cmsPage: {
      findUnique: jest.fn().mockResolvedValue(page),
      update: jest.fn().mockResolvedValue({ ...page, version: 1 }),
    },
    cmsOperation: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const db = {
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
    logTransactional: jest.fn().mockResolvedValue(undefined),
  };
  const cache = { clear: jest.fn().mockResolvedValue(undefined) };
  return {
    tx,
    page,
    audit,
    cache,
    service: new CmsService(
      { db } as unknown as PrismaService,
      audit as unknown as AuditService,
      cache as unknown as Cache,
    ),
  };
}
const mutation = () => ({ expectedVersion: 0, idempotencyKey: randomUUID() });
describe('CMS servicio: permisos, concurrencia y fallos', () => {
  it('una lectura indisponible devuelve 503 sin información interna', async () => {
    const { service, tx } = fixture();
    tx.cmsPage.findUnique.mockRejectedValue(
      new Error('private database detail'),
    );
    await expect(service.read('tenant', 'actor', true)).rejects.toThrow(
      'La configuración no está disponible',
    );
  });
  it('invalidación que no termina tiene presupuesto y no crea recibo', async () => {
    jest.useFakeTimers();
    try {
      const { service, cache, tx } = fixture();
      cache.clear.mockImplementation(() => new Promise(() => undefined));
      const pending = service.mutate('tenant', 'actor', 'PUBLISH', mutation());
      const rejected = expect(pending).rejects.toThrow('No se pudo actualizar');
      await jest.advanceTimersByTimeAsync(2001);
      await rejected;
      expect(tx.cmsOperation.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
  it.each([UserRole.BARBER, UserRole.RECEPTIONIST, UserRole.CUSTOMER])(
    '%s no lee ni muta CMS',
    async (role) => {
      const { service } = fixture(role);
      await expect(service.read('tenant', 'actor')).rejects.toThrow('permiso');
      await expect(
        service.mutate('tenant', 'actor', 'SAVE_DRAFT', {
          ...mutation(),
          publicName: 'Name',
        }),
      ).rejects.toThrow('permiso');
    },
  );
  it.each(['PUBLISH', 'UNPUBLISH'] as const)(
    'ADMIN no ejecuta %s',
    async (operation) => {
      await expect(
        fixture(UserRole.ADMIN).service.mutate(
          'tenant',
          'actor',
          operation,
          mutation(),
        ),
      ).rejects.toThrow('permiso');
    },
  );
  it('rechaza patch vacío antes de escribir', async () => {
    const { service, tx } = fixture();
    await expect(
      service.mutate('tenant', 'actor', 'SAVE_DRAFT', mutation()),
    ).rejects.toThrow('al menos');
    expect(tx.cmsPage.update).not.toHaveBeenCalled();
  });
  it('la revisión obsoleta no escribe', async () => {
    const { service, tx } = fixture();
    await expect(
      service.mutate('tenant', 'actor', 'PUBLISH', {
        ...mutation(),
        expectedVersion: 2,
      }),
    ).rejects.toThrow('más recientes');
    expect(tx.cmsPage.update).not.toHaveBeenCalled();
  });
  it('guardar sobrevive a un fallo de auditoría sin invalidar ni publicar', async () => {
    const { service, audit, cache } = fixture(UserRole.ADMIN);
    audit.log.mockRejectedValue(new Error('fallo sintético'));
    await expect(
      service.mutate('tenant', 'actor', 'SAVE_DRAFT', {
        ...mutation(),
        publicName: 'Nuevo',
      }),
    ).resolves.toEqual({
      version: 1,
      isPublished: false,
      publishedRevision: null,
    });
    expect(audit.logTransactional).not.toHaveBeenCalled();
    expect(cache.clear).not.toHaveBeenCalled();
  });
  it.each(['audit', 'cache'] as const)(
    'publicar devuelve 503 seguro ante fallo %s',
    async (dependency) => {
      const { service, audit, cache, tx } = fixture();
      (dependency === 'audit'
        ? audit.logTransactional
        : cache.clear
      ).mockRejectedValue(new Error('private constraint detail'));
      await expect(
        service.mutate('tenant', 'actor', 'PUBLISH', mutation()),
      ).rejects.toThrow('No se pudo completar');
      expect(tx.cmsOperation.create).not.toHaveBeenCalled();
    },
  );
  it('revalida actor antes de devolver un recibo', async () => {
    const { service, tx } = fixture();
    tx.membership.findUnique.mockResolvedValue(null);
    await expect(
      service.mutate('tenant', 'actor', 'PUBLISH', mutation()),
    ).rejects.toThrow('permiso');
    expect(tx.cmsOperation.findUnique).not.toHaveBeenCalled();
  });
  it('preview contiene revisión concreta y no datos operativos privados', async () => {
    const { service, page } = fixture();
    await expect(service.read('tenant', 'actor', true)).resolves.toEqual({
      version: 0,
      draftRevision: 0,
      content: page.draft,
      slug: 'tenant',
    });
  });
  it('no publica un valor legacy inválido ni lo sustituye silenciosamente', async () => {
    const { service, page } = fixture();
    page.draft.publicName = ' ';
    await expect(
      service.mutate('tenant', 'actor', 'PUBLISH', mutation()),
    ).rejects.toThrow('Revisa los campos');
  });
});
