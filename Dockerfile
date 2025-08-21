# --- base: Node + pnpm via corepack
FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- deps: installa dipendenze
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# --- dev: ambiente sviluppo con hot-reload
FROM base AS dev
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm","dev"]

# --- builder: build produzione
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN pnpm build

# --- runner: server produzione
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/public /app/public
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["pnpm","start","-p","3000"]
