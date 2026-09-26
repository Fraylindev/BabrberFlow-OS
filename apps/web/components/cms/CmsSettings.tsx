'use client';

import { useCallback, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  cmsFields,
  cmsForm,
  cmsHours,
  cmsInput,
  cmsStatus,
  validateCmsForm,
  type CmsContent,
  type CmsEditor,
  type CmsErrors,
} from '@/lib/cms-ui';
import { useCmsEditor, useCmsMutation, useCmsPreview, type CmsOperation } from '@/lib/queries/cms';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldWrapper, InputField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

const focusClass =
  'min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-accent)]';
const textareaClass =
  'min-h-32 w-full resize-y rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)]';
const labels: Record<keyof CmsContent, string> = {
  publicName: 'Nombre público',
  description: 'Descripción',
  phone: 'Teléfono público del negocio',
  address: 'Dirección',
  googleMapsUrl: 'Enlace de Google Maps',
};

function denied(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function friendlyError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión ya no está disponible. Vuelve a iniciar sesión.';
    if (error.status === 403)
      return 'Tu acceso a la configuración cambió. Actualiza tu acceso para continuar.';
    if (error.status === 400) return 'Revisa los campos del borrador y guárdalo antes de publicar.';
    if (error.status === 404)
      return 'La configuración no está disponible. Intenta cargarla de nuevo.';
    if (error.status === 409)
      return 'Hay cambios más recientes o el negocio no puede publicarse. Recarga y revisa antes de continuar.';
    if (error.status === 429)
      return 'Has hecho varias solicitudes seguidas. Espera un minuto y vuelve a intentarlo.';
  }
  return 'No pudimos completar la solicitud. Revisa tu conexión e intenta de nuevo.';
}

