import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"
const redisUrl = process.env.REDIS_URL

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Brak wymaganej zmiennej środowiskowej: ${name}`)
  }
  return value
}

// W produkcji sekrety muszą pochodzić ze środowiska; w dev/test dopuszczamy wartości lokalne.
const jwtSecret = isProduction ? required("JWT_SECRET") : process.env.JWT_SECRET || "dev-only-jwt-secret"
const cookieSecret = isProduction ? required("COOKIE_SECRET") : process.env.COOKIE_SECRET || "dev-only-cookie-secret"
if (isProduction) {
  // Klucze szyfrujące sekrety MFA i dane dostępowe integracji.
  required("AUTH_MFA_ENCRYPTION_KEY")
  required("PATRIX_ENCRYPTION_KEY")
}

const redisModules = redisUrl
  ? [
      { key: Modules.EVENT_BUS, resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
      {
        key: Modules.WORKFLOW_ENGINE,
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: { redis: { redisUrl } },
      },
      {
        key: Modules.LOCKING,
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            { resolve: "@medusajs/medusa/locking-redis", id: "locking-redis", is_default: true, options: { redisUrl } },
          ],
        },
      },
    ]
  : []

const fileModule = process.env.S3_BUCKET
  ? {
      key: Modules.FILE,
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              additional_client_config: { forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" },
            },
          },
        ],
      },
    }
  : null

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000,http://localhost:8000",
      jwtSecret,
      cookieSecret,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
    },
    sessionOptions: {
      name: "patrix.sid",
      // Sesja panelu wygasa po 8 h bezczynności (rolling).
      rolling: true,
      ttl: 8 * 60 * 60 * 1000,
    },
    cookieOptions: {
      sameSite: "lax",
      secure: isProduction,
      httpOnly: true,
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  modules: [
    ...redisModules,
    ...(fileModule ? [fileModule] : []),
    { resolve: "./src/modules/patrix-security" },
    { resolve: "./src/modules/patrix-catalog" },
  ],
})
