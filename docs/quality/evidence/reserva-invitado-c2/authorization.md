AUTORIZO C2 LOCAL: RETIRO DE LA UI B2C Y CIERRE DEL CONTRATO WEB

C1 queda validado localmente:
- 37/37 integraciones PostgreSQL aprobadas;
- Clerk 2/2;
- horarios 26/26;
- concurrencia 9/9;
- 0 omitidas;
- claim retirado: 404 con y sin bearer, sin User, Membership, Client ni AuditLog;
- TypeScript y lint aprobados;
- sin cambios en QA, Clerk, migraciones, datos, P4b, commit, push ni despliegue.

Ahora ejecuta únicamente C2 en local.

OBJETIVO

La cuenta del cliente final queda fuera del MVP.
La reserva de invitado es el único flujo público.
No deben quedar consumidores productivos de registro, login, claim,
perfil, historial o “Mis reservas” de clientes finales.

RETIRA DEL FRONTEND

- CustomerProvider si es exclusivo de B2C.
- CustomerAuth y CustomerClaim.
- Registro/login de cliente final.
- Perfil de cliente final.
- “Mis reservas”.
- Repetición de reserva basada en cuenta.
- Checkbox o paso para crear cuenta.
- Hooks, API clients, tipos, mocks y fixtures B2C.
- Navegación, enlaces, páginas y rutas B2C.
- Llamadas a los endpoints backend ya retirados.
- Estilos y componentes exclusivamente B2C.

CONSERVA

- Reserva pública como invitado.
- Servicio, profesional, fecha/hora, nombre, teléfono y correo.
- Confirmación, recibos, notificaciones y estados existentes.
- Panel y autenticación de OWNER, ADMIN, RECEPTIONIST y BARBER.
- Clerk para personal y operaciones internas.
- Client como ficha operativa tenant-scoped.
- Aislamiento, límites, disponibilidad y validaciones.
- P4b y toda auditoría previa.
- Datos, Prisma, migraciones, tablas, índices, triggers y compatibilidad
  histórica, salvo que una eliminación de código exclusiva sea segura.

CONTRATO DE RESPUESTA

Antes de eliminar accountCreated y accountCreationError:
1. Busca consumidores internos y externos conocidos.
2. Retira tipos, fixtures y lecturas web.
3. Actualiza el contrato del POST público a la respuesta real sin esos campos.
4. Añade prueba de que una reserva 201/PENDING no contiene esas propiedades.
5. No despliegues un frontend antiguo contra el contrato reducido.
6. No elimines esos campos si aún existe un consumidor real sin migrarlo.

VALIDACIÓN

Ejecuta:
- TypeScript API y web.
- Lint API y web.
- Tests API y web.
- Las 37 integraciones PostgreSQL ya aprobadas, sólo repítelas si C2 toca
  contratos o código que pueda afectarlas.
- Build API y web.
- Búsqueda final de consumidores B2C y accountCreated/accountCreationError.
- Pruebas HTTP de reserva invitada con y sin sesión interna.
- Confirmación de que no se crea User ni Membership CUSTOMER.
- Pruebas responsive desktop y móvil.
- Teclado, foco, campos, overflow y consola sin errores.
- Si Docker/PostgreSQL no está disponible, no simules evidencia: documenta
  exactamente qué no pudo ejecutarse.

CRITERIOS DE ACEPTACIÓN

1. El cliente puede reservar sin crear cuenta.
2. No aparece ningún paso obligatorio de cuenta.
3. No se solicita contraseña ni código para confirmar.
4. La reserva crea Client operativo y Booking PENDING, no User/Membership.
5. La respuesta pública no contiene accountCreated ni accountCreationError
   después de retirar el contrato deprecated.
6. No existen rutas o navegación B2C activas en el frontend.
7. “Mis reservas” no aparece como una función disponible.
8. OWNER, ADMIN, RECEPTIONIST y BARBER siguen funcionando.
9. Clerk interno no cambia.
10. No se rompen confirmaciones, recibos, notificaciones o panel interno.
11. No hay migraciones ni cambios de datos.
12. No quedan llamadas a endpoints 404 desde la web.
13. No se eliminan referencias históricas autorizadas.
14. No se modifican QA, producción, P4b, variables ni proveedores.

ENTREGA

No hagas commit, push, PR ni despliegue.

Entrega:
- archivos modificados/eliminados/nuevos;
- rutas y componentes retirados;
- consumidores deprecated eliminados;
- resultado de búsqueda final;
- pruebas ejecutadas y resultados reales;
- pruebas omitidas y motivo;
- diff completo;
- riesgos y rollback;
- confirmación explícita de que C3 no se ejecutó.

Detente al terminar C2 y espera autorización separada para C3.