function Loading() {
  return (
    <div role="status" className="space-y-4">
      <p>Cargando configuración…</p>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function CmsSettings() {
  const { user, organization, isReady } = useAuth();
  const allowed =
    isReady && user && organization && (user.role === 'OWNER' || user.role === 'ADMIN');
  return (
    <section className="min-w-0 space-y-6 text-[var(--dash-text)]">
      <PageHeader
        tone="light"
        title="Configuración del negocio"
        description="Prepara y revisa la información pública de tu negocio."
      />
      {!isReady ? (
        <Loading />
      ) : !allowed ? (
        <Card tone="light" className="p-5">
          <p role="status">No tienes acceso a la configuración del negocio.</p>
        </Card>
      ) : (
        <Workspace
          key={`${user.id}:${organization.id}:${user.role}`}
          scope={`${user.id}:${organization.id}:${user.role}`}
          owner={user.role === 'OWNER'}
        />
      )}
    </section>
  );
}

function Workspace({ scope, owner }: { scope: string; owner: boolean }) {
  // A new visit gets a new query namespace, even for A → B → A.
  const [visit] = useState(() => crypto.randomUUID());
  const query = useCmsEditor(scope, visit);
  const [accessError, setAccessError] = useState<unknown>(null);
  const error = accessError || query.error;
  if (denied(error))
    return (
      <Card tone="light" className="space-y-4 p-5">
        <p role="alert">{friendlyError(error)}</p>
        <Button tone="light" className={focusClass} onClick={() => window.location.reload()}>
          Actualizar mi acceso
        </Button>
      </Card>
    );
  if (!query.data)
    return query.isPending ? (
      <Loading />
    ) : (
      <Card tone="light" className="space-y-4 p-5">
        <p role="alert">{friendlyError(query.error)}</p>
        <Button
          tone="light"
          className={focusClass}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Reintentar carga
        </Button>
      </Card>
    );
  return (
    <Editor
      scope={scope}
      visit={visit}
      owner={owner}
      query={query}
      initial={query.data}
      onDenied={setAccessError}
    />
  );
}

function Content({ content }: { content: CmsContent }) {
  return (
    <dl className="space-y-4 text-sm">
      {cmsFields.map((field) => (
        <div key={field}>
          <dt className="font-semibold text-[var(--dash-text-muted)]">{labels[field]}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {content[field] || 'Sin añadir'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Editor({
  scope,
  visit,
  owner,
  query,
  initial,
  onDenied,
}: {
  scope: string;
  visit: string;
  owner: boolean;
  query: ReturnType<typeof useCmsEditor>;
  initial: CmsEditor;
  onDenied: (error: unknown) => void;
}) {
  const [base, setBase] = useState(initial);
  const [form, setForm] = useState(() => cmsForm(initial.draft));
  const [errors, setErrors] = useState<CmsErrors>({});
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState<CmsOperation | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmation, setConfirmation] = useState<
    'publish' | 'unpublish' | 'discard' | 'rebase' | null
  >(null);
  const [reviewedVersion, setReviewedVersion] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const mutation = useCmsMutation();
  const queryClient = useQueryClient();
  useLayoutEffect(() => {
    const current = new AbortController();
    controller.current = current;
    return () => {
      current.abort();
      controller.current = null;
    };
  }, []);
  const closePreview = useCallback(() => setPreview(false), []);
  const closeConfirmation = useCallback(() => setConfirmation(null), []);
  const latest = query.data ?? base;
  const hasConflict = conflict || latest.version !== base.version;
  const dirty = cmsFields.some((field) => form[field] !== (base.draft[field] ?? ''));
  const blocked = busy || !!uncertain || hasConflict || !!query.error || query.isFetching;

  function adopt(editor: CmsEditor) {
    setBase(editor);
    setForm(cmsForm(editor.draft));
    setErrors({});
    setConflict(false);
    setReviewedVersion(null);
    setPreview(false);
    setConfirmation(null);
  }

  async function reload() {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted) return;
    const result = await query.refetch();
    if (signal.aborted) return;
    if (result.error) {
      setFailure(friendlyError(result.error));
      if (denied(result.error)) onDenied(result.error);
    } else {
      setFailure('');
      setMessage('Información actualizada. Revisa la versión guardada antes de continuar.');
    }
  }

  async function run(operation: CmsOperation) {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure('');
    setMessage('');
    setConfirmation(null);
    setPreview(false);
    setReviewedVersion(null);
    try {
      await mutation.mutateAsync({ operation, signal });
      if (signal.aborted) return;
      if (operation.kind !== 'draft') {
        queryClient.removeQueries({ queryKey: ['public-booking', base.readOnly.slug] });
      }
      // A receipt can be historical: only a fresh GET supplies the editor state.
      setUncertain(operation);
      const result = await query.refetch();
      if (signal.aborted) return;
      if (result.error || !result.data) {
        if (denied(result.error)) onDenied(result.error);
        setFailure(
          'La acción respondió, pero no pudimos consultar el estado actual. Consulta el estado y reintenta la misma acción.',
        );
        return;
      }
      setUncertain(null);
      adopt(result.data);
      setMessage(
        operation.kind === 'draft'
          ? 'Guardado confirmado. Se muestra el borrador actual; guardar no publica los cambios.'
          : 'Acción confirmada. Se muestra el estado actual de publicación.',
      );
    } catch (error) {
      if (signal.aborted) return;
      if (denied(error)) {
        onDenied(error);
        return;
      }
      setFailure(friendlyError(error));
      if (error instanceof ApiError && error.status < 500) {
        setUncertain(null);
        if (error.status === 409) setConflict(true);
      } else {
        setUncertain(operation);
        setFailure(
          'No pudimos confirmar el resultado. Consulta el estado y reintenta la misma acción; tu texto se conserva.',
        );
      }
    } finally {
      if (!signal.aborted) {
        lock.current = false;
        setBusy(false);
        mutation.reset();
      }
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (blocked || !dirty) return;
    const nextErrors = validateCmsForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFailure('Revisa los campos señalados.');
      const field = cmsFields.find((key) => nextErrors[key]);
      document.getElementById(`cms-${field}`)?.focus();
      return;
    }
    void run({
      kind: 'draft',
      body: {
        ...cmsInput(form),
        expectedVersion: base.version,
        idempotencyKey: crypto.randomUUID(),
      },
    });
  }

  function confirm() {
    if (busy || query.isFetching || query.error || uncertain) return;
    if (confirmation === 'discard') {
      adopt(latest);
      setFailure('');
      setMessage('Se cargó el borrador guardado.');
      return;
    }
    if (confirmation === 'rebase') {
      setBase(latest);
      setConflict(false);
      setFailure('');
      setConfirmation(null);
      setReviewedVersion(null);
      setMessage(
        'Tu texto sigue en el formulario. Revísalo y guarda para crear un nuevo borrador.',
      );
      return;
    }
    if (
      !owner ||
      hasConflict ||
      (confirmation === 'publish' && (dirty || reviewedVersion !== base.version))
    )
      return;
    if (confirmation === 'publish' || confirmation === 'unpublish')
      void run({
        kind: confirmation,
        body: { expectedVersion: base.version, idempotencyKey: crypto.randomUUID() },
      });
  }

  return (
    <div className="space-y-6">
      <Card tone="light" className="space-y-3 p-5">
        <p className="text-sm font-semibold">{cmsStatus(latest)}</p>
        <p className="text-sm text-[var(--dash-text-muted)]">
          {latest.isPublished
            ? 'Guardar un borrador conserva la publicación vigente.'
            : 'Prepara el borrador y revísalo. El propietario debe publicar para habilitar contenido y nuevas reservas públicas.'}
        </p>
        {!owner && (
          <p className="text-sm">
            Puedes editar y revisar. Solo el propietario puede publicar o retirar.
          </p>
        )}
        <p className="text-sm text-[var(--dash-text-muted)]">
          La vista previa permite revisar todos los campos. El mini-sitio público muestra únicamente
          la versión publicada y habilita nuevas reservas mientras la página permanezca publicada.
        </p>
      </Card>
      <div role="status" aria-live="polite" className="text-sm">
        {busy ? 'Procesando acción…' : message}
      </div>
      {(failure || query.error) && (
        <p role="alert" className="text-sm text-[var(--dash-danger)]">
          {failure || friendlyError(query.error)}
        </p>
      )}
      {!!query.error && (
        <Button
          tone="light"
          variant="secondary"
          className={focusClass}
          disabled={busy || query.isFetching}
          onClick={() => void reload()}
        >
          Reintentar carga
        </Button>
      )}
      {uncertain && (
        <Card tone="light" className="space-y-3 p-5">
          <h2 className="font-semibold">Resultado por confirmar</h2>
          <p className="text-sm">
            Mantendremos la misma acción para evitar duplicarla. El estado consultado aparece
            arriba.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              tone="light"
              variant="secondary"
              className={focusClass}
              disabled={busy || query.isFetching}
              onClick={() => void reload()}
            >
              Consultar estado
            </Button>
            <Button
              tone="light"
              className={focusClass}
              disabled={busy || query.isFetching || !!query.error}
              onClick={() => void run(uncertain)}
            >
              Reintentar la misma acción
            </Button>
          </div>
        </Card>
      )}
      {hasConflict && !uncertain && (
        <Card tone="light" className="space-y-4 p-5">
          <h2 className="font-semibold">Revisa los cambios antes de guardar</h2>
          <p role="alert" className="text-sm">
            Hay cambios más recientes o la publicación no está disponible. Tu texto continúa en el
            formulario. Recarga para comparar con el borrador guardado.
          </p>
          <Button
            tone="light"
            variant="secondary"
            className={focusClass}
            disabled={busy || query.isFetching}
            onClick={() => void reload()}
          >
            Recargar para comparar
          </Button>
          <details>
            <summary className="cursor-pointer py-3 font-medium">
              Borrador guardado · revisión {latest.draftRevision}
            </summary>
            <Content content={latest.draft} />
          </details>
          <div className="flex flex-wrap gap-3">
            <Button
              tone="light"
              variant="secondary"
              className={focusClass}
              disabled={busy || query.isFetching || !!query.error}
              onClick={() => setConfirmation('discard')}
            >
              Usar el borrador guardado
            </Button>
            <Button
              tone="light"
              variant="secondary"
              className={focusClass}
              disabled={
                busy || query.isFetching || !!query.error || latest.version === base.version
              }
              onClick={() => setConfirmation('rebase')}
            >
              Conservar mi texto tras comparar
            </Button>
          </div>
        </Card>
      )}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card tone="light" className="min-w-0 p-5 sm:p-6">
          <form
            onSubmit={save}
            noValidate
            className="space-y-5"
            aria-label="Información pública"
            aria-busy={busy}
          >
            <div>
              <h2 className="text-lg font-semibold">Información pública</h2>
              <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
                El nombre público es independiente del nombre usado para operar el negocio.
              </p>
            </div>
            <fieldset disabled={busy || !!uncertain} className="min-w-0 space-y-5">
              {cmsFields.map((field) => (
                <div key={field}>
                  {field === 'description' || field === 'address' ? (
                    <FieldWrapper
                      tone="light"
                      label={`${labels[field]} (opcional)`}
                      htmlFor={`cms-${field}`}
                    >
                      <textarea
                        id={`cms-${field}`}
                        className={textareaClass}
                        value={form[field]}
                        maxLength={field === 'description' ? 2000 : 300}
                        aria-invalid={!!errors[field]}
                        aria-describedby={`cms-${field}-help${errors[field] ? ` cms-${field}-error` : ''}`}
                        onChange={(event) => {
                          setForm({ ...form, [field]: event.target.value });
                          setReviewedVersion(null);
                        }}
                      />
                    </FieldWrapper>
                  ) : (
                    <InputField
                      tone="light"
                      label={`${labels[field]}${field === 'publicName' ? '' : ' (opcional)'}`}
                      id={`cms-${field}`}
                      value={form[field]}
                      type={field === 'phone' ? 'tel' : field === 'googleMapsUrl' ? 'url' : 'text'}
                      required={field === 'publicName'}
                      maxLength={
                        field === 'publicName' ? 100 : field === 'googleMapsUrl' ? 2048 : undefined
                      }
                      aria-invalid={!!errors[field]}
                      aria-describedby={`cms-${field}-help${errors[field] ? ` cms-${field}-error` : ''}`}
                      onChange={(event) => {
                        setForm({ ...form, [field]: event.target.value });
                        setReviewedVersion(null);
                      }}
                    />
                  )}
                  <p
                    id={`cms-${field}-help`}
                    className="mt-1 text-xs text-[var(--dash-text-muted)]"
                  >
                    {field === 'publicName'
                      ? 'Obligatorio. Entre 2 y 100 caracteres.'
                      : field === 'description'
                        ? `${form.description.length}/2000 caracteres. Texto plano.`
                        : field === 'address'
                          ? `${form.address.length}/300 caracteres.`
                          : field === 'phone'
                            ? 'Usa un contacto del negocio destinado al público. Entre 7 y 15 dígitos.'
                            : 'Enlace HTTPS de Google Maps, hasta 2048 caracteres. No se abre durante la vista previa.'}
                  </p>
                  {errors[field] && (
                    <p id={`cms-${field}-error`} className="mt-1 text-xs text-[var(--dash-danger)]">
                      {errors[field]}
                    </p>
                  )}
                </div>
              ))}
            </fieldset>
            <p className="text-sm text-[var(--dash-text-muted)]">
              {dirty
                ? 'Tienes cambios sin guardar. Guarda antes de abrir la vista previa.'
                : 'El formulario coincide con el borrador cargado.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                tone="light"
                className={focusClass}
                disabled={blocked || !dirty}
              >
                Guardar borrador
              </Button>
              <Button
                type="button"
                tone="light"
                variant="secondary"
                className={focusClass}
                disabled={blocked || dirty}
                onClick={() => setPreview(true)}
              >
                Vista previa
              </Button>
              {dirty && (
                <Button
                  type="button"
                  tone="light"
                  variant="ghost"
                  className={focusClass}
                  disabled={blocked}
                  onClick={() => setConfirmation('discard')}
                >
                  Descartar cambios
                </Button>
              )}
            </div>
          </form>
        </Card>
        <div className="min-w-0 space-y-6">
          <Card tone="light" className="space-y-4 p-5">
            <h2 className="font-semibold">Datos operativos · solo lectura</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium">Dirección de la página</dt>
                <dd className="mt-1 break-words [overflow-wrap:anywhere]">
                  /{latest.readOnly.slug}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Horario global</dt>
                <dd className="mt-1">{cmsHours(latest.readOnly.businessHours)}</dd>
              </div>
              <div>
                <dt className="font-medium">Referencia horaria</dt>
                <dd className="mt-1">Hora del negocio. Se conserva la configuración actual.</dd>
              </div>
            </dl>
            <p className="text-xs text-[var(--dash-text-muted)]">
              Estos datos no se editan desde esta pantalla.
            </p>
          </Card>
          {latest.publishedSnapshot && (
            <Card tone="light" className="p-5">
              <details>
                <summary className="cursor-pointer py-2 font-semibold">
                  {latest.isPublished ? 'Última versión publicada' : 'Última publicación retirada'}
                </summary>
                <Content content={latest.publishedSnapshot} />
              </details>
            </Card>
          )}
          {owner && latest.isPublished && (
            <Card tone="light" className="space-y-3 p-5">
              <h2 className="font-semibold">Retirar publicación</h2>
              <p className="text-sm text-[var(--dash-text-muted)]">
                Bloquea el contenido y nuevas reservas públicas. Conserva la operación interna y las
                reservas existentes.
              </p>
              <Button
                tone="light"
                variant="danger"
                className={focusClass}
                disabled={blocked || dirty}
                onClick={() => setConfirmation('unpublish')}
              >
                Retirar página pública
              </Button>
              {dirty && <p className="text-sm">Guarda o descarta los cambios del formulario antes de retirar la publicación.</p>}
            </Card>
          )}
        </div>
      </div>
      {preview && (
        <Preview
          scope={scope}
          visit={visit}
          version={base.version}
          owner={owner}
          onClose={closePreview}
          onDenied={onDenied}
          onPublish={(version) => {
            setReviewedVersion(version);
            setPreview(false);
            setConfirmation('publish');
          }}
        />
      )}
      {confirmation && (
        <Modal
          tone="light"
          title={
            confirmation === 'publish'
              ? 'Publicar cambios'
              : confirmation === 'unpublish'
                ? 'Retirar página pública'
                : confirmation === 'rebase'
                  ? 'Conservar tu texto'
                  : 'Descartar cambios locales'
          }
          onClose={closeConfirmation}
        >
          <p className="text-sm">
            {confirmation === 'publish'
              ? 'La revisión que acabas de revisar reemplazará la publicación vigente y habilitará nuevas reservas públicas. Confirma que el contacto está destinado al público.'
              : confirmation === 'unpublish'
                ? 'El contenido y las nuevas reservas públicas dejarán de estar disponibles. Se conservarán la operación interna y todas las reservas existentes.'
                : confirmation === 'rebase'
                  ? 'Tu texto se preparará sobre la versión guardada que comparaste. Todavía tendrás que guardarlo; al hacerlo reemplazará esos campos del borrador.'
                  : 'Se perderán los cambios de este formulario y se cargará el borrador guardado.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button
              tone="light"
              variant="secondary"
              className={focusClass}
              onClick={closeConfirmation}
            >
              Cancelar
            </Button>
            <Button
              tone="light"
              variant={
                confirmation === 'unpublish' || confirmation === 'discard' ? 'danger' : 'primary'
              }
              className={focusClass}
              disabled={
                busy ||
                query.isFetching ||
                !!query.error ||
                !!uncertain ||
                ((confirmation === 'publish' || confirmation === 'unpublish') && hasConflict)
              }
              onClick={confirm}
            >
              {confirmation === 'publish'
                ? 'Confirmar publicación'
                : confirmation === 'unpublish'
                  ? 'Confirmar retiro'
                  : confirmation === 'rebase'
                    ? 'Conservar mi texto'
                    : 'Descartar y cargar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Preview({
  scope,
  visit,
  version,
  owner,
  onClose,
  onPublish,
  onDenied,
}: {
  scope: string;
  visit: string;
  version: number;
  owner: boolean;
  onClose: () => void;
  onPublish: (version: number) => void;
  onDenied: (error: unknown) => void;
}) {
  const query = useCmsPreview(scope, visit);
  useLayoutEffect(() => {
    if (denied(query.error)) onDenied(query.error);
  }, [query.error, onDenied]);
  return (
    <Modal
      tone="light"
      size="lg"
      title="Vista previa — no visible para tus clientes"
      onClose={onClose}
    >
      {query.isFetching ? (
        <p role="status">Cargando vista previa…</p>
      ) : query.error ? (
        <div className="space-y-4">
          <p role="alert">{friendlyError(query.error)}</p>
          <Button tone="light" className={focusClass} onClick={() => void query.refetch()}>
            Reintentar vista previa
          </Button>
        </div>
      ) : query.data && query.data.version !== version ? (
        <p role="alert">
          El borrador cambió. Cierra esta vista y recarga la configuración para revisarlo.
        </p>
      ) : query.data ? (
        <div className="space-y-5">
          <p className="text-sm text-[var(--dash-text-muted)]">
            Revisión guardada {query.data.draftRevision}. Esta vista es privada y no se puede
            compartir.
          </p>
          <Content content={query.data.content} />
          {owner && (
            <Button
              tone="light"
              className={focusClass}
              onClick={() => onPublish(query.data.version)}
            >
              Publicar esta revisión
            </Button>
          )}
        </div>
      ) : (
        <p role="alert">La vista previa no está disponible.</p>
      )}
    </Modal>
  );
}
