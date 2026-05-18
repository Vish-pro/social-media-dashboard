export async function refreshInstagramToken(accessToken: string): Promise<string | null> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
  )
  const data = await res.json()
  return data.access_token ?? null
}
