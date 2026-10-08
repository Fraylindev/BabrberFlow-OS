# Dependency and peer audit — 2026-10-07

Gate único en `ai/reserva-invitado-ci`, base local `36061fc3c978758642b5a79ed6cb0e5ff25c003f`, árbol inicial limpio. Implementación validada localmente / en revisión; commit y push autorizados exclusivamente a la rama temporal. Producción cerrada. Sin producto, contratos, workflows, proveedores, QA desplegada, flags ni bases reales modificados.

## Diagnóstico reproducido

El propietario no aportó el log real: la tarea contenía un marcador. Se trabaja con reproducción local, sin afirmar equivalencia exacta con un run remoto. pnpm local confirmado: **11.18.0**. El registro respondió.

El paso en `.github/workflows/quality.yml` ejecuta, en ese orden:

```sh
pnpm audit --prod
pnpm install --frozen-lockfile --strict-peer-dependencies
```

Audit inicial: exit **1**, 11 avisos (2 críticos, 3 altos, 5 moderados, 1 bajo). La instalación inicial sin TTY terminó con `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`; repetida con TTY y confirmación de reinstalación, terminó con exit **0**. Esa interrupción local no es un fallo de peers.

Clasificación **(a)**: avisos detectados sobre versiones ya presentes en la base. No hay evidencia de **(b)**: peers estrictos pasan antes y después del arreglo. Se descarta **(c)** para la introducción de estas versiones: `git diff origin/ai/antigravity-qa...36061fc -- pnpm-lock.yaml pnpm-workspace.yaml package.json apps/api/package.json apps/web/package.json` está vacío. Ambos blobs del lockfile son `87425248ad9b0a212a13dfb81f5257124035a81d`. No se dispone de audit histórico que pruebe cuándo comenzaron a reportarse todos los avisos.

## Paquetes, avisos y cambio

| Paquete | Antes → después | Aviso e impacto |
|---|---|---|
| next | 16.3.3 → 16.3.8 | [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j): RCE en ImageResponse; otros seis avisos abajo |
| proxy-addr | 2.0.7 → 2.0.8 | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h): spoofing de IP con IPv4 mapeada a IPv6 |
| source-map-js | 1.2.1 → 1.2.2 | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): bloqueo del event loop al procesar offsets de mapas indexados |
| sharp | 0.35.4 → 0.35.5 | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w): vulnerabilidad de librsvg; actualización del binario/libvips transitivo |
| multer | 2.3.0 → 2.4.0 | [GHSA-3pph-fpjx-jg34](https://github.com/advisories/GHSA-3pph-fpjx-jg34): DoS por escrituras huérfanas tras uploads abortados |

Los seis avisos adicionales de Next son [GHSA-3w37-wq28-93x7](https://github.com/advisories/GHSA-3w37-wq28-93x7) (Draft Mode en caché), [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) (cache poisoning SSG/ISR), [GHSA-39w2-rjm5-chcv](https://github.com/advisories/GHSA-39w2-rjm5-chcv) (divulgación en MCP de desarrollo), [GHSA-f87g-xv8r-7p7x](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) (rutas metadata image), [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) (sustitución de contenido/DoS SSG/ISR) y [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) (SSRF en optimización de imágenes). Se corrigen en 16.3.8 según el audit recibido.

Se sincroniza `eslint-config-next` a 16.3.8. Los pins exactos de Next y sharp se cambiaron solo después de autorización directa adicional del propietario. Overrides existentes sharp/multer actualizados; overrides proxy-addr/source-map-js añadidos para dependencias ya existentes. Sin dependencias nuevas ni saltos mayores. Los cambios transitivos de Next, sharp y la retirada de concat-stream/typedarray por multer pertenecen a esos paquetes. Clerk conserva su versión; cambia únicamente su referencia de peer Next en el lockfile.

El API usa `trust proxy = loopback`, sharp para saneamiento de imágenes y FileInterceptor para uploads; el scan de `apps/web/app` no encontró ImageResponse/next/og. Eso no demuestra ausencia de toda explotación: el gate audita las versiones instaladas. No se relaja su umbral ni se añade allowlist. Workflow intacto, blob `e310ef0e4f10ca9526d19f0295124e700c6431dc`.

## Validación y límites

Después del arreglo: `pnpm audit --prod` **exit 0**, cero vulnerabilidades conocidas; `pnpm install --frozen-lockfile --strict-peer-dependencies --reporter=append-only` **exit 0**. Reporter solo cambia la presentación local.

Tipos API y web, lint API y web, Prisma generate y build API: **exit 0**. Primer intento de tipos web falló por ausencia de clave pública sintética en el arnés; repetido con fixture sintético pasó. Sin dotenv ni consulta Clerk. Web: **158/158** unitarias y **130/130** componentes, exit 0. Config temporal Vitest conserva las pruebas y deshabilita carga de dotenv con `envDir=false`.

PostgreSQL **18.1** nuevo, UUID `8e0ab2425d46494fa8b6e3713859bbcf`: 28 migraciones y gate de privilegios pasan; **877/877** unitarias API, **272 aprobadas / 0 fallidas / 1 omitida** e2e API, build web y **21 aprobadas / 0 fallidas / 1 omitida** browser; todos exit **0**. E2E omite exclusivamente Cloudinary real prohibido; browser omite exclusivamente el caso de teclado móvil en proyecto desktop. Cero flaky y cero retries. Clúster detenido y directorio propio eliminado, `cleanup=true`, ausencia comprobada.

El arnés temporal reutiliza los helpers versionados `guest-postgres-run.cjs` y `guest-suites-run.cjs` sin modificar sus bytes; crea un clúster UUID en loopback, aplica las migraciones, verifica grants, bloquea dotenv/red externa y detiene/elimina exclusivamente su clúster. Browser usa fixtures anónimos, fuentes offline, dos proyectos (desktop/375 px) y cero retries; no acredita QA autenticado, proveedor ni dispositivo físico. Build web usa `--webpack` y fuentes offline para el ensayo local; no se cambia el comando CI ni se afirma build Turbopack remoto.

Dos intentos de iniciar ese arnés fueron rechazados por revisión automática de permisos antes de crear clúster. El propietario confirmó después directamente «Sí, autorizo esas suites locales en PG18» y la ejecución se autorizó. No se eludió la revisión.

Logs locales y adaptadores de esta ejecución: `.tmp/ci-deps-checks/`, `.tmp/ci-deps-checks.cjs`, `.tmp/ci-deps-pg18.cjs`, `.tmp/ci-deps-evidence/after/`. No son evidencia de CI remoto. [Resumen de checks](evidence/ci-dependency-peer-audit/checks.json), [tipos web repetidos](evidence/ci-dependency-peer-audit/retry-web-types.json), [ciclo PG18 y comandos](evidence/ci-dependency-peer-audit/pg18.json) y [browser](evidence/ci-dependency-peer-audit/browser.json) conservan resultados sin secretos. Los adaptadores se preservan en [checks](evidence/ci-dependency-peer-audit/checks-runner.cjs.txt) y [PG18](evidence/ci-dependency-peer-audit/pg18-runner.cjs.txt), y referencian los helpers existentes; Vitest requiere el config temporal descrito arriba.

Los SHA remotos previos al commit se verificaron por `git ls-remote`: temporal `36061fc3c978758642b5a79ed6cb0e5ff25c003f`, base `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`. La entrega final debe verificar igualdad local/remoto de la rama temporal después del push. No hay merge ni cierre de producto; CI remoto posterior queda por observar.
