# M3 — clasificación del escaneo y archivos para revisión

Fecha de lectura: 2026-10-11, America/Santo_Domingo. **SIN PUSH.** Commits intactos da77c88a0234b640be8cab0ab11c0afd204f59e4 y baba8b56b524e4b64bcf8342d9008c4c796402bc.

## 1. Los 26 hashes distintos

17 ya publicados, nueve sintéticos reservados. La categoría de publicación tiene prioridad cuando una coincidencia también es un fixture. No equivale a ausencia de riesgo. Ningún hash coincide con los valores interpretados de los 16 .env/.env.* locales inspeccionados (56 variables). Se comparó el valor completo y, donde corresponde, el literal sin prefijo Bearer/asignación. No se muestran valores.

| SHA-256 | Categoría del escáner | Clasificación | Prueba |
|---|---|---|---|
| d88372f49a6e690d224d2c289e86b6e3ed65362e759efd878bf42014d159943b | credential_assignment | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 30f884ac7562 / BACKEND_CHANGES.md; origin/main: 30f884ac7562 / BACKEND_CHANGES.md |
| ef787d96ea63d89bda257e506a5850039be9e116c82316c162e55dc9a01dfe36 | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 986f2ed082fe / CHANGELOG.md; origin/main: f419a87e79a8 / CHANGELOG.md |
| fc8ba1ce6652e1052417345d3d94c309ecb4355f7e3099333c629cd78a50f4a1 | email | sintético reservado | apps/api/src/bookings/calendar-collision.integration.spec.ts:15; Dominio reservado de documentación/pruebas |
| 7e001d04946a68d4c9cf0c18961fa656b7437c3c309ba36c8134fcdb7ec5d45b | email | sintético reservado | apps/api/src/bookings/calendar-compatibility.integration.spec.ts:147; Dominio reservado de documentación/pruebas |
| db8801ef75177e6aec29803637e25e4b0a9f5cd4adc1470a959b9e9a12e158ef | email | sintético reservado | apps/api/src/bookings/calendar.service.spec.ts:104; Dominio reservado de documentación/pruebas |
| 3376be1096079dcf8ae80fe35814f3e951b013fd8fac5795c4aa37f3ca1d82cb | connection_url | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 62d54aeedadc / apps/api/test/guest-postgres-run.cjs; origin/main: 62d54aeedadc / apps/api/test/guest-postgres-run.cjs |
| 643b79e8deafb3a3df792b3109d1ca8a499c89f97f4c867ec9153fd874729ec4 | connection_url | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 62d54aeedadc / apps/api/test/guest-postgres-run.cjs; origin/main: 62d54aeedadc / apps/api/test/guest-postgres-run.cjs |
| b1857220f56983b4a1375ef92e992b4d55ce90b6d6b49cb3966cf7aae1302b45 | provider_token | sintético reservado | apps/api/test/m3-validation-run.cjs:36; Literal declarado sintético en runner; comparación con claves locales y goal separada |
| 7cf35c23c24ef1564cc7b823872da2df20922b68469e6800ccf3841b86e1184c | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 62baec51ee47 / apps/api/src/cms/cms.dto.spec.ts; origin/main: 62baec51ee47 / apps/api/src/cms/cms.dto.spec.ts |
| 08168cd80dfd534ab0f10af10f1303fe00af2d43ab5c1432360d137f8197e17a | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 81728290f466 / apps/api/src/auth/team.service.spec.ts; origin/main: 81728290f466 / apps/api/src/auth/team.service.spec.ts |
| e8f39b3e1382367d6d41ab34dc270d4e7533f978c9e9a775dfe2185b2f96b96c | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: e487c406666d / apps/api/src/notifications/notification-policy.spec.ts; origin/main: e487c406666d / apps/api/src/notifications/notification-policy.spec.ts |
| 5b71ed5f946240dc76f3b7c24bdcbbc3528284ec5f4519249fb702686f0df5b8 | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: e487c406666d / apps/api/src/notifications/notification-policy.spec.ts; origin/main: e487c406666d / apps/api/src/notifications/notification-policy.spec.ts |
| 6b5c8d618815b5e6ca68dd7a04b2b16552d50d2012c3e6d922ae38074127cc73 | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts; origin/main: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts |
| e2b5d7d1892280e686bb1830c52cb6c0b3a21ea4a3ed8b08c34ae7f29c23b5ba | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts; origin/main: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts |
| f7faa8d2b759b8e4a6f0577503650137cf17a7f2e8408fc7f7bdb3c556dfdcf0 | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts; origin/main: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts |
| f57fa2badbd77ae5ffca77f28c7cd1e0844fdafa9b4a45312dc979c4fe2e140c | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts; origin/main: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts |
| e67c8def62e708911573f2db1f98ecc083ef36f9dc1f2cbd3c17474f55c44ec7 | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts; origin/main: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts |
| d25354f658256d3988a0a1f07ae2dbfa64c0141b3eaa5650fd268b3fdd903b7d | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts; origin/main: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts |
| 1f6c1f35fba8e0f461ef40adaec3cbda883f6a5bcfa5fddef2df80af49fc0832 | email | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts; origin/main: 7b6c3587bc0d / apps/api/src/notifications/resend.adapter.spec.ts |
| 98da678a16ef95388f9921a9686cdf4cf655e6b5fac76c1ed81f55613d507228 | credential_url | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 4ddff046d36d / docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/full-api.json; origin/main: 4ddff046d36d / docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/full-api.json |
| 7aef13f8c0831da45285af94abd2517c5281886c0cb652ceb9117d9df9ef2ba7 | bearer_token | ya publicado en el historial de origin/ai/antigravity-qa o main | origin/ai/antigravity-qa: 7209cbcee22c / docs/quality/evidence/reserva-invitado-c1/consistencia-rutas.json; origin/main: 7209cbcee22c / docs/quality/evidence/reserva-invitado-c1/consistencia-rutas.json |
| 2a6f7621e7c56aa848fb1ebba290e9152a75db46b75da1a9850bc9748d96727b | connection_url | sintético reservado | docs/quality/evidence/m3-calendario-c1/postgres/affed573f267493ba5b7d61be56e33d3/full-api.json:1; Conexión local de ensayo, no una garantía de ausencia de credenciales; procedencia en fixture/runner |
| 139f8701da7acb3968ee3b95f414b200d72b67f2e917135865665c0a8264e949 | connection_url | sintético reservado | docs/quality/evidence/m3-calendario-c1/postgres/affed573f267493ba5b7d61be56e33d3/full-api.json:1; Conexión local de ensayo, no una garantía de ausencia de credenciales; procedencia en fixture/runner |
| f2ae4595d0f9562163c4d8c5a45c6cf196fcf709d34616b13f3b6b64b7e7af5b | connection_url | sintético reservado | docs/quality/evidence/m3-calendario-c1/postgres/affed573f267493ba5b7d61be56e33d3/full-api.json:1; Conexión local de ensayo, no una garantía de ausencia de credenciales; procedencia en fixture/runner |
| 9baf9b6450483fbd7eab71b21100afc559d38578506a5308342b6f94dc10143b | connection_url | sintético reservado | docs/quality/evidence/m3-calendario-c1/postgres/affed573f267493ba5b7d61be56e33d3/full-api.json:1; Conexión local de ensayo, no una garantía de ausencia de credenciales; procedencia en fixture/runner |
| 664788a382fb021173a3cfdc60b4dcb2808476fdebe645d241225c714ac899b5 | credential_assignment | sintético reservado | apps/web/scripts/m3-c2-browser.mjs:50; Literal sintético del harness de navegador |

