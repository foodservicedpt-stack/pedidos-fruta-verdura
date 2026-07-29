# Pedidos Fruta y Verdura

Aplicación web para la gestión de pedidos de fruta y verdura en hostelería:
creación de pedidos, calendario de entregas, análisis de consumo, control de
mermas, gestión de productos y usuarios, y lectura automática de albaranes por IA (OCR con Google Gemini).

---

## 1. Requisitos previos

- **Node.js 18+**
- **Yarn** (`npm install -g yarn`)
- Una base de datos **PostgreSQL** (local o en la nube: Neon, Supabase, Railway, etc.)
- Una **clave de API de Google Gemini** (gratuita) desde https://aistudio.google.com

## 2. Instalación

```bash
# 1. Instala las dependencias
yarn install

# 2. Crea tu archivo de entorno
cp .env.example .env
#    …y rellena DATABASE_URL, NEXTAUTH_SECRET y GEMINI_API_KEY

# 3. Prepara la base de datos
yarn prisma generate
yarn prisma db push

# 4. (Opcional) Carga datos iniciales de ejemplo
yarn prisma db seed
```

## 3. Arrancar en desarrollo

```bash
yarn dev
```

La app quedará disponible en http://localhost:3000

## 4. Compilar para producción

```bash
yarn build
yarn start
```

---

## 5. Subir este proyecto a GitHub

Desde esta carpeta, ejecuta en tu ordenador:

```bash
git init
git add .
git commit -m "Primera versión Pedidos Fruta y Verdura"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

> El archivo `.env` con tus claves **no** se subirá (está en `.gitignore`).
> Configura esas variables en tu servicio de hosting (Vercel, Railway, etc.).

---

## 6. Despliegue (hosting)

Esta es una aplicación Next.js estándar. Puedes desplegarla en cualquier
plataforma que soporte Next.js (Vercel, Railway, Render, un VPS propio…).
Recuerda configurar en el panel del hosting las mismas variables del `.env`:
`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `GEMINI_API_KEY`.

## 7. Notas

- **OCR de albaranes:** usa Google Gemini 2.5 Flash. El plan gratuito ofrece
  ~500 peticiones/día, suficiente para un equipo pequeño.
- **Exportación a PDF:** la versión original usaba un servicio externo de la
  plataforma de origen. Para el despliegue independiente puede que necesites
  implementar tu propio generador de PDF (por ejemplo con Puppeteer/Playwright).
  Las exportaciones a **Excel** y **Word** funcionan sin servicios externos.
- **Usuario administrador de ejemplo:** revisa `scripts/seed.ts` para ver o
  cambiar las credenciales iniciales.