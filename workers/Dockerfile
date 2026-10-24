# The gtm worker image: ghcr.io/veleads/gtm-worker:<core version>, published by release.yml next to
# @veleads/gtm. Each project's stack (`npx gtm stack up`) runs the tag matching the core it pins.
# Build from the repo root: docker build -f workers/Dockerfile -t gtm-worker:dev .
FROM node:22.20-slim
LABEL org.opencontainers.image.source=https://github.com/Veleads/gtm-core
WORKDIR /app
# OpenSSL for Prisma's migration engine; pnpm only at build time (the entrypoint calls binaries directly).
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
  && corepack enable

# Dependencies first (cached while only sources change). Scripts are skipped: the Prisma client is
# generated below, once the schema is in place.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/core/package.json packages/core/
COPY packages/schemas/package.json packages/schemas/
COPY db/package.json db/
COPY workers/package.json workers/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@gtm/workers..."

COPY packages/core/src packages/core/src
COPY packages/schemas/src packages/schemas/src
COPY db db
COPY workers/src workers/src
COPY workers/docker-entrypoint.sh workers/
RUN pnpm --filter @gtm/db generate

USER node
CMD ["sh", "workers/docker-entrypoint.sh"]
