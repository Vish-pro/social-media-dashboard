import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const scopeType = url.searchParams.get("scope") || "facebook"; // 'facebook', 'instagram', or 'threads'

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    maxAge: 600, // 10 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  cookieStore.set("meta_oauth_workspace", workspaceId, {
    maxAge: 600,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  cookieStore.set("meta_oauth_scope_type", scopeType, {
    maxAge: 600,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (scopeType === "threads") {
    // Threads OAuth
    const threadsAppId = process.env.THREADS_APP_ID || "PLACEHOLDER_THREADS_APP_ID";
    const redirectUri = `${nextAuthUrl}/api/meta/callback`;

    const authorizeUrl = new URL("https://threads.net/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", threadsAppId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "threads_basic,threads_content_publish");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("response_type", "code");

    return NextResponse.redirect(authorizeUrl.toString());
  } else {
    // Meta / Facebook Login
    const metaAppId = process.env.META_APP_ID || "PLACEHOLDER_META_APP_ID";
    const redirectUri = `${nextAuthUrl}/api/meta/callback`;

    const authorizeUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
    authorizeUrl.searchParams.set("client_id", metaAppId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("response_type", "code");

    if (scopeType === "instagram") {
      authorizeUrl.searchParams.set("scope", "pages_show_list,instagram_basic,instagram_content_publish");
    } else {
      authorizeUrl.searchParams.set("scope", "pages_show_list,pages_manage_posts,pages_read_engagement");
    }

    return NextResponse.redirect(authorizeUrl.toString());
  }
}
