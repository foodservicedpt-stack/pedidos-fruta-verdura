# Pedidos Fruta y Verdura

Aplicación web para la gestión de pedidos de fruta y verdura en hostelería:
creación de pedidos, calendario de entregas, análisis de consumo, control de
mermas, gestión de productos y usuarios, y lectura automática de albaranes por IA
(OCR con Google Gemini).

**Estado:** proyecto reconstruido y verificado. Tras la auditoría se restauraron
los archivos que faltaban (layout raíz, `/login`, el handler de NextAuth y el
grupo de rutas API de pedidos/productos/usuarios/histórico/OCR/exportaciones),
se eliminaron los restos de la plataforma generadora (script externo de Abacus,
telemetría ofuscada, rutas absolutas) y se verificó que el proyecto compila
(`next build`) y pasa el typecheck (`tsc`).

---

## 1. Requisitos previos

- **Node.js 18+** (probado con v24)
- **Yarn o pnpm** (en este repositorio se usa `pnpm`; si usas `yarn`, los scripts
  son equivalentes)
- Una base de datos **PostgreSQL** (local o en la nube: Neon, Supabase, Railway, …)
- Una **clave de API de Google Gemini** (gratuita) desde https://aistudio.google.com

## 2. Instalación

```bash
# 1. Instala las dependencias
pnpm install

# 2. Crea tu archivo de entorno
cp .env.example .env
#    …y rellena DATABASE_URL, NEXTAUTH_SECRET y GEMINI_API_KEY

# 3. Genera el cliente Prisma
pnpm prisma:generate

# 4. Prepara la base de datos (crea las tablas a partir del schema)
pnpm db:push

# 5. (Opcional) Carga datos iniciales de ejemplo
pnpm db:seed
```

## 3. Arrancar en desarrollo

```bash
pnpm dev
```

La app quedará disponible en http://localhost:3000

## 4. Compilar para producción

```bash
pnpm build
pnpm start
```

---

## 5. Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL |
| `NEXTAUTH_SECRET` | Sí | Secreto de NextAuth (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Sí | URL pública (en local `http://localhost:3000`) |
| `GEMINI_API_KEY` | Sí (para OCR) | Clave de Google Gemini (IA de albaranes) |
| `ABACUSAI_API_KEY` | No | Solo para la exportación a PDF vía servicio externo |

## 6. Despliegue (hosting)

Aplicación Next.js estándar. Puedes desplegarla en Vercel, Railway, Render o un
VPS propio. Configura en el panel las variables del `.env`.

## 7. Notas

- **Usuario administrador de ejemplo** (creado por `db:seed`):
  - email: `john@doe.com`
  - contraseña: `johndoe123`
  - (cámbialas en `scripts/seed.ts` antes de usarlas en producción)
- **OCR de albaranes** usa Google Gemini 2.5 Flash. El plan gratuito ofrece ~500
  peticiones/día, suficiente para un equipo pequeño.
- **Exportación a PDF:** la versión original usaba un servicio externo
  (`ABACUSAI_API_KEY`). Sin esa clave la exportación a PDF devuelve un error
  claro. Exportaciones a Excel y Word funcionan sin servicios externos.
- **Seguridad:** `next@14.2.28` tiene un aviso de seguridad publicado. Se
  recomienda actualizar a una versión parcheada de Next.js cuando se pueda
  (ver https://nextjs.org/blog/security-update-2025-12-11).
- **Node «endurecido» / con firma de equipo (Team ID):** en algunos entornos
  (apps firmadas, sandboxes) el binario nativo de SWC de Next o el motor nativo
  de Prisma pueden no cargar. Este repo ya usa el motor `binary` de Prisma y
  añade `@next/swc-wasm-nodejs` como respaldo. Si `pnpm build` o `pnpm dev`
  fallan al cargar el binario SWC en tu sistema, abre un issue y se te orienta
  para forzar el fallback WASM.
