import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/linkedin/auth
 * Redirects user to LinkedIn OAuth 2.0 authorization page.
 *
 * Required env vars:
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   NEXTAUTH_URL (used as base for redirect URI)
 *
 * How to get LinkedIn credentials:
 *   1. Go to https://www.linkedin.com/developers/apps/new
 *   2. Create an app (associate with a Company Page)
 *   3. Go to Products → Add "Share on LinkedIn" (self-serve, instant)
 *   4. Under Auth → copy Client ID and Client Secret
 *   5. Add redirect URI: http://localhost:3001/api/linkedin/callback
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/linkedin/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "LINKEDIN_CLIENT_ID not set in .env" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email w_member_social",
    state: crypto.randomUUID(),
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
}
