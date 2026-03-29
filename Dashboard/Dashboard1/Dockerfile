FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install build tools required for native modules (node-pty)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Compile the custom WebSocket server
RUN npx tsc --project tsconfig.server.json

# Production image, copy all the files and run next
FROM base AS runner
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs -m nextjs
# Add nextjs user to docker group so it can access /var/run/docker.sock
RUN groupadd --gid 999 docker || true
RUN usermod -aG docker nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy compiled custom server
COPY --from=builder --chown=nextjs:nodejs /app/custom-server.js ./

# Copy server-side deps not bundled by standalone (ws has no deps; node-pty is native)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/ws ./node_modules/ws
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/node-pty ./node_modules/node-pty

# Startup script: runs WS server + Next.js standalone together
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./
RUN chmod +x /app/start.sh

USER nextjs

EXPOSE 3069
EXPOSE 3070

ENV PORT 3069
ENV WS_PORT 3070
ENV HOSTNAME "0.0.0.0"

CMD ["/bin/sh", "/app/start.sh"]
