# Estándar de seguridad — Kortek Booking

## Principios

- Negar por defecto y conceder el mínimo privilegio.
- Obtener tenant y actor del contexto autenticado, no de campos libres del cliente.
- Tratar UI, slug e IDs públicos como datos controlables por un atacante.
- Minimizar PII, secretos y notas en respuestas, logs, caché y auditoría.
- Diseñar seguridad verificable en backend y PostgreSQL, no mediante botones ocultos.

## Identidad y sesiones

- La creación de identidad y privilegios debe ser autoritativa y atómica.
- Un cliente público no puede elegir libremente el tenant al que se concede OWNER.
- Email y recuperación deben verificar posesión con tokens de un solo uso, expiración e invalidación.
- Las cuentas privilegiadas deben tener una ruta aprobada hacia MFA.
- Las sesiones deben poder revocarse por usuario, organización y familia de sesión.
- Los tokens de larga duración no deben quedar accesibles a JavaScript del navegador. Cualquier migración de almacenamiento/sesión exige contrato y rollout aprobados.

El estado actual no cumple todavía todos estos puntos; el riesgo y Security A0 están en [`ADR-001`](../decisions/ADR-001-authentication-strategy.md).

## Multi-tenancy y autorización

- Aplicar `organizationId` en la consulta autoritativa final.
- Recurso ajeno e inexistente deben ser indistinguibles cuando revelar existencia sea sensible.
- Revalidar Membership y rol; no confiar ciegamente en claims obsoletos.
- OWNER, ADMIN, RECEPTIONIST, BARBER y CUSTOMER reciben solo permisos explícitos del contrato.
- Probar IDOR horizontal y escalamiento vertical.

## Endpoints públicos y abuso

- Definir proyección mínima y evitar IDs internos cuando el flujo no los necesita.
- Rate limiting de seguridad debe funcionar entre réplicas; memoria local no es garantía distribuida.
- Proteger login, registro, recuperación, verificación y operaciones costosas contra enumeración, fuerza bruta y automatización.
- No revelar si un correo, tenant o recurso existe salvo que el producto lo requiera y el riesgo esté aceptado.

## Datos, errores y observabilidad

- No registrar contraseñas, tokens, PII, notas internas ni cuerpos sensibles.
- AuditLog usa IDs/contexto mínimo y no sustituye monitoreo de seguridad.
- Traducir errores esperados sin stack traces, Prisma, SQL, constraints o secretos.
- Versionar solo ejemplos de variables; nunca `.env` ni credenciales.

## Cambios y pruebas

- Todo cambio de auth, roles, datos públicos o sesiones requiere threat model breve, estrategia de migración y rollback.
- Cubrir tenant, roles, revocación, enumeración, límites, concurrencia y exposición de respuesta.
- Ejecutar integración real cuando la garantía dependa de PostgreSQL o almacenamiento distribuido.
- No declarar seguridad aprobada por TypeScript/lint/tests aislados; exige auditoría del flujo y evidencia.