Referencias remotas actualizadas con fetch de lectura: origin/ai/antigravity-qa = 202f90199fc21a12e058059ad8fc95dfcf33b4ed; origin/main = 8e1501e89a132e1b01d3633b1b3f896a8cbe5800. Se recorrieron todos los blobs alcanzables por cada historial, incluidos archivos retirados: 2.902 y 2.898 respectivamente. Cada hash marcado publicado tiene coincidencia exacta del texto detectado, no solo del literal canónico.

### Clerk y cadena del goal

El sk_test sintético detectado (b1857220f56983b4a1375ef92e992b4d55ce90b6d6b49cb3966cf7aae1302b45) no coincide con CLERK_SECRET_KEY local, cuya huella es 44f741aa3eea29d9a2339bdb0cd7df0081fdef8828cd081b6c2c5367a78973c7. Esta última coincide con la rotación QA documentada el 2026-10-08. El Bearer detectado tampoco coincide con esa clave; es una frase de un título de prueba, no un token extraído de un header de ejecución.

Se intentó GET https://api.clerk.com/v1/instance con la clave local de desarrollo, en memoria, sin argv/log de secretos: HTTP403. No se validó vigencia actual ante Clerk ni se consultó el runtime QA. Se distingue la clave local declarada vigente de una verificación viva aceptada. Referencia del endpoint de lectura: https://clerk.com/docs/reference/backend/instance/get .

