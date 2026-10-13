# Frontend image: build the React app with Node.js, serve the static files with Nginx.

# ---- Stage 1: build -----------------------------------------------------------
FROM node:26-alpine AS build
WORKDIR /app

# Install exact dependency versions from package-lock.json (cached layer).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Stage 2: runtime ---------------------------------------------------------
# nginx-unprivileged runs as a non-root user (uid 101) and listens on port 8080.
FROM nginxinc/nginx-unprivileged:1.31-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

# The Git commit SHA is passed by CI and served at /version.txt (used to verify deployments).
ARG APP_VERSION=local

# config.js is rewritten at start-up by the non-root nginx user.
USER root
RUN echo "$APP_VERSION" > /usr/share/nginx/html/version.txt \
    && chown 101:101 /usr/share/nginx/html/config.js \
    && chmod 0755 /docker-entrypoint.d/40-runtime-config.sh
USER 101

# Default for local runs; Azure overrides it with an App Service application setting.
ENV API_BASE_URL=http://localhost:8000

EXPOSE 8080
