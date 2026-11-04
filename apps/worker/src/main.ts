import { PrismaClient, LimitRequestStatus, ActivationStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const prisma = new PrismaClient();
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '10000', 10);

console.log('====================================================');
console.log('🏦 PROORGA Banking Background Worker Initialized');
console.log(`⏱️  Polling Interval: ${POLL_INTERVAL_MS}ms`);
console.log('====================================================');

let isRunning = true;

async function processExpirations() {
  const now = new Date();
  const expiredRequests = await prisma.limitRequest.findMany({
    where: {
      status: LimitRequestStatus.ACTIVE,
      activeUntil: {
        lte: now,
      },
    },
    include: {
      account: {
        include: {
          customerProfile: true,
        },
      },
    },
  });

  if (expiredRequests.length > 0) {
    console.log(`[Worker - Expiration] Found ${expiredRequests.length} active request(s) ready to expire.`);

    for (const req of expiredRequests) {
      try {
        await prisma.$transaction([
          prisma.account.update({
            where: { id: req.accountId },
            data: {
              currentTransferLimit: req.account.initialTransferLimit,
              activeLimitExpiry: null,
            },
          }),
          prisma.limitRequest.update({
            where: { id: req.id },
            data: {
              status: LimitRequestStatus.EXPIRED,
            },
          }),
          prisma.bankingActivation.updateMany({
            where: { requestId: req.id },
            data: {
              restoredAt: now,
            },
          }),
          prisma.notification.create({
            data: {
              userId: req.account.customerProfile.userId,
              type: 'LIMIT_RESTORED',
              title: `Plafond standard rétabli — ${req.reference}`,
              message: `La période temporaire du dossier ${req.reference} est expirée. Votre plafond habituel de ${Number(req.account.initialTransferLimit)} DH a été rétabli.`,
              link: `/requests?ref=${req.reference}`,
              metadata: { reference: req.reference, restoredLimit: Number(req.account.initialTransferLimit) },
            },
          }),
          prisma.auditEvent.create({
            data: {
              action: 'WORKER_LIMIT_RESTORED_EXPIRED',
              entityType: 'LimitRequest',
              entityId: req.id,
              entityVersion: req.version,
              details: {
                reference: req.reference,
                restoredLimit: Number(req.account.initialTransferLimit),
                restoredAt: now.toISOString(),
              },
            },
          }),
        ]);

        console.log(
          `✅ [Worker] Request ${req.reference} expired. Transfer limit restored to ${req.account.initialTransferLimit} DH.`
        );
      } catch (err: any) {
        console.error(`❌ [Worker] Failed to expire request ${req.reference}:`, err.message);
      }
    }
  }
}

async function loop() {
  while (isRunning) {
    try {
      await processExpirations();
    } catch (e: any) {
      console.error('[Worker Error]:', e.message);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Worker stopping gracefully (SIGINT)...');
  isRunning = false;
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Worker stopping gracefully (SIGTERM)...');
  isRunning = false;
  await prisma.$disconnect();
  process.exit(0);
});

loop();