La comparación contra la cadena que Fray pegó en un goal sigue pendiente de identificación de ese goal (título/fecha o SHA-256). Se inspeccionaron 149 archivos de sesiones y 404 mensajes humanos directos; 1.351 transcripciones de auto-review se excluyeron para evitar atribuir material citado a un usuario. También se leyeron los nueve goals de la base local goals_1.sqlite en modo ro/query_only y los 15 adjuntos goal-objective.md, además de cuatro chats titulados Read Codex goal objective/Lee el objetivo del goal. No se identificó la cadena específica; las cadenas candidatas de esos objetivos no coinciden con los 26 hashes canónicos ni con la clave local de desarrollo. No se declara una comparación completada con una cadena desconocida.

## 2. Qué produce las cadenas de full-api.json

El sanitizador de apps/api/test/m3-postgres-run.cjs:69–81 reemplaza solo los secretos aleatorios del arnés, JWT de tres segmentos y URLs con esquema postgres/postgresql. results():82–85 lo aplica al texto JSON y vuelve a escribirlo. No elimina correos, URLs HTTPS con userinfo ni frases Bearer.

La URL HTTPS con usuario/contraseña procede de apps/api/src/cms/cms.dto.spec.ts: una prueba parametrizada it.each imprime %j en el título al probar rechazo de googleMapsUrl con userinfo. Jest guarda ese título en assertionResults, no es una conexión ejecutada.

El Bearer procede del nombre de una prueba en apps/api/src/public-booking/guest-retirement.spec.ts sobre reserva invitada independientemente del Bearer. El candidato regex es texto español del nombre de la prueba, no una credencial de sesión. Jest también lo conserva en el título. Ambas cadenas ya constan literalmente en el historial publicado de main y QA.

El cierre C1 §10 afirma que el arnés sanitiza los JSON: sí ejecuta una función de sanitización, pero su cobertura es limitada. Esa afirmación no acredita una redacción universal. La evidencia contradice cualquier lectura de “JSON sin URLs con credenciales ni Bearer”. Es un defecto del filtro/documentación, distinto de demostrar una fuga de clave real. No se corrigió el commit por inferencia ni se ocultó este límite.

Las cuatro URLs PostgreSQL del intento previo affed573 tampoco desaparecieron de ese archivo conservado. La versión final del arnés no sanea retroactivamente todos los archivos de ejecuciones previas; el cierre no prueba que se retirara todo ese contenido histórico.

## 3. BACKEND_CHANGES.md, líneas solicitadas

Son ejemplos de forma del contrato, con marcadores de tipo, no passwords reales. El detector clasificó la asignación de password como candidata.

```json
892: { "email": "[REDACTADO; marcador de tipo]", "password": "[REDACTADO; marcador de tipo]", "organizationId": "[REDACTADO; marcador de tipo]" }
896: { "email": "[REDACTADO; marcador de tipo]", "password": "[REDACTADO; marcador de tipo]" }
```

## 4. Los 47 candidatos OCR

Los 47 aparecen en blobs de imágenes ya alcanzables por el historial remoto. Cinco correos usan dominios reservados; 27 son posibles fechas/números de interfaz; diez están en contexto de contacto y cinco carecen de contexto suficiente. Los 15 últimos quedan real/no determinado en interpretación, aunque su procedencia sea ya publicada. No se afirma que sean personas reales ni se publica ningún número.

