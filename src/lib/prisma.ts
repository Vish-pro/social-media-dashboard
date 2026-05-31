import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma

  if (!(global as any)._schedulerInterval) {
    (global as any)._schedulerInterval = setInterval(() => {
      const port = process.env.PORT || "3000";
      fetch(`http://localhost:${port}/api/scheduler/publish`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.processedCount > 0) {
            console.log(`[Scheduler] Automatically published ${data.processedCount} post(s) from development queue.`);
          }
        })
        .catch(() => {});
    }, 30000); // Check every 30 seconds
  }
}
