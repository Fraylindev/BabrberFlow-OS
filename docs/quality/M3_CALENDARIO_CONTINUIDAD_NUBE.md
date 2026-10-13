# M3 — correctivo UI y continuidad en la nube, 2026-10-13

**IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN DEL PROPIETARIO.** Base: `56e2e1278c0dacd679accca4f1bd501e7cf9a1f9`. Rama de trabajo autorizada: `codex/m3-calendario-cloud-20261013`; publicación exclusiva de esta rama nueva para relevo, sin despliegue. Los checkpoints anteriores no se reescriben.

## Producto y alcance autorizado

El operador necesita volver al período actual y escoger otra fecha cómodamente en móvil. Aceptación: Hoy es un botón visible, conserva vista y filtros, vuelve a la fecha del negocio y refresca desde la primera página cuando ya está en ese período. Reservas y Agenda usan el mismo selector mensual, con días y horas exclusivamente autorizados por C1; cambiar día o mes elimina la selección anterior. No se amplían roles: OWNER, ADMIN y RECEPTIONIST pueden reprogramar según el contrato; BARBER conserva su lectura propia. Se mantienen detalle mínimo, privacidad, aislamiento y errores útiles.

La imagen aportada inspira la cuadrícula mensual y el resumen compacto de reserva actual. No se adopta la hora libre del selector nativo: una hora arbitraria podría no corresponder a un slot disponible o a un instante único en la zona del negocio. Las horas siguen siendo botones obtenidos del API por fecha. Confirmar conserva `startTime`, `expectedUpdatedAt` y `expectedRevision` recibidos, sin derivar tokens.

## Implementación

- Hoy antes solo cambiaba el ancla. Al estar ya en el período actual, la caché sin caducidad evitaba una lectura nueva. Ahora cierra el detalle, limpia el aviso y reinicia la consulta exacta cuando corresponde; navegar desde otro período consulta solo el período destino. Usa la zona del negocio, no la del dispositivo.
- `CalendarDetail` sigue compartido por Reservas y Agenda. `CalendarMonth` añade cuadrícula de siete columnas, navegación y elección de mes/año. Días pasados o no disponibles quedan deshabilitados; objetivos de al menos 44 px de alto y estados de foco/selección accesibles.
- Disponibilidad por mes: mes actual desde hoy hasta su final; otros meses desde el primer día hasta su final, como máximo 31 días inclusivos. Slots se consultan por fecha y se reutilizan en la caché aislada de la visita para respetar 30/min. Fallback 60 s de 429 preservado.
- Errores 400/401/403/404/409/429/503, respuestas tardías y A→B→A mantienen el comportamiento C2. No hay cambios de API, migraciones, dependencias, público, correo ni payloads.
- Los scripts de navegador conservan las aserciones y actualizan el texto a Reprogramar. El script C2 admite salida externa para no sobrescribir evidencia aprobada. El arnés de gate1 actualizado no se ejecutó otra vez: su evidencia histórica permanece intacta.

## Validación observada

Todos los comandos usan las dependencias existentes, sin instalación: `pnpm --config.verify-deps-before-run=false --filter web ...`.

| Comprobación | Resultado |
| --- | --- |
| `type-check:clean` | exit 0 |
| `lint` | exit 0 |
| `test` | exit 0: 168 unitarias y 138 componentes; incluye 8 casos Calendar |
| `build --webpack` | exit 0 |
| `node apps/web/scripts/m3-c2-browser.mjs` con `M3_BROWSER_OUTPUT` externo | exit 0: 19 escenarios, 0 fallos |

Chrome real headless: 320, 375, 768 y 1440 px; Hoy, selector, roles, errores, caché, aislamiento y respuestas tardías. El transporte de estos escenarios es controlado con el contrato C1; **no prueba el API real ni una sesión QA**. La integración real local de C1/C2 sigue documentada históricamente en gate1, anterior a este correctivo. El modal permite desplazamiento vertical en móvil; las comprobaciones no detectan desbordamiento horizontal.

Evidencia de esta ejecución fuera del repositorio: carpeta `m3-cloud-ui` en las visualizaciones de esta conversación; `checks.json`, logs de los cuatro comandos, `browser/results.json` y capturas `selector-{320,375,768,1440}.png`. No se versiona la imagen privada aportada ni nuevas capturas. El gate OCR exige cero coincidencias contra las 15 imágenes excluidas antes de publicar el árbol.

## Rama para la nube y despliegue

Se sincroniza el trabajo versionado del worktree M3, no archivos ignorados, `.env`, credenciales ni trabajo ajeno del checkout principal. `ai/reserva-invitado-ci` conserva `ops/oci-api/production/` y su archivo no relacionado. No se mezcla producción en esta rama. QA permanece en 56e2e12.

`apps/web/vercel.json` deshabilita despliegues automáticos **solo** de `codex/m3-calendario-cloud-20261013`. Las demás ramas mantienen el comportamiento previo. Ubicación acorde con Root Directory `apps/web`. [Regla oficial de Vercel](https://vercel.com/docs/project-configuration/git-configuration). Quality solo escucha push a `ai/antigravity-qa`; no se modifica workflow ni se abre PR. La rama es para código y revisión, no para promoción. Cualquier rama futura con otro nombre necesita su propia exclusión antes de publicarla.

El SHA final se entrega en el mensaje de checkpoint y se obtiene con `git rev-parse HEAD`. Para comprobar sincronización: comparar con `git ls-remote origin refs/heads/codex/m3-calendario-cloud-20261013`; no usar force. Antes de cualquier promoción, requiere autorización nueva, QA aplicable y conservar API/web compatibles.

## Relevo para mañana

En **Codex Cloud**, seleccionar el repositorio `Fraylindev/BabrberFlow-OS` y esta rama como base de una tarea en un entorno preparado. [Codex Cloud oficial](https://help.openai.com/en/articles/20001545-using-codex-cloud): las tareas se ejecutan en equipos gestionados por OpenAI y pueden continuar con la laptop apagada; acceso remoto al chat local es un flujo distinto. Publicar la rama no convierte automáticamente este chat local en una tarea cloud ni demuestra que la conexión personal o el entorno cloud estén configurados.

Instrucción de relevo sugerida:

> Continúa desde codex/m3-calendario-cloud-20261013. Lee AGENTS.md, docs/README.md, PROJECT_MASTER.md y docs/quality/M3_CALENDARIO_CONTINUIDAD_NUBE.md. Esta rama nueva está autorizada para trabajo y relevo, sustituyendo solo la restricción histórica de trabajar en ai/antigravity-qa. No publiques a QA/main, no despliegues y no accedas a bases reales, worker ni proveedores. Mantén el backend aprobado. Gate4 no está abierto. Revisa el correctivo de Hoy y el selector mensual antes de proponer otro cambio.

No cargar secretos de QA/producción en el entorno cloud. Las comprobaciones locales de UI usan transporte controlado; una futura integración usa PostgreSQL desechable y necesita las dependencias del entorno disponibles. No se ha ejecutado ni probado esta rama dentro de Codex Cloud.

## Estado de C3 y límites

El propietario aceptó gates3a/3b y autorizó/completó gate3c sobre 56e2e12; posteriormente declaró pruebas manuales de reagendado satisfactorias. Esa declaración no verifica consumo del worker, outbox o entrega del proveedor. **Gate4 no iniciado: esperar aviso y autorización del propietario.** El nuevo selector y Hoy están probados localmente, todavía no desplegados ni aprobados en QA. La corrección de CORS para Retry-After permanece separada del backend aprobado.
