# Wandr BE — API REST

Backend de SmartTrip AI. Node.js + Express + Prisma + PostgreSQL + HuggingFace.

## Requisitos

- Node.js >= 20
- PostgreSQL (Supabase o Neon recomendados)
- Cuenta gratuita en [HuggingFace](https://huggingface.co) para obtener API key

---

## Setup inicial

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:
- `DATABASE_URL` → URL de tu base de datos PostgreSQL
- `JWT_SECRET` → cadena aleatoria larga (usa `openssl rand -base64 32`)
- `HF_API_KEY` → tu token de HuggingFace (`hf_...`)
- `CORS_ORIGIN` → URL del frontend (en dev: `http://localhost:5173`)

### 3. Generar cliente Prisma y ejecutar migraciones

```bash
npm run db:generate   # genera el cliente @prisma/client
npm run db:migrate    # crea las tablas en la BD
```

### 4. (Opcional) Datos de prueba

```bash
npm run db:seed
```

Crea un usuario `demo@wandr.app` con contraseña `password123`.

### 5. Correr en desarrollo

```bash
npm run dev
```

---

## Endpoints

| Método | Ruta                   | Auth | Descripción                     |
|--------|------------------------|------|---------------------------------|
| POST   | /api/auth/register     | No   | Registro de usuario             |
| POST   | /api/auth/login        | No   | Login, retorna JWT              |
| GET    | /api/auth/profile      | JWT  | Perfil del usuario              |
| PATCH  | /api/auth/profile      | JWT  | Actualizar nombre               |
| POST   | /api/trips             | JWT  | Crear viaje + preferencias      |
| GET    | /api/trips             | JWT  | Listar mis viajes               |
| GET    | /api/trips/:id         | JWT  | Detalle de un viaje             |
| DELETE | /api/trips/:id         | JWT  | Eliminar viaje                  |
| POST   | /api/ai/generate       | JWT  | Generar itinerario con IA       |
| GET    | /api/itinerary/:tripId | JWT  | Obtener itinerario de un viaje  |
| GET    | /health                | No   | Health check                    |

---

## Despliegue en Render (gratis)

1. Crea un nuevo **Web Service** en [render.com](https://render.com)
2. Conecta tu repositorio GitHub
3. Configura:
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
4. Agrega las variables de entorno en el panel de Render
5. ⚠️ En el tier gratuito el servicio entra en reposo tras 15 min de inactividad

---

## Notas sobre HuggingFace

- El tier gratuito puede poner el modelo en espera (responde 503). El frontend debe
  reintentar o mostrar mensaje "El modelo está iniciando, intenta en 30 segundos."
- Modelos recomendados (gratuitos):
  - `mistralai/Mistral-7B-Instruct-v0.3` (más rápido)
  - `meta-llama/Llama-3.1-8B-Instruct` (mejor calidad, más lento)
- Límite sugerido: 20 generaciones/hora por IP (ya configurado en rate limiter)

---

## Estructura del proyecto

```
src/
├── index.js                  # Punto de entrada
├── app.js                    # Express + middleware
├── controllers/
│   ├── auth.controller.js
│   ├── trip.controller.js
│   ├── itinerary.controller.js
│   └── ai.controller.js
├── middleware/
│   └── auth.middleware.js    # Validación JWT
├── routes/
│   ├── auth.routes.js
│   ├── trip.routes.js
│   ├── ai.routes.js
│   └── itinerary.routes.js
├── services/
│   └── ai.service.js         # Prompt builder + HuggingFace + parser
├── validators/
│   └── schemas.js            # Esquemas Zod
└── prisma/
    ├── client.js             # Singleton PrismaClient
    └── seed.js               # Datos de prueba
prisma/
└── schema.prisma             # Modelo de datos
```
