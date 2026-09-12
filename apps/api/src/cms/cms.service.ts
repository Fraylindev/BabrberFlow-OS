import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Prisma, UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CmsMutationDto, SaveCmsDraftDto } from './cms.dto';
import {
  CONTENT_FIELDS,
  projectContent,
  projectReceipt,
} from './cms.projection';

type Operation = 'SAVE_DRAFT' | 'PUBLISH' | 'UNPUBLISH';

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private async authorize(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorUserId: string,
    publish = false,
  ) {
    const membership = await tx.membership.findUnique({
      where: { userId_organizationId: { userId: actorUserId, organizationId } },
      select: { role: true },
    });
    if (
      !membership ||
      (membership.role !== UserRole.OWNER &&
        (publish || membership.role !== UserRole.ADMIN))
    ) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
  }

  async read(organizationId: string, actorUserId: string, preview = false) {
    return this.prisma.db
      .$transaction(
        async (tx) => {
          await this.authorize(tx, organizationId, actorUserId);
          const page = await tx.cmsPage.findUnique({
            where: { organizationId },
          });
          const organization = await tx.organization.findUnique({
            where: { id: organizationId },
            select: { slug: true, businessHours: true, timeZone: true },
          });
          if (!page || !organization)
            throw new NotFoundException('Información no disponible.');
          const content = projectContent(page.draft);
          if (preview)
            return {
              version: page.version,
              draftRevision: page.draftRevision,
              content,
              slug: organization.slug,
            };
          return {
            ...projectReceipt(page),
            draftRevision: page.draftRevision,
            draft: content,
            publishedSnapshot:
              page.publishedSnapshot === null
                ? null
                : projectContent(page.publishedSnapshot),
            readOnly: organization,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      )
      .catch((error: unknown) => {
        if (error instanceof HttpException) throw error;
        throw new ServiceUnavailableException(
          'La configuración no está disponible. Intenta de nuevo.',
        );
      });
  }

  async mutate(
    organizationId: string,
    actorUserId: string,
    operation: Operation,
    dto: SaveCmsDraftDto | CmsMutationDto,
  ) {
    const patch = Object.fromEntries(
      CONTENT_FIELDS.filter(
        (key) => key in dto && dto[key as keyof typeof dto] !== undefined,
      ).map((key) => [key, (dto as SaveCmsDraftDto)[key]]),
    );
    if (operation === 'SAVE_DRAFT' && Object.keys(patch).length === 0)
      throw new BadRequestException('Indica al menos un campo para guardar.');
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          operation,
          expectedVersion: dto.expectedVersion,
          patch,
        }),
      )
      .digest('hex');
    let saved = false;
    try {
      const result = await this.prisma.db.$transaction(
        async (tx) => {
          // Mismo orden que gestión de Membership y creación pública. Revalidar después de esperar.
          const locked = await tx.$queryRaw<Array<{ id: string }>>(
            Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`,
          );
          if (locked.length !== 1)
            throw new NotFoundException('Información no disponible.');
          await this.authorize(
            tx,
            organizationId,
            actorUserId,
            operation !== 'SAVE_DRAFT',
          );
          const receipt = await tx.cmsOperation.findUnique({
            where: {
              organizationId_actorUserId_key: {
                organizationId,
                actorUserId,
                key: dto.idempotencyKey,
              },
            },
          });
          if (receipt) {
            if (receipt.requestHash !== requestHash)
              throw new ConflictException(
                'La solicitud ya se usó para otra acción. Recarga y revisa.',
              );
            return projectReceipt(receipt);
          }
          const page = await tx.cmsPage.findUnique({
            where: { organizationId },
          });
          if (!page)
            throw new ServiceUnavailableException(
              'La configuración no está disponible. Intenta de nuevo.',
            );
          if (page.version !== dto.expectedVersion)
            throw new ConflictException(
              'Hay cambios más recientes. Recarga y revisa antes de guardar.',
            );
          let updated = page;
          if (operation === 'SAVE_DRAFT') {
            const content = { ...projectContent(page.draft), ...patch };
            updated = await tx.cmsPage.update({
              where: { organizationId, version: dto.expectedVersion },
              data: {
                draft: content,
                version: { increment: 1 },
                draftRevision: { increment: 1 },
              },
            });
            saved = true;
          } else {
            if (operation === 'PUBLISH') {
              const org = await tx.organization.findUnique({
                where: { id: organizationId },
                select: { isActive: true, deletedAt: true },
              });
              if (!org?.isActive || org.deletedAt)
                throw new ConflictException(
                  'El negocio no está disponible para publicar.',
                );
              const content = projectContent(page.draft);
              const validated = plainToInstance(SaveCmsDraftDto, {
                ...content,
                expectedVersion: dto.expectedVersion,
                idempotencyKey: dto.idempotencyKey,
              });
              if ((await validate(validated)).length)
                throw new BadRequestException(
                  'Revisa los campos del borrador antes de publicar.',
                );
              // No normalizar al publicar: preview y snapshot representan exactamente la misma revisión.
              if (CONTENT_FIELDS.some((key) => validated[key] !== content[key]))
                throw new BadRequestException(
                  'Guarda los campos normalizados antes de publicar.',
                );
            }
            const changes =
              operation === 'PUBLISH'
                ? !page.isPublished ||
                  page.publishedRevision !== page.draftRevision
                : page.isPublished;
            if (changes) {
              updated = await tx.cmsPage.update({
                where: { organizationId, version: dto.expectedVersion },
                data:
                  operation === 'PUBLISH'
                    ? {
                        isPublished: true,
                        publishedSnapshot: projectContent(page.draft),
                        publishedRevision: page.draftRevision,
                        version: { increment: 1 },
                      }
                    : { isPublished: false, version: { increment: 1 } },
              });
              await this.audit.logTransactional(
                {
                  organizationId,
                  userId: actorUserId,
                  action: operation,
                  entity: 'CmsPage',
                  entityId: organizationId,
                },
                tx,
              );
            }
            // Sin CacheInterceptor público: otras réplicas siempre leen estado autoritativo.
            // Un fallo de invalidación revierte la publicación y su recibo/auditoría.
            await this.invalidatePublicCache();
          }
          const response = projectReceipt(updated);
          await tx.cmsOperation.create({
            data: {
              organizationId,
              actorUserId,
              key: dto.idempotencyKey,
              operation,
              requestHash,
              ...response,
            },
          });
          return response;
        },
        {
          maxWait: 5000,
          timeout: 10000,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
      if (saved) {
        // Fuera de la transacción: un fallo de log nunca aborta ni impide guardar.
        try {
          await this.audit.log({
            organizationId,
            userId: actorUserId,
            action: 'SAVE_DRAFT',
            entity: 'CmsPage',
            entityId: organizationId,
          });
        } catch {
          /* fail-open incluso ante fallo del adaptador */
        }
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No se pudo completar la acción. Recarga y reintenta con la misma solicitud.',
      );
    }
  }

  private async invalidatePublicCache(): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.cache.clear(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new ServiceUnavailableException(
                  'No se pudo actualizar la información pública. Reintenta la misma solicitud.',
                ),
              ),
            2000,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
