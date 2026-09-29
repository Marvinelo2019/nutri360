# Nutri360 workspace

Repositorio del nuevo sistema de gestión clínica y nutricional para nutricionistas.

## Directorios principales

- `app/`: aplicación Next.js nueva.
- `supabase/`: migraciones y configuración versionada de base de datos.
- `docs/`: alcance, arquitectura, seguridad, modelo de datos y roadmap.
- `.codex/`: configuración de Codex específica del proyecto.
- `legacy-fisioterapia/`: copia histórica ignorada por Git; solo sirve como referencia.

## Inicio rápido

```bash
cd app
cp .env.example .env.local
npm run dev
```

Los comandos de verificación pueden ejecutarse desde la raíz:

```bash
npm run check
npm run build
```

Antes de implementar una fase completa, consulta `AGENTS.md`, `PLANS.md` y los documentos dentro de `docs/`.