| # | SHA-256 | Clasificación | Interpretación | Imagen |
|---|---|---|---|---|
| 1 | ef6652f98fed489e6f9d5a68e93a7afc20f24e76075ca0ba55b6ae45b5f054f4 | ya publicado en el historial de origin/ai/antigravity-qa o main | sintético reservado | docs/features/evidence/notifications-c2/internal-consent.png |
| 2 | 717a9e0c337c651e589fbb348ed54d2b302fde667a0e704a6a11d5d4f8c05e4a | ya publicado en el historial de origin/ai/antigravity-qa o main | sintético reservado | docs/features/evidence/notifications-c2/public-consent-mobile.png |
| 3 | 480dbae1609e58cb281170531fb2c160154bffc07b7478ab47fe2d195cd18cd3 | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/features/evidence/notifications-c2/public-consent-mobile.png |
| 4 | 98c7f8a4522fa00c7ad5c6f1e135371fee6cbb3747ff71462cef995e3df36f5c | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/features/evidence/whatsapp-c2/desktop-success-focus.png |
| 5 | 98c7f8a4522fa00c7ad5c6f1e135371fee6cbb3747ff71462cef995e3df36f5c | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/features/evidence/whatsapp-c2/mobile-success-focus.png |
| 6 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e-ajuste/revision-business-320.png |
| 7 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e-ajuste/revision-business-375.png |
| 8 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e-ajuste/revision-business-390.png |
| 9 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e-ajuste/revision-none-320.png |
| 10 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e-ajuste/revision-none-375.png |
| 11 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e-ajuste/revision-none-390.png |
| 12 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e/revision-business-320.png |
| 13 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e/revision-business-375.png |
| 14 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e/revision-business-390.png |
| 15 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e/revision-none-320.png |
| 16 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e/revision-none-375.png |
| 17 | 5e3c6afda07313f45b6fcee89767a8eacaacf9702de491e1639d6aab89c05a73 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/f0e/revision-none-390.png |
| 18 | d41aa4a27701410d28479f37444ddb2d4cb7612d2cabbff70f1657d953fcf5ad | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-1280.png |
| 19 | c875fded40a4cc6d9401f79716f5a91eccebc960d19ffd73e1e69740956fecd0 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-1280.png |
| 20 | 3faa043c39a4492c8d7de4d51bd9a8cccb3eac7b9be1cc36a5d499e6e537ab6e | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-1280.png |
| 21 | 37c4502b41dfc9ca55d9b7bd5731ef08c21c9aeaa0fa9ff22ccea61d47083b8f | ya publicado en el historial de origin/ai/antigravity-qa o main | secuencia numérica OCR: real/no determinado | docs/quality/evidence/m1-c2/calendario-1280.png |
| 22 | aa4427f3a8154099289821c4c5984a37efeed1bc4c74ce9a8af19a28cd2f01f2 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-320.png |
| 23 | 8099081c699bb43549f005adc18433f50d573ab3303161ac389dd745db3ec8f6 | ya publicado en el historial de origin/ai/antigravity-qa o main | secuencia numérica OCR: real/no determinado | docs/quality/evidence/m1-c2/calendario-320.png |
| 24 | d41aa4a27701410d28479f37444ddb2d4cb7612d2cabbff70f1657d953fcf5ad | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-375.png |
| 25 | c875fded40a4cc6d9401f79716f5a91eccebc960d19ffd73e1e69740956fecd0 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-375.png |
| 26 | 3faa043c39a4492c8d7de4d51bd9a8cccb3eac7b9be1cc36a5d499e6e537ab6e | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-375.png |
| 27 | 37c4502b41dfc9ca55d9b7bd5731ef08c21c9aeaa0fa9ff22ccea61d47083b8f | ya publicado en el historial de origin/ai/antigravity-qa o main | secuencia numérica OCR: real/no determinado | docs/quality/evidence/m1-c2/calendario-375.png |
| 28 | d41aa4a27701410d28479f37444ddb2d4cb7612d2cabbff70f1657d953fcf5ad | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-390.png |
| 29 | c875fded40a4cc6d9401f79716f5a91eccebc960d19ffd73e1e69740956fecd0 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-390.png |
| 30 | 3faa043c39a4492c8d7de4d51bd9a8cccb3eac7b9be1cc36a5d499e6e537ab6e | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-c2/calendario-390.png |
| 31 | 37c4502b41dfc9ca55d9b7bd5731ef08c21c9aeaa0fa9ff22ccea61d47083b8f | ya publicado en el historial de origin/ai/antigravity-qa o main | secuencia numérica OCR: real/no determinado | docs/quality/evidence/m1-c2/calendario-390.png |
| 32 | 8099081c699bb43549f005adc18433f50d573ab3303161ac389dd745db3ec8f6 | ya publicado en el historial de origin/ai/antigravity-qa o main | secuencia numérica OCR: real/no determinado | docs/quality/evidence/m1-c3/calendario-qa.jpg |
| 33 | 3d3590826d19eecaf17ca5a05d045d86f9c539ee33e1ec45cf118bf8bf52f133 | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/m1-polish/exito-375.png |
| 34 | 59add9721cc45e4fbe74844ef62f8847f8663ed32a904faa8fdd02938607ff3b | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-polish/qa-revision-375.png |
| 35 | 59add9721cc45e4fbe74844ef62f8847f8663ed32a904faa8fdd02938607ff3b | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-polish/revision-375.png |
| 36 | dc5463f176639317f30aca5e7c82e877bf71591cd9686b7c1cd0e975e1079f65 | ya publicado en el historial de origin/ai/antigravity-qa o main | falso positivo probable: fecha/números de interfaz | docs/quality/evidence/m1-ux/revision-375.png |
| 37 | bf4b2ae313d25104d20625d12a60192119dc4e14a5311c0a4880ff10d50fd9e3 | ya publicado en el historial de origin/ai/antigravity-qa o main | sintético reservado | docs/quality/evidence/m2-c2/profile-390.png |
| 38 | c9f0cb48107c69c6785947ac423a43de7fdaea02a80b08954a2f28289223830b | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/m2-c2/profile-390.png |
| 39 | bf4b2ae313d25104d20625d12a60192119dc4e14a5311c0a4880ff10d50fd9e3 | ya publicado en el historial de origin/ai/antigravity-qa o main | sintético reservado | docs/quality/evidence/m2-c2/profile-errors-390.png |
| 40 | c9f0cb48107c69c6785947ac423a43de7fdaea02a80b08954a2f28289223830b | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/m2-c2/profile-errors-390.png |
| 41 | bf4b2ae313d25104d20625d12a60192119dc4e14a5311c0a4880ff10d50fd9e3 | ya publicado en el historial de origin/ai/antigravity-qa o main | sintético reservado | docs/quality/evidence/m2-c2/review-mi-perfil-reflow-200.png |
| 42 | c9f0cb48107c69c6785947ac423a43de7fdaea02a80b08954a2f28289223830b | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/m2-c2/review-mi-perfil-reflow-200.png |
| 43 | 8a448a77c4eb0ccd810e5e0027b75fc5de07e4b03b85ae4357a15d99007ae76e | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/reserva-invitado-c2/browser/contact-1280.png |
| 44 | 8a448a77c4eb0ccd810e5e0027b75fc5de07e4b03b85ae4357a15d99007ae76e | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/reserva-invitado-c2/browser/contact-320.png |
| 45 | 8a448a77c4eb0ccd810e5e0027b75fc5de07e4b03b85ae4357a15d99007ae76e | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/reserva-invitado-c2/browser/contact-375.png |
| 46 | 8a448a77c4eb0ccd810e5e0027b75fc5de07e4b03b85ae4357a15d99007ae76e | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/reserva-invitado-c2/browser/contact-390.png |
| 47 | 8a448a77c4eb0ccd810e5e0027b75fc5de07e4b03b85ae4357a15d99007ae76e | ya publicado en el historial de origin/ai/antigravity-qa o main | candidato telefónico: real/no determinado | docs/quality/evidence/reserva-invitado-c2/browser/contact-768.png |

