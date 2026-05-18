import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ providers: [] })
  }

  const user = session.user as { id: string }
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: { provider: true },
  })

  return NextResponse.json({ providers: accounts.map((a) => a.provider) })
}
