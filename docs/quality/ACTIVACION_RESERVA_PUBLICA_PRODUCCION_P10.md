# P10 — Paridad con QA: activación no aplicada

Fecha: 2026-10-09. **NO-GO / PAUSADO / INCOMPLETO.** Base local comprobada: ai/reserva-invitado-ci en `5f72b3c14af7cc9ae8be7ecee286216ef8945be4`.

La orden P10 sustituye a la Orden B anterior. El propietario resolvió el marcador inicial de 0(a) confirmando «SÍ, Clerk producción tiene el registro restringido»; declaración sin lectura independiente de Clerk. Autorizó exclusivamente las escrituras técnicas del limitador inherentes a los tres GET P10, incluida limpieza de vencidos, sin escrituras de negocio. Inició sesión OCI para la lectura de alarmas.

Tras esa confirmación se ejecutaron prechecks READ ONLY por SSH, migrador, Vercel y Chrome OCI. El editor falló antes de crear la copia P10 o cambiar producción. Una verificación lanzada por error después del fallo confirmó el cierre. El [cierre P9](VERIFICACION_PAREJA_PRODUCCION_P9.md) conserva la atribución de los datos de prueba por declaración del propietario.

## Diff QA frente a producción y cambios

| Punto | Resultado de esta ejecución |
| --- | --- |
| 0(a), declaración Clerk | SÍ explícito del propietario |
| 0(b), elegible | Exactamente 1: slug jhonatan, CONFIRMED/zoneConfirmed, CMS publicado/snapshot, 1 servicio activo y 1 profesional ACTIVE/isPublic; condición de prueba declarada en P9 |
| 0(c), diff runtime-env | Comparación en memoria; clasificación abajo, sin valores secretos |
| 0(d), correo | Faltan FROM, REPLY_TO, RESEND_API_KEY, RESEND_WEBHOOK_SECRET y NOTIFICATIONS_ABUSE_SECRET; DOMAIN_VERIFIED=false. Sin remitente que acreditar como productivo; 2(c) excluido |
| 0(e), sondas y alarmas | Flag ausente en ambos runtime-env API; /etc/kortek-monitor/public-http-monitor.conf=false. No hallada configuración QA equivalente ni demostrado QA=true. OCI: ocho definiciones activas, ninguna pública HTTP; 2(b) excluido |
| 0(f), NEXT_PUBLIC_* | QA preview: API_URL=https://api.staging.booking.kortek.cloud, Clerk pk_test. Production: API_URL=https://api.booking.kortek.cloud, Clerk pk_live; diferencias legítimas, sin cambios |
| 0(g), estado | active/running, NRestarts=0, imagen P5, hash 42ce91a1… intacto; ledger32/28/4/0,37 tablas; copias P7/P1 presentes y hashes iguales |
| Paso 1, copia P10 | No creada: aserción anterior falló |
| Paso 2, edición/reinicio | Cero líneas cambiadas y cero reinicios |
| Paso 3, verificación | Prematura: 1 GET API 404 y 1 GET web 200; sin apertura ni observación válida de 15 minutos |
| Paso 4, rollback | No aplicable: sin activación ni copia P10; archivo original intacto |

### Clasificación completa del diff 0(c)

| Clase | Nombres distintos / booleanos permitidos | Aplicación |
| --- | --- | --- |
| (i), entorno | API_PUBLIC_ORIGIN, WEB_PUBLIC_ORIGIN, CORS_ALLOWED_ORIGINS, CLERK_AUTHORIZED_PARTIES, CLERK_INVITATION_REDIRECT_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, DATABASE_URL, DEPLOY_ENV, JWT_SECRET, RATE_LIMIT_SECRET, APP_RELEASE, KORTEK_API_IMAGE, PORT | Valores omitidos; no alinear identidades, secretos, URLs, puertos ni releases |
| (ii), comportamiento | PUBLIC_BOOKING_CLOSED: QA false / producción true | Única línea propuesta, no aplicada |
| (ii), condicionado | NOTIFICATIONS_EMAIL_ENABLED: QA true / producción false | No aplicar: 0(d) incompleto |
| Verificación de proveedor | NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED: QA true / producción false | No cambiar: no es flag libre ni prueba de dominio verificado |
| (iii), ausentes en producción | NOTIFICATIONS_EMAIL_FROM, NOTIFICATIONS_EMAIL_REPLY_TO, RESEND_API_KEY, RESEND_WEBHOOK_SECRET, NOTIFICATIONS_ABUSE_SECRET | No añadir ni copiar QA |

