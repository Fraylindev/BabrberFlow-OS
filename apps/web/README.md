# BarberFlow OS — Web

Frontend Next.js del SaaS multi-tenant BarberFlow OS. Ver `MAESTRO.md` en la raíz del repositorio para la documentación completa del proyecto.

## Requisitos

- Node.js 20+
- pnpm
- La API (`apps/api`) corriendo y accesible

## Ejecutar en desarrollo

```bash
pnpm dev
```

Escucha en el puerto 3000 por defecto — si la API también usa 3000 en tu `.env`, cámbiala a otro puerto (ver `apps/api/.env.example`).

## Estado actual

En reconstrucción activa. La versión anterior era en gran parte un scaffold estático sin integración real con la API.