## 5. Archivos subibles e integridad

- da77c88-name-status.txt y baba8b5-name-status.txt: git show --format=fuller --name-status de cada commit.
- da77c88-parent-a-baba8b5-stat.txt: git diff --stat da77c88^..baba8b5.
- m3-sin-evidence.patch: parche Git completo, índices completos y soporte binario, excluyendo todos los paths docs/quality/evidence/. No se redacta ni se trunca el parche.
- 26-hashes-clasificados.json, 47-ocr-clasificados.json y comparaciones: catálogos redactados verificables. El paquete no contiene .env, claves privadas ni OCR bruto.

Sin cambios de código/documentación versionada, commit, push, QA, producción, bases ni configuración de proveedores. Solo GET de desarrollo Clerk y fetch de lectura. Se mantienen las tres aclaraciones C1 (mismo instante, dependencia/limpieza de migración28, control negativo) y el C3 con reagendado QA real y consumo del evento por worker.

El parche completo pasó git apply --reverse --check frente a baba8b5 con exit0, sin aplicarlo. El diff-stat íntegro abarca 299 archivos; el parche sin evidencia abarca 38 archivos y 271.092 bytes.


## Ampliación de revisión — 2026-10-11

Las cuatro líneas del informe se contrastaron como líneas completas del checkpoint da77c88, sin imprimir valores, contra el historial remoto tras fetch. Coinciden exactamente en ambos historiales; four-lines-remote-proof.json contiene SHA-256 de línea, commit, blob y línea remota. BACKEND_CHANGES.md 892/896 son marcadores de tipo, no credenciales reales. CHANGELOG.md 255/292 contienen el mismo correo operativo ya publicado; no se reclasifica como sintético por estar publicado. La numeración de CHANGELOG.md corresponde a C1, anterior al desplazamiento de C2.