El código de 8e1501e en apps/api/src/notifications/resend.adapter.ts exige esas cinco variables y dominio verificado para habilitar correo. QA web: dpl_3WyqcfwaKgpsnQzLaMmgifuB3mHg, rama ai/antigravity-qa/SHA523d993, target null (preview). NEXT_PUBLIC_* comparados desde configuración actual del proyecto sin overrides de rama en la lista; no se reconstruyen builds históricos. Claves públicas completas omitidas.

OCI Alarm Definitions, compartimento raíz: kortek-prod-backup-capacity, backup-stale, database-capacity, database-down, monitor-silent, operational-errors, restore-stale y worker-down (todos con prefijo kortek-prod-), Active/no suprimidas. Sin public-web/public-api; no se afirma FIRING/OK a partir de definiciones. El conector falló al construir signer y Chrome autenticado permitió leer la lista. Sin cambios OCI ni del monitor.

0(g): imagen `1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775`, runtime-env SHA256 `42ce91a14849c9746109e2864c4500976bb98d2d2e1a3e7713f4485a3aaff23a`. Migrador current_user=session_user=kortek_migrator, transaction_read_only=on, exit0. Copia P7 /var/backups/kortek-api/p7-20261009T171143Z con runtime-env/unidad/wrapper presentes y hashes exactos. Respaldo P1 local cifrado presente,280667 bytes, SHA256 `a72353911e5c47c6db8ab2a529c686de538dce48b7d7081b26c2a5121fefc297`; sin descifrar ni restaurar.

### Fallo del arnés, sin activación

El editor terminó exit1 en la aserción que exige una línea literal PUBLIC_BOOKING_CLOSED=true. El parser obtiene true, pero su representación en el archivo no satisface esa comparación literal. Ocurrió antes de crear copia P10, editar archivo o ejecutar restart: cero ediciones y cero reinicios. No se reintentó ni se relajó el control.

El agente lanzó por error la verificación dependiente pese al fallo del editor. Un GET /public/jhonatan/booking-data devolvió 404 porque PUBLIC_BOOKING_CLOSED seguía true; no demuestra un defecto del negocio ni una apertura fallida tras un cambio. Se detuvo el lote antes de los otros dos slugs. GET raíz web200: HSTS max-age=63072000, CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy ausentes. Dos peticiones, sin retries HTTP, reservas ni correos. La respuesta404 se examinó en memoria: sin campos privados seleccionados ni patrones secretos; no se conserva cuerpo crudo. Única escritura DB: efecto técnico del limitador autorizado.

Relectura SSH final23:53:52UTC: hash original intacto, active/running/NRestarts=0 e imagen P5. No hay cambio que revertir ni copia P10 que restaurar: sin rollback/reinicio adicional. Observación15min abierta y GET200/404/404 no completados; no se inventan logs limpios de ese intervalo. PUBLIC_BOOKING_CLOSED=true y correo=false. Secretos, MFA, límites, URLs, DEPLOY_ENV, proveedores y negocio sin cambios; QA sin modificaciones. Sin builds ni despliegues.

Evidencias: [SSH](evidence/prod-p10/ssh-read.json), [elegibilidad](evidence/prod-p10/eligibility.json), [ledger](evidence/prod-p10/ledger.json), [verificación prematura](evidence/prod-p10/verify.json).

## Relevo y entrega

Clerk SÍ ya declarado. La continuación requiere un editor que respete la sintaxis efectiva sin tocar otras líneas, prechecks actualizados y verificación condicionada a activación exitosa. No se ejecuta automáticamente otra activación tras esta parada. La apertura permanente y la paridad de notificaciones siguen pendientes.

Entrega exclusivamente documental: este informe y referencias en docs/README.md y PROJECT_MASTER.md, un único commit y push sin force a ai/reserva-invitado-ci. Validación: enlaces locales, diff completo y git diff --check; sin builds por el gate documental. SHA final, local=remoto y status se reportan tras publicar. El Playbook ajeno sin seguimiento se preserva fuera del commit; main y QA no se modifican.
