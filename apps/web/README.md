# Kortek Booking — Web

Frontend Next.js del SaaS multi-tenant Kortek Booking. Ver `maestro.md` en la raíz del repositorio para la documentación completa del proyecto.

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

Landing, autenticación, dashboard multi-tenant (Reservas, Clientes, Profesionales, Servicios, Facturación, Equipo) y flujo público de reservas por `slug` conectados a la API real. En proceso de realineación visual/comercial contra el sistema de diseño y el modelo de precio oficiales — ver `maestro.md` para el detalle por fase.
