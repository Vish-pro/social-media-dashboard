import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  console.log('Instagram delete request for user:', body)
  return NextResponse.json(
    {
      url: 'https://social-media-dashboard-ten-drab.vercel.app/deletion-status',
      confirmation_code: `del_${Date.now()}`,
    },
    { status: 200 }
  )
}
