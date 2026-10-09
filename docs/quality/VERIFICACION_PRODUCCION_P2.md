# Verificación P2 tras el merge del propietario — 2026-10-09

**VERIFICACIÓN COMPLETADA / EN REVISIÓN, CON DISCREPANCIA DE ALIASES. NO-GO PARA PROMOCIÓN O CONTINUIDAD AUTOMÁTICA.** Las lecturas confirman el merge normal, árbol y CI esperados; los dominios público y QA conservan sus deployments y ambas APIs siguen intactas frente a P1c. El deployment nuevo **sí tiene dos aliases generados de Vercel**: no se cumple literalmente «no asignado a ningún dominio». La autoasignación de dominios personalizados sigue desactivada. No se corrige ninguna asignación ni se pulsa Promote.

## Alcance y fuentes

Lecturas realizadas el 9 de octubre de 2026, aproximadamente 00:30–00:40, America/Santo_Domingo (UTC−04:00), sobre base `ai/reserva-invitado-ci` / `e3b0b17aaf2e82654bb585872ac3ec0562f45629`. Autorización específica: fetch, CI del PR, Vercel y preflight SSH sanitizado; única entrega escrita: este informe, un commit y push sin force a la misma rama. Esta autorización sustituye la rama general indicada en AGENTS.md solo para esta tarea.

Se consultaron [entrada documental](../README.md), [estado vigente](../../PROJECT_MASTER.md), [gates](DELIVERY_GATES.md), [Definition of Done](DEFINITION_OF_DONE.md), historiales y [plan productivo](PLAN_PRODUCCION_RESERVA_INVITADA.md). El [preflight P0/P1/P1c](PREFLIGHT_PRODUCCION_P0_P1.md) conserva sus límites y NO-GO global: este informe no aprueba P1c ni gates posteriores. Se inspeccionó el workflow real `.github/workflows/quality.yml`; no se modificó código, contrato, SQL ni documentación histórica. El nuevo registro está limitado a docs/quality por la autorización de entrega.

## 1. Merge y árboles

`git fetch origin` terminó con exit 0 tras un primer intento rechazado por permisos sobre `.git/FETCH_HEAD`. Se conservó la advertencia local «unable to find all commit-graph files», sin reparar metadata. La actualización obtenida fue exclusivamente `origin/main`: fe4b117 → 8e1501e.

