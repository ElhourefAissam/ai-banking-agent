FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@12.3.4

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN mkdir -p /app/apps/web/public
RUN pnpm approve-builds --all
RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @proorga/shared-types run build
RUN pnpm --filter @proorga/shared-validation run build

WORKDIR /app/apps/web
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV WEB_PORT=3002

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

WORKDIR /app/apps/web

EXPOSE 3002

CMD ["npx", "next", "start", "-p", "3002"]