Lectura actual de solo lectura del entorno efectivo del API: QA RATE_LIMIT_SECRET/JWT_SECRET 96/96 caracteres; producción64/64. Se selecciona RATE_LIMIT_SECRET en ambos y supera32. Sin valores, cambios de entorno, reinicios ni consultas de base. La longitud no demuestra entropía ni seguridad criptográfica. Ver runtime-secret-lengths.json.

La comparación con la cadena concreta de un goal continúa no determinada: el propietario no recuerda su título ni fecha. La comparación con los env locales sí está probada; la vigencia de Clerk sigue sin confirmación por el403 observado.

BARBER no ve Reprogramar en Reservas. BookingActions ya exigía !isBarber antes de C2 y sigue exigiéndolo. Antes podía confirmar, completar y marcar No asistió en sus propias citas; no cancelar ni reagendar. El diff C2 hace opcional el callback y exige que exista, sin ampliar el rol. La regresión F0B.test.tsx pasó11/11 exit0 en esta revisión.


## Procedencia individual de los 17 hashes publicados

Coincidencias de texto exacto en blobs alcanzables desde ambas referencias remotas después del fetch. El JSON 17-published-hashes-provenance.json incluye archivo y blob por cada rama. Publicación y uso como fixture son ejes distintos; ninguno certifica que un dato sea inocuo.