| Lectura | Resultado |
| --- | --- |
| `origin/main` | `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` |
| Primer padre | `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` |
| Segundo padre | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` |
| Árbol de 8e1501e | `8f8f73b6eb677848de7d62680a49976bdc8ee7cd` |
| Árbol de 523d993 | `8f8f73b6eb677848de7d62680a49976bdc8ee7cd` |
| `git diff --name-status 8e1501e 523d993` | Vacío, exit 0 |

`git show -s --format='%H%n%P%n%T%n%s%n%an%n%cn' origin/main` confirmó exactamente dos padres, autor Fraylindev y committer GitHub. [PR #5](https://github.com/Fraylindev/BabrberFlow-OS/pull/5): merged=true, merged_by=Fraylindev, merged_at=`2026-10-09T04:07:47Z` (00:07:47 local), merge_commit_sha=8e1501e completo. Head/base del PR corresponden a los dos padres anteriores. `git log --first-parent fe4b117..origin/main` devuelve únicamente ese merge. **Main remoto solo cambió por el merge del propietario; el agente no ejecutó merge ni push a main.**

## 2. CI del PR y SHA realmente evaluado

[Quality gates #60, run 37881874087](https://github.com/Fraylindev/BabrberFlow-OS/actions/runs/37881874087), intento 1, evento pull_request: completed/success. Inicio `2026-10-09T04:00:36Z`, actualización final `04:05:02Z`. La API del run identifica head_sha=`523d993cfa0c797f356c224d5cc026d6c9ad4c7b`; **ese dato no es el checkout evaluado**.

Los logs del [único job verify, 113663144250](https://github.com/Fraylindev/BabrberFlow-OS/actions/runs/37881874087/job/113663144250) acreditan:

```text
fetch ... +e98d3d0c4bf7c86ffeefe68c3b2a5ace461d391c:refs/remotes/pull/5/merge
HEAD is now at e98d3d0 Merge 523d993cfa0c797f356c224d5cc026d6c9ad4c7b into fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6
git log -1 --format=%H
e98d3d0c4bf7c86ffeefe68c3b2a5ace461d391c
```

El SHA evaluado es el merge sintético `e98d3d0c4bf7c86ffeefe68c3b2a5ace461d391c` de `refs/pull/5/merge`, distinto del merge final 8e1501e. La lectura GET de GitHub del commit sintético confirma sus mismos padres fe4b117/523d993 y árbol `8f8f73b6eb677848de7d62680a49976bdc8ee7cd`, idéntico al merge final. No se afirma un run nuevo ejecutado sobre 8e1501e.

Job verify: completed/success. Todos los pasos devueltos por GitHub concluyen success: preparación y contenedores; checkout; pnpm/Node; instalación; PostgreSQL aislado; audit de dependencias/peers; contrato Prisma/client; runtime privilege matrix; tipos/lint; unitarias/componentes; builds; integridad/E2E PostgreSQL; browser smoke; postacciones, cierre de contenedores y fin del job. El workflow usa PostgreSQL 16. Se leyó CI existente; no se lanzó ni repitió ningún job/build/test. Quality #58 es el antecedente de S, no el run del PR #5.

## 3. Vercel: deployment, aliases actuales y autoasignación

Proyecto `prj_Bb980XG9fFTCSeP5MHOL5eTK9F1p`, equipo `team_BBm9XjRsZkjh2iZdqZ0909Q8`. Lecturas del conector: get_project, get_deployment, list_aliases (sin siguiente página) y list_deployment_aliases. Chrome corroboró el deployment y Settings → Environments → Production.

El identificador abreviado visible **A5G1gZA8q** corresponde a **`dpl_A5G1gZA8q2KFrDLg6UFsceL3mmQu`**; la abreviatura aportada no es el sufijo literal del ID completo. Metadata: branch main, SHA `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, source git, estado/readyState **READY**, target **production**. URL propia `kortek-booking-j9iaoob82-fraylindev.vercel.app`. [Deployment observado](https://vercel.com/fraylindev/kortek-booking/A5G1gZA8q2KFrDLg6UFsceL3mmQu).

| Alias actual | Deployment | SHA | Evaluación |
| --- | --- | --- | --- |
| booking.kortek.cloud | `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm` | fe4b117 completo, sección 1 | Conservado |
| kortek-booking.vercel.app | `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm` | fe4b117 | Conservado, no se movió |
| qa.booking.kortek.cloud | `dpl_3WyqcfwaKgpsnQzLaMmgifuB3mHg` | 523d993 completo, sección 1 | Conservado |
| kortek-booking-fraylindev.vercel.app | `dpl_A5G1gZA8q2KFrDLg6UFsceL3mmQu` | 8e1501e | Asignado al merge nuevo |
| kortek-booking-git-main-fraylindev.vercel.app | `dpl_A5G1gZA8q2KFrDLg6UFsceL3mmQu` | 8e1501e | Asignado al merge nuevo |

Los deployments público anterior y QA también están READY. La lista actual por proyecto y la lista de aliases del nuevo deployment coinciden en las asignaciones. El campo `alias` del detalle del deployment antiguo todavía incluye los dos aliases generados: se registra esa divergencia del proveedor y se usa la relación vigente `deploymentId` de list_aliases, corroborada por list_deployment_aliases del nuevo y Chrome. No se interpreta el campo antiguo como evidencia de que esos aliases no se movieron.

Chrome muestra **Staged Domains** con los dos aliases generados y la URL propia, y **Assigning Custom Domains Skipped**. Por tanto, **sí está asignado a dominios/aliases generados**; no está asignado a booking.kortek.cloud ni kortek-booking.vercel.app. La condición literal «ningún dominio» no está satisfecha y requiere resolución del propietario antes de dar P2 por aprobado; no implica mover o retirar aliases aquí.

En [Settings → Environments → Production](https://vercel.com/fraylindev/kortek-booking/settings/environments/production), control **Auto-Assign Custom Production Domains**, checkbox **Value: 0** (desmarcado), Save disabled. Branch Tracking sigue main; el texto indica que los deployments necesitan promoción manual. Solo lectura: no se tocó checkbox, Save, Add Domain ni Promote. La opción gobierna dominios personalizados y no demuestra ausencia de aliases generados.

## 4. Preflight SSH sanitizado

Única lectura SSH con identidad ya existente, BatchMode, ConnectTimeout=15, StrictHostKeyChecking=yes y known-hosts existentes. Python por stdin ejecutó solo `podman inspect` de ambas APIs, `systemctl show` y hashes/stat de sus archivos runtime-env. Salida limitada a identidad, imagen, PID, release, entorno, hashes y los dos flags solicitados; sin valores secretos, PII ni dump de entorno. SSH y cotejo local terminaron **exit 0**.

| Dato | Producción | QA |
| --- | --- | --- |
| Unidad/contenedor | kortek-api | kortek-api-staging |
| Servicio | active/running, NRestarts=0 | active/running, NRestarts=0 |
| PID unidad / contenedor | 151141 / 151158 | 1523015 / 1523029 |
| ID contenedor | `a7ce113fa2eb8c29860c3c219aa26184ab90b8e1ac1611018b60aa3dc0bb5feb` | `a2be446dc69535e611873dbab0235d25aa8c81c1812e8d10a198e963e6bb8c02` |
| Imagen SHA-256 | `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2` | `8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec` |
| APP_RELEASE | `b5615869dcbec4bd174608f2373e73ff618fae26` | `b318ca591d1ca6681269a6d25e29ca106d824df9` |
| DEPLOY_ENV | production | staging |
| PUBLIC_BOOKING_CLOSED | true | false |
| NOTIFICATIONS_EMAIL_ENABLED | false | true |
| Hash entorno contenedor | `21829184485a0d5f0db287f719a4e981ebad05aa6b305cf894436df514bbc752` | `72872e930ac2c584b1fcf6e81f6674067bb345cdd6159613beeab0a2c8f6b64c` |
| Hash runtime-env | `42ce91a14849c9746109e2864c4500976bb98d2d2e1a3e7713f4485a3aaff23a` | `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6` |
| Propietario/modo archivo | root:root / 0600 | root:root / 0600 |

Identidad/imagen/PID/running/release/entorno/hash/flags y archivos protegidos coinciden exactamente con la referencia local previa `.tmp/prod-p1c/oci-after.json`, descrita en el informe P1c. **API productiva anterior, cerrada y correo desactivado; API QA sin cambios observados en estos selectores.** No se revalidaron DB/ledger, workers, métricas ni funcionalidad: no estaban autorizados en P2. Ningún reinicio, escritura remota o cambio de flags.

## 5. Ramas, preservación y entrega

Antes de editar, fetch y `git ls-remote origin refs/heads/main refs/heads/ai/antigravity-qa refs/heads/ai/reserva-invitado-ci` confirmaron:

| Referencia | SHA observado |
| --- | --- |
| ai/reserva-invitado-ci local y remoto | `e3b0b17aaf2e82654bb585872ac3ec0562f45629`, sin movimiento previo |
| ai/antigravity-qa remoto | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`, sin movimiento |
| ai/antigravity-qa local | `36061fc3c978758642b5a79ed6cb0e5ff25c003f`, preservada sin actualizar |
| main local | `01113ef0be7d8abcd74e3e7297f7989b359c76c0`, preservada |
| main remoto | `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, merge del propietario |

El único movimiento previsto de ai/reserva-invitado-ci es el commit documental expresamente autorizado de este informe sobre e3b0b17; su SHA y cotejo local=remoto se reportan al entregar para evitar un hash autorreferencial. Staging por esta ruta exacta, inspección completa del diff/staged y `git diff --check`/`git diff --cached --check`; push solo `HEAD:refs/heads/ai/reserva-invitado-ci`, sin force. No corresponde ejecutar builds/tests para este cambio exclusivamente documental.

Archivo ajeno preservado y excluido: `docs/Playbook Kortek Booking_ del 29 de septiembre al MVP.md`, sin versionar, SHA-256 `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`. El estado final debe conservar únicamente ese untracked. No se reparó el commit-graph ni se descartó trabajo ajeno.

## 6. Decisión pendiente y límites

Lecturas P2 completadas; **no aprobado por el propietario**. Confirmar si el criterio exigía ausencia de todo alias, o únicamente ausencia de asignación de los dominios productivos preservados: la diferencia observada está documentada y no se resuelve por inferencia. Hasta esa resolución, **NO-GO para promoción/etapa siguiente**. P1c mantiene sus pendientes independientes. No hubo cambios de proveedor, despliegues, builds, flags, promociones, bases ni código por el agente; el build automático asociado al merge ya existía y se leyó. Commit/push documental no autoriza P3 ni apertura pública/correo.
