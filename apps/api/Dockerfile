FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@12.3.4

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm approve-builds --all
RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @proorga/shared-types run build
RUN pnpm --filter @proorga/shared-validation run build

WORKDIR /app/apps/api
RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4001

COPY --from=builder /app ./

EXPOSE 4001

CMD ["node", "apps/api/dist/main.js"]
