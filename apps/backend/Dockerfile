FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npx medusa build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/.medusa/server
COPY --from=build /app/.medusa/server ./
# static: zdjęcia produktów (wolumen w compose), private-uploads: pliki niepubliczne.
RUN npm ci --omit=dev && mkdir -p static private-uploads && chown -R node:node /app
USER node
EXPOSE 9000
# Migracje uruchamiane przy starcie (idempotentne); seed tylko ręcznie.
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
