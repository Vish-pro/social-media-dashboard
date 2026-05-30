import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/linkedin/callback
 * LinkedIn redirects here after user grants permission.
 * Exchanges the authorization code for an access token, fetches the user's
 * profile, and stores both in localStorage (via redirect to a client page).
 *
 * In a production app, you'd save the token server-side (e.g., in your DB).
 * For local testing, we pass it to the settings page via URL params.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?linkedin_error=${error ?? "no_code"}`
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/linkedin/callback`;

  // Exchange code for token
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?linkedin_error=token_exchange_failed`
    );
  }

  const { access_token } = await tokenRes.json();

  // Get user's LinkedIn profile (name, sub/id)
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  // Pass token to client via redirect (for demo/local use)
  const params = new URLSearchParams({
    linkedin_token: access_token,
    linkedin_name: profile.name ?? "LinkedIn User",
    linkedin_sub: profile.sub ?? "",
  });

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/settings?${params.toString()}`
  );
}