| SHA-256 | Archivo del historial remoto QA | ¿Fixture de prueba? | Uso comprobado |
|---|---|---|---|
| d88372f49a6e690d224d2c289e86b6e3ed65362e759efd878bf42014d159943b | BACKEND_CHANGES.md | No | No: marcador de tipo de un ejemplo de contrato; no contraseña real. |
| ef787d96ea63d89bda257e506a5850039be9e116c82316c162e55dc9a01dfe36 | CHANGELOG.md | No | No: correo operativo documentado; publicación no elimina su naturaleza de contacto. |
| 3376be1096079dcf8ae80fe35814f3e951b013fd8fac5795c4aa37f3ca1d82cb | apps/api/test/guest-postgres-run.cjs | Sí | Sí: conexión local de ensayo del runner guest-postgres-run.cjs; no conexión QA/producción. |
| 643b79e8deafb3a3df792b3109d1ca8a499c89f97f4c867ec9153fd874729ec4 | apps/api/test/guest-postgres-run.cjs | Sí | Sí: conexión local de ensayo del runner guest-postgres-run.cjs; no conexión QA/producción. |
| 7cf35c23c24ef1564cc7b823872da2df20922b68469e6800ccf3841b86e1184c | apps/api/src/cms/cms.dto.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| 08168cd80dfd534ab0f10af10f1303fe00af2d43ab5c1432360d137f8197e17a | apps/api/src/auth/team.service.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| e8f39b3e1382367d6d41ab34dc270d4e7533f978c9e9a775dfe2185b2f96b96c | apps/api/src/notifications/notification-policy.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| 5b71ed5f946240dc76f3b7c24bdcbbc3528284ec5f4519249fb702686f0df5b8 | apps/api/src/notifications/notification-policy.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| 6b5c8d618815b5e6ca68dd7a04b2b16552d50d2012c3e6d922ae38074127cc73 | apps/api/src/notifications/resend.adapter.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| e2b5d7d1892280e686bb1830c52cb6c0b3a21ea4a3ed8b08c34ae7f29c23b5ba | apps/api/src/notifications/resend.adapter.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| f7faa8d2b759b8e4a6f0577503650137cf17a7f2e8408fc7f7bdb3c556dfdcf0 | apps/api/src/notifications/resend.adapter.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| f57fa2badbd77ae5ffca77f28c7cd1e0844fdafa9b4a45312dc979c4fe2e140c | apps/api/src/notifications/resend.adapter.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| e67c8def62e708911573f2db1f98ecc083ef36f9dc1f2cbd3c17474f55c44ec7 | apps/api/src/notifications/resend.adapter.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| d25354f658256d3988a0a1f07ae2dbfa64c0141b3eaa5650fd268b3fdd903b7d | apps/api/src/notifications/resend.adapter.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| 1f6c1f35fba8e0f461ef40adaec3cbda883f6a5bcfa5fddef2df80af49fc0832 | apps/api/src/notifications/resend.adapter.spec.ts | Sí | Sí: dato del fixture de la suite .spec.ts indicada; su uso en prueba no demuestra propiedad del dominio. |
| 98da678a16ef95388f9921a9686cdf4cf655e6b5fac76c1ed81f55613d507228 | docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/full-api.json | Sí | Sí: URL del caso negativo cms.dto.spec.ts; el título Jest interpolado se conserva en full-api.json. |
| 7aef13f8c0831da45285af94abd2517c5281886c0cb652ceb9117d9df9ef2ba7 | docs/quality/evidence/reserva-invitado-c1/consistencia-rutas.json | No | No es un token fixture: falso positivo de una frase del título de guest-retirement.spec.ts, reproducida en evidencia; no header de autenticación. |

## Confirmación de los 47 candidatos OCR

Los47 están clasificados individualmente, con número único, hash, imagen/blob, categoría, interpretación, motivo y prueba de publicación. No hay candidatos pendientes de asignación. Los15 números cuya naturaleza no pudo determinarse conservan esa incertidumbre: clasificado no significa validado como sintético ni como contacto real. El detalle47-ocr-clasificados.json y el resumenocr-classification-summary.json se entregan sin valores OCR crudos.

## Separación de claves por hashes — lectura autorizada 2026-10-11

SHA-256 calculado dentro de cada contenedor API sobre su entorno efectivo. QA: RATE_LIMIT_SECRET y JWT_SECRET presentes, longitud96/96 y hashes distintos. Producción: presentes, longitud64/64 y hashes distintos. No se imprimieron valores ni se cambiaron variables/servicios. Evidencia: runtime-secret-hash-comparison.json. Distintos no prueba entropía, rotación o seguridad criptográfica.


## Exclusión posterior de publicación y ejemplos de contrato

Por instrucción del propietario,15 imágenes OCR de naturaleza no determinada se retiran del árbol candidato, con gate por ruta/blob para toda ref a publicar.47 candidatos clasificados no equivale a47 benignos. El historial previo se preserva. Ver [manifiesto de exclusión](M3_OCR_PUBLICACION_EXCLUSIONES.json) y [cierre gate1](M3_CALENDARIO_C3_GATE1_CIERRE.md).

BACKEND_CHANGES.md892: email/password longitud6, letras ASCII minúsculas; organizationId longitud4, letras ASCII minúsculas. Línea896: email/password longitud6, letras ASCII minúsculas. Son ejemplos de tipo, no valores operativos. [Metadatos sin valores](evidence/m3-calendario-c3-gate1/contract-example-lines.json).
