import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  // Generate OAuth 2.0 PKCE values
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // Save verifier, state, and workspaceId in secure cookies
  const cookieStore = await cookies();
  cookieStore.set("x_oauth_state", state, {
    maxAge: 300, // 5 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  cookieStore.set("x_oauth_verifier", codeVerifier, {
    maxAge: 300,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  cookieStore.set("x_oauth_workspace", workspaceId, {
    maxAge: 300,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/x/callback`;

  // Build the X OAuth 2.0 authorize URL
  const authorizeUrl = new URL("https://x.com/i/oauth2/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authorizeUrl.toString());
}
