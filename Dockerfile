# syntax=docker/dockerfile:1

# glibc-Basis statt Alpine: libsql liefert native Binaries für linux-x64-gnu
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install -g corepack@latest && corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# postinstall (nuxt prepare) braucht die Quellen noch nicht → Skripte hier überspringen
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/data/daybreak.db \
    TZ=Europe/Berlin
WORKDIR /app

COPY --from=build --chown=node:node /app/.output ./.output
# Migrationen werden beim Serverstart angewendet (server/plugins/migrate.ts)
COPY --from=build --chown=node:node /app/drizzle ./drizzle

RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
