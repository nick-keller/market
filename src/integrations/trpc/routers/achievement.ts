import { z } from 'zod/v4'
import { createTRPCRouter, authedProcedure } from '../init'
import { prisma } from '#/db'

export const achievementRouter = createTRPCRouter({
  byUser: authedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const rows = await prisma.userAchievement.findMany({
        where: { userId: input.userId },
        orderBy: { achievedAt: 'desc' },
      })
      return rows.map((r) => ({
        id: r.id,
        achievementId: r.achievementId,
        tier: r.tier,
        reward: Number(r.reward),
        achievedAt: r.achievedAt,
      }))
    }),
})
