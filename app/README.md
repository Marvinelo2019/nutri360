# Nutri360

Aplicación web para la gestión clínica, nutricional y operativa de nutricionistas independientes y pequeñas clínicas en Guatemala.

## Desarrollo local

1. Copia `.env.example` como `.env.local` y agrega credenciales de un proyecto Supabase de desarrollo.
2. Instala dependencias y ejecuta el servidor:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Verificación

```bash
npm run check
npm run build
npm run format:check
```

## Estructura

- Las decisiones de producto y arquitectura están en `../docs/`.
- Las migraciones de base de datos viven en `../supabase/migrations/`.
- Las instrucciones específicas para Codex están en `../AGENTS.md` y `AGENTS.md`.
- La aplicación anterior está en `../legacy-fisioterapia/` y no forma parte de esta base.

No uses datos reales de pacientes en desarrollo.
