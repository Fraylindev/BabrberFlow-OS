# Historial ejecutable segregado — retiro B2C

Archivos originales conservados byte por byte con extensión `.txt`; fuera de Jest, Vitest y de los comandos operativos actuales. No se ejecutaron ni representan capacidades del MVP vigente. Los hashes y ubicaciones originales están en [el manifiesto de archivo](../../quality/evidence/reserva-invitado-c1/correctivo-helpers-archivo.json).

- `Customer.test.tsx.txt`: copia anterior completa; los dos positivos de claim se retiraron del test actual, sin skips. Los otros 15 casos permanecen hasta C2.
- `helpers/customer-runtime-grants-drill.cjs.txt`: orquestador P1 histórico; se archiva junto con su helper dependiente para evitar un comando roto.
- `helpers/customer-runtime-compat.cjs.txt`: API histórica 791569b sobre schema aditivo.
- `helpers/customer-code-rollback.cjs.txt`: baseline histórico 61ec6677; conserva verificaciones de datos/compatibilidad.
- `helpers/m2-d4-probe.cjs.txt`: probe manual antes ignorado en .tmp; ya no queda como ejecutor raíz conservado.

Los paths relativos internos describen sus ubicaciones originales y no funcionan desde este archivo. Una recuperación futura exige autorización y reconstrucción del baseline/entorno aislado; no basta renombrar y ejecutar. Nada de este archivo autoriza QA, Clerk, bases reales ni producción. Los snapshots y auditorías anteriores quedan intactos. Los SQL/gates, tablas y migraciones no se retiran.
