#!/bin/sh
set -e

echo "==> [PROORGA Docker] Applying Prisma database migrations..."
cd /app/apps/api
./node_modules/.bin/prisma migrate deploy

echo "==> [PROORGA Docker] Checking database seed status..."
NEED_SEED=$(./node_modules/.bin/ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.count().then(c => {
  console.log(c === 0 ? 'yes' : 'no');
  return prisma.\$disconnect();
}).catch(() => {
  console.log('no');
  return prisma.\$disconnect();
});
")

if [ "$NEED_SEED" = "yes" ]; then
  echo "==> [PROORGA Docker] Fresh database detected. Executing seed data script..."
  ./node_modules/.bin/ts-node prisma/seed.ts
else
  echo "==> [PROORGA Docker] Database already initialized. Skipping automatic seeding."
fi

cd /app
exec "$@"
