FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

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
RUN rm -rf dist tsconfig.tsbuildinfo && pnpm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4001
ENV PATH="/app/apps/api/node_modules/.bin:/app/node_modules/.bin:${PATH}"

COPY --from=builder /app ./

EXPOSE 4001

CMD ["node", "apps/api/dist/main.js"]
