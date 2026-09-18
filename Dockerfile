# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: build — compila la app Angular con pnpm (version fijada en package.json)
# =============================================================================
ARG NODE_VERSION=24
ARG PNPM_VERSION=11.15.1
ARG NGINX_VERSION=1.27

FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION

ENV CI=true \
    NG_CLI_ANALYTICS=false \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

# Primero solo los manifests para aprovechar la cache de capas al instalar deps.
# pnpm-workspace.yaml incluye `allowBuilds` (esbuild, lmdb, etc.), necesario en pnpm >= 10.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Ahora el resto del codigo fuente (filtrado por .dockerignore)
COPY . .

# `pnpm build` -> `ng build` con la configuracion "production" por defecto.
# Salida: dist/ai-glossary-fe/browser
RUN pnpm build

# =============================================================================
# Stage 2: runtime — Nginx sirve la SPA y hace de reverse proxy hacia Ollama
# =============================================================================
FROM nginx:${NGINX_VERSION}-alpine AS runtime

# URL del servidor Ollama al que se reenvian las llamadas a /api/*.
# Se puede sobreescribir en tiempo de ejecucion (docker run -e / docker-compose).
ENV OLLAMA_URL=http://host.docker.internal:11434 \
    PORT=4200

# Limpiamos la config por defecto y dejamos nuestra plantilla. La imagen oficial de
# nginx procesa /etc/nginx/templates/*.template con envsubst al arrancar y escribe el
# resultado en /etc/nginx/conf.d/, por lo que OLLAMA_URL y PORT quedan inyectados.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Artefactos compilados de Angular
COPY --from=build /app/dist/ai-glossary-fe/browser /usr/share/nginx/html

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/" > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
