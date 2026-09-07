# Pedidos Fruta y Verdura

Aplicación web para la gestión de pedidos de fruta y verdura en hostelería.
No es un simple gestor CRUD: es una herramienta operativa que **entiende** lo
que haces y te ayuda a hacerlo mejor, con Google Gemini como "copiloto".

Flujo conceptual: **planificar → pedir → recibir → interpretar albarán →
validar → registrar → analizar → aprender → recomendar → pedir mejor**.

---

## 1. Qué hace ahora

- **Acceso público**: la app se abre directamente (sin login obligatorio).
  La infraestructura de usuarios se conserva solo donde aporta valor real
  (roles de administrador para gestión de usuarios y alguna configuración).
- **OCR de albaranes** con Google Gemini, con validación de archivo,
  límite de tamaño y rate-limit.
- **Motor de temporalidad propio** (datos estructurados de España): cada
  producto indica si está en temporada, su rango de meses, origen, producción
  nacional/importación y disponibilidad. La IA nunca se inventa la temporada.
- **Capa de IA modular** (`lib/ai`): recomendaciones contextuales, insights
  del histórico, detección de anomalías pedido/recepción y resúmenes legibles,
  siempre con *fallback* (la app nunca se rompe si Gemini falla) y sin
  alucinaciones (interpreta datos reales, no los inventa).
- **Diseño con estado visual**: steppers, progreso, badges y barras que
  responden a preguntas reales ("¿en qué estado está este pedido?",
  "¿cuánto de lo pedido hemos recibido?"). El color nunca es la única señal.

## 2. Requisitos previos

- Node.js 18+ (probado con v24)
- pnpm (o yarn; scripts equivalentes)
- PostgreSQL (local o nube: Neon, Supabase, Railway…)
- Clave de API de Google Gemini (gratuita) desde https://aistudio.google.com

## 3. Instalación

```bash
pnpm install
cp .env.example .env        # rellena DATABASE_URL, NEXTAUTH_SECRET, GEMINI_API_KEY
pnpm prisma:generate
pnpm db:push                # aplica el schema (se requiere tras actualizar)
pnpm db:seed                # (opcional) datos iniciales + admin de ejemplo
# Para añadir datos DEMO (histórico + pedidos de ejemplo) y probar las
# capacidades de IA con datos reales:
SEED_DEMO=1 pnpm db:seed
```

> **Migración importante:** el campo `creadoPor` de `Pedido` pasó a ser
> opcional (la app es pública y puede crear pedidos sin sesión). Ejecuta
> `pnpm db:push` tras actualizar para reflejarlo en la base de datos.

## 4. Arrancar / compilar

```bash
pnpm dev          # http://localhost:3000
pnpm build        # prisma generate + next build
pnpm lint         # ESLint (flat config)
pnpm typecheck    # tsc --noEmit
pnpm test         # tests de temporalidad + motor de IA
```

## 5. Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | Sí | Conexión PostgreSQL |
| `DATABASE_URL_UNPOOLED` | No | Conexión directa para Prisma CLI |
| `NEXTAUTH_SECRET` | Sí | Secreto de NextAuth (para sesión admin) |
| `NEXTAUTH_URL` | Sí | URL pública (local: `http://localhost:3000`) |
| `GEMINI_API_KEY` | Sí (para IA) | Google Gemini (OCR, recomendaciones, resúmenes) |
| `GEMINI_MODEL` | No | Modelo Gemini (por defecto `gemini-2.5-flash`) |
| `ABACUSAI_API_KEY` | No | Solo exportación a PDF vía servicio externo |

## 6. Arquitectura de inteligencia

La separación clave:

- **DATOS ESTRUCTURADOS = fuente de verdad** (temporada, histórico, pedido
  vs recepción). Se resuelven con lógica determinista (`lib/seasonality`,
  `lib/ai/insights.ts`, `lib/ai/anomalies.ts`).
- **IA = interpretación + recomendación** (`lib/ai/gemini.ts` es el único
  cliente; `lib/ai/prompts.ts` construye el contexto; `lib/ai/summaries.ts`
  y `recommendations.ts` añaden narrativa sobre datos reales).

Módulos de dominio:

`lib/seasonality/` — motor de temporalidad (engine, data, types).
`lib/ai/` — gemini, prompts, recommendations, insights, anomalies,
summaries, rate-limit, types.
`lib/status.ts` — modelo de estados de pedido.

## 7. Despliegue

Aplicación Next.js estándar. Configura las variables en el panel de Vercel,
Railway, Render o VPS. OCR/recomendaciones generan consumo de Gemini: el
endpoint de OCR tiene rate-limit por IP.

## 8. Notas

- **Login**: ya no es obligatorio. La app se abre en `/`. El acceso a
  administradores para gestionar usuarios sigue en `/login`.
- Usuario administrador `db:seed`: `john@doe.com` / `johndoe123` (cámbialo).
- **Seguridad OpenAI OCR**: el endpoint valida tipo y tamaño de archivo y
  limita peticiones por IP; la API key nunca se expone.
- **ESLint** usa configuración plana (`eslint.config.mjs`); `next lint` no
  es compatible con ESLint 9 en Next 14, por eso `pnpm lint` ejecuta ESLint
  directamente.
- **Aviso**: `next@14.2.28` tiene un aviso de seguridad publicado. Se
  recomienda actualizar a una versión parcheada (ver
  https://nextjs.org/blog/security-update-2025-12-11).
