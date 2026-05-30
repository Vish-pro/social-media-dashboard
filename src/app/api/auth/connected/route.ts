import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ providers: [] })
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ providers: [] })
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId: workspaceId },
    select: { platform: true },
  })

  return NextResponse.json({ providers: accounts.map((a) => a.platform) })
}